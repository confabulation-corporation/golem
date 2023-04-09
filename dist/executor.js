"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTarget = void 0;
const child_process_1 = require("child_process");
const types_1 = require("./types");
const chat_gpt_1 = require("./chat_gpt");
const promises_1 = require("fs/promises");
const logger_1 = __importDefault(require("./logger"));
const utils_1 = require("./utils");
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
async function executeTarget(target, golemFile, context = new Map()) {
    const golemTarget = golemFile[target];
    if (!golemTarget) {
        throw new Error(`Target "${target}" not found in Golem file.`);
    }
    logger_1.default.debug(`Executing target: ${target}`); // Log the current target being executed
    if (golemTarget.dependencies) {
        logger_1.default.debug(`Dependencies for ${target}: ${golemTarget.dependencies}`); // Log the dependencies for the current target
        for (const dependency of golemTarget.dependencies) {
            if (dependency) {
                if (golemFile[dependency]) {
                    // Execute the dependency and update the context with its result
                    await executeTarget(dependency, golemFile, context);
                }
                else {
                    try {
                        // Try to read the file content
                        const fileContent = await (0, promises_1.readFile)(dependency, 'utf-8');
                        // Store the file content in the context
                        context.set(dependency, fileContent);
                    }
                    catch (error) { /* FIXME: This is not the correct way to handle exception types */
                        if (error.code === 'ENOENT') {
                            logger_1.default.error(`Error executing target "${target}": dependency "${dependency}" not found.`);
                        }
                        else {
                            logger_1.default.error(`Error executing target "${target}": ${error.message}`);
                        }
                    }
                }
            }
        }
    }
    // Call the executeAIChatWithCache function for the current target
    await executeAIChatWithCache(target, golemFile, context);
    logger_1.default.debug(`Context after ${target} execution:`, context); // Log the context after the current target's execution
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
async function executeAIChat(target, golemFile, context) {
    var _a, _b, _c;
    logger_1.default.debug("================================");
    logger_1.default.debug(target);
    logger_1.default.debug(golemFile);
    logger_1.default.debug(context);
    const golemTarget = golemFile[target];
    if (!golemTarget) {
        throw new Error(`Target "${target}" not found in Golem file.`);
    }
    if (!(0, types_1.isGolemTarget)(golemTarget)) {
        return;
    }
    if (!(golemTarget === null || golemTarget === void 0 ? void 0 : golemTarget.prompt) && !(golemTarget === null || golemTarget === void 0 ? void 0 : golemTarget.model)) {
        /* Default to cat */
        golemTarget.model = 'cat';
    }
    let prompt = (_a = golemTarget === null || golemTarget === void 0 ? void 0 : golemTarget.prompt) !== null && _a !== void 0 ? _a : "{no prompt}";
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
    logger_1.default.debug((_b = golemTarget === null || golemTarget === void 0 ? void 0 : golemTarget.prompt) !== null && _b !== void 0 ? _b : "{no prompt}");
    logger_1.default.debug("================================");
    logger_1.default.debug(`Prompt for ${target}: ${prompt}`); // Log the prompt for the current target
    const model = (_c = golemTarget === null || golemTarget === void 0 ? void 0 : golemTarget.model) !== null && _c !== void 0 ? _c : 'gpt-3.5-turbo'; // Use the specified model or default to gpt-3.5-turbo
    if (model === 'cat') {
        const concatenatedOutput = golemTarget.dependencies.map(dep => context.get(dep)).join('');
        context.set(target, concatenatedOutput);
    }
    /* '"gpt-3.5-turbo" | "gpt-3.5-turbo-0301" | "gpt-4-0314" | "gpt-4-32k" */
    else if (model == "gpt-3.5-turbo" || model == "gpt-3.5-turbo-0301" || model == "gpt-4-0314" || model == "gpt-4-32k") {
        // Call the executeAIChat function for the current target
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
            logger_1.default.debug(`AI Response for ${target}: ${response}`); // Log the AI response for the current target
            console.log(response);
            if (!response) {
                logger_1.default.debug(`No AI response for ${target}. Storing default value.`); // Log when there is no AI response for the current target
                context.set(target, `Default value for ${target}`); // Store the default value in the context
            }
            else {
                context.set(target, response); // Store the AI response in the context
            }
            logger_1.default.debug(`Context after ${target} AI chat:`, context); // Log the context after the AI chat for the current target
        }
        catch (error) {
            logger_1.default.error(`Error generating AI response: ${error.message}`);
        }
    }
    else {
        throw new Error(`No such supported model ${model}`);
    }
}
