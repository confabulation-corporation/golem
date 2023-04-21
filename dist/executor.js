"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTarget = void 0;
const child_process_1 = require("child_process");
const types_1 = require("./types");
const chat_gpt_1 = require("./chat_gpt");
const logger_1 = __importDefault(require("./logger"));
const utils_1 = require("./utils");
async function executeTarget(target, golemFile, context = new Map()) {
    const golemTarget = golemFile[target];
    if (!golemTarget) {
        throw new Error(`Target "${target}" not found in Golem file.`);
    }
    console.log(`Executing target: ${target}`);
    if (golemTarget.dependencies) {
        console.log(`Dependencies for ${target}: ${golemTarget.dependencies}`);
        for (const dependency of golemTarget.dependencies) {
            if (dependency) {
                await executeTarget(dependency, golemFile, context);
            }
        }
    }
    await executeAIChatWithCache(target, golemFile, context);
    console.log(`Context after ${target} execution:`, context);
}
exports.executeTarget = executeTarget;
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                logger_1.default.error(`Error executing command: ${command}`);
                logger_1.default.error(stderr);
                reject(error);
            }
            else {
                logger_1.default.debug(stdout);
                resolve();
            }
        });
    });
}
async function executeAIChatWithCache(target, golemFile, context) {
    const golemTarget = golemFile[target];
    if (!golemTarget || !(0, types_1.isGolemTarget)(golemTarget)) {
        return;
    }
    const cacheKey = (0, utils_1.generateCacheKey)(target, golemTarget.dependencies || [], golemTarget.prompt || '');
    if ((0, utils_1.isCacheValid)(target, cacheKey)) {
        const cachedOutput = (0, utils_1.loadOutputFromCache)(target, cacheKey);
        context.set(target, cachedOutput);
    }
    else {
        await executeAIChat(target, golemFile, context);
        const response = context.get(target);
        (0, utils_1.saveOutputToCache)(target, cacheKey, response);
    }
}
async function executeAIChat(target, golemFile, context) {
    var _a, _b;
    console.log('Executing AI chat for target:', target);
    const golemTarget = golemFile[target];
    if (!golemTarget) {
        throw new Error(`Target "${target}" not found in Golem file.`);
    }
    if (!(0, types_1.isGolemTarget)(golemTarget)) {
        return;
    }
    if (!golemTarget.prompt && !golemTarget.model) {
        golemTarget.model = 'cat';
    }
    let prompt = (_a = golemTarget.prompt) !== null && _a !== void 0 ? _a : "{no prompt}";
    console.log(prompt);
    if ((0, types_1.isGolemTarget)(golemTarget) && golemTarget.prompt) {
        prompt = golemTarget.prompt;
        const placeholderRegex = /{{\s*([\w\/.-]+)\s*}}/g;
        let match;
        while ((match = placeholderRegex.exec(prompt)) !== null) {
            const key = match[1];
            if (context.has(key)) {
                prompt = prompt.replace(match[0], context.get(key));
            }
            else {
                prompt = prompt.replace(match[0], "");
            }
        }
    }
    const model = (_b = golemTarget.model) !== null && _b !== void 0 ? _b : 'gpt-3.5-turbo';
    console.log(model);
    if (model === 'cat') {
        const concatenatedOutput = golemTarget.dependencies.map(dep => context.get(dep)).join('');
        context.set(target, concatenatedOutput);
    }
    else if (model == "gpt-3.5-turbo" || model == "gpt-3.5-turbo-0301" || model == "gpt-4-0314" || model == "gpt-4-32k") {
        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant!`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ];
        try {
            const response = await (0, chat_gpt_1.ChatGPT_completion)(messages, model, 0.7, 0.9);
            console.log('AI response for target:', target, 'Response:', response);
            if (!response) {
                context.set(target, `Default value for ${target}`);
            }
            else {
                context.set(target, response);
            }
            // Handling task_generation_prompt
            if (golemTarget.task_generation_prompt) {
                console.log('Task generation prompt:', golemTarget.task_generation_prompt);
                // Generate a new AI chat prompt using the task_generation_prompt and the current context
                const taskGenerationMessages = [
                    {
                        role: 'system',
                        content: `You are a helpful assistant!`,
                    },
                    {
                        role: 'user',
                        content: golemTarget.task_generation_prompt,
                    },
                ];
                const taskGenerationResponse = await (0, chat_gpt_1.ChatGPT_completion)(taskGenerationMessages, model, 0.7, 0.9);
                console.log('AI response for task_generation_prompt:', taskGenerationResponse);
                // Process the AI's response to extract new target information and add the new targets to the golemFile object
                // Implement the logic to process the taskGenerationResponse and create new targets
                // After processing and generating new targets, log them using the following line:
                // console.log('New targets:', newTargets);
            }
        }
        catch (error) {
            logger_1.default.error(`Error generating AI response: ${error.message}`);
        }
    }
    else {
        throw new Error(`No such supported model ${model}`);
    }
}
