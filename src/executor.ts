import { exec } from 'child_process';
import { GolemFile, GolemTarget, isGolemTarget } from './types';
import { ChatGPTMessage, ChatGPT_completion } from './chat_gpt';
import { readFile } from 'fs/promises';
import { dirname } from 'path';
import logger from './logger';
import {
  generateCacheKey,
  isCacheValid,
  saveOutputToCache,
  loadOutputFromCache,
} from './utils';

interface ExecutionContext {
  [key: string]: any;
}

export async function executeTarget(target: string, golemFile: GolemFile, context: Map<string, any> = new Map()): Promise<void> {
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

function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error executing command: ${command}`);
        logger.error(stderr);
        reject(error);
      } else {
        logger.debug(stdout);
        resolve();
      }
    });
  });
}

async function executeAIChatWithCache(target: string, golemFile: GolemFile, context: Map<string, any>): Promise<void> {
  const golemTarget = golemFile[target];
  if (!golemTarget || !isGolemTarget(golemTarget)) {
    return;
  }

  const cacheKey = generateCacheKey(target, golemTarget.dependencies || [], golemTarget.prompt || '');

  if (isCacheValid(target, cacheKey)) {
    const cachedOutput = loadOutputFromCache(target, cacheKey);
    context.set(target, cachedOutput);
  } else {
    await executeAIChat(target, golemFile, context);
    const response = context.get(target);
    saveOutputToCache(target, cacheKey, response);
  }
}

async function executeAIChat(target: string, golemFile: GolemFile, context: Map<string, any>): Promise<void> {
  console.log('Executing AI chat for target:', target);

  const golemTarget = golemFile[target];
  if (!golemTarget) {
    throw new Error(`Target "${target}" not found in Golem file.`);
  }

  if (!isGolemTarget(golemTarget)) {
    return;
  }

  if (!golemTarget.prompt && !golemTarget.model) {
    golemTarget.model = 'cat';
  }

  let prompt = golemTarget.prompt ?? "{no prompt}";
  if (isGolemTarget(golemTarget) && golemTarget.prompt) {
    prompt = golemTarget.prompt;
    const placeholderRegex = /{{\s*([\w\/.-]+)\s*}}/g;
    let match;

    while ((match = placeholderRegex.exec(prompt)) !== null) {
      const key = match[1];

      if (context.has(key)) {
        prompt = prompt.replace(match[0], context.get(key));
      } else {
        prompt = prompt.replace(match[0], "");
      }
    }
  }

  const model = golemTarget.model ?? 'gpt-3.5-turbo';

  if (model === 'cat') {
    const concatenatedOutput = golemTarget.dependencies.map(dep => context.get(dep)).join('');
    context.set(target, concatenatedOutput);
  } else if (model == "gpt-3.5-turbo" || model == "gpt-3.5-turbo-0301" || model == "gpt-4-0314" || model == "gpt-4-32k") {
    const messages: ChatGPTMessage[] = [
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
      const response = await ChatGPT_completion(messages, model, 0.7, 0.9);
      console.log('AI response for target:', target, 'Response:', response);

      if (!response) {
        context.set(target, `Default value for ${target}`);
      } else {
        context.set(target, response);
      }

      // Handling task_generation_prompt
      if (golemTarget.task_generation_prompt) {
        console.log('Task generation prompt:', golemTarget.task_generation_prompt);
        // Generate a new AI chat prompt using the task_generation_prompt and the current context
        const taskGenerationMessages: ChatGPTMessage[] = [
          {
            role: 'system',
            content: `You are a helpful assistant!`,
          },
          {
            role: 'user',
            content: golemTarget.task_generation_prompt,
          },
        ];

        const taskGenerationResponse = await ChatGPT_completion(taskGenerationMessages, model, 0.7, 0.9);
        console.log('AI response for task_generation_prompt:', taskGenerationResponse);

        // Process the AI's response to extract new target information and add the new targets to the golemFile object
        // Implement the logic to process the taskGenerationResponse and create new targets
        // After processing and generating new targets, log them using the following line:
        // console.log('New targets:', newTargets);
      }

    } catch (error: any) {
      logger.error(`Error generating AI response: ${error.message}`);
    }
  } else {
    throw new Error(`No such supported model ${model}`);
  }
}