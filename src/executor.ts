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
    await executeAIChat(target, golemFile, context); // Update this line to call the executeAIChat function
    const response = context.get(target);
    saveOutputToCache(target, cacheKey, response);
  }
}

export async function executeTarget(target: string, golemFile: GolemFile, context: Map<string, any> = new Map()): Promise<void> {
  const golemTarget = golemFile[target];

  if (!golemTarget) {
    throw new Error(`Target "${target}" not found in Golem file.`);
  }

  console.log(`Executing target: ${target}`); // Log the current target being executed

  if (golemTarget.dependencies) {
    console.log(`Dependencies for ${target}: ${golemTarget.dependencies}`); // Log the dependencies for the current target
    for (const dependency of golemTarget.dependencies) {
      if (dependency) {
        // Execute the dependency and update the context with its result
        await executeTarget(dependency, golemFile, context);
      }
    }
  }

  // Call the executeAIChatWithCache function for the current target
  await executeAIChatWithCache(target, golemFile, context);

  console.log(`Context after ${target} execution:`, context); // Log the context after the current target's execution
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

async function executeAIChat(target: string, golemFile: GolemFile, context: Map<string, any>): Promise<void> {
  logger.debug("================================");
  logger.debug(target);
  logger.debug(golemFile);
  logger.debug(context);

  const golemTarget = golemFile[target];
  if (!golemTarget) {
    throw new Error(`Target "${target}" not found in Golem file.`);
  }

  if (!isGolemTarget(golemTarget)) {
    return;
  }

  if ( !golemTarget?.prompt && !golemTarget?.model )
  {
    /* Default to cat */
    golemTarget.model = 'cat';
  }
  
  let prompt = golemTarget?.prompt ?? "{no prompt}";
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
  logger.debug(golemTarget?.prompt ?? "{no prompt}");
  logger.debug("================================");
  logger.debug(`Prompt for ${target}: ${prompt}`); // Log the prompt for the current target

  const model = golemTarget?.model ?? 'gpt-3.5-turbo'; // Use the specified model or default to gpt-3.5-turbo

  if (model === 'cat') {
    const concatenatedOutput = golemTarget.dependencies.map(dep => context.get(dep)).join('');
    context.set(target, concatenatedOutput);
  }  
  /* '"gpt-3.5-turbo" | "gpt-3.5-turbo-0301" | "gpt-4-0314" | "gpt-4-32k" */
  else if ( model == "gpt-3.5-turbo" || model == "gpt-3.5-turbo-0301" || model == "gpt-4-0314" || model == "gpt-4-32k" ) {
    // Call the executeAIChat function for the current target
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
      logger.debug(`AI Response for ${target}: ${response}`); // Log the AI response for the current target
      console.log(response);

      if (!response) {
        logger.debug(`No AI response for ${target}. Storing default value.`); // Log when there is no AI response for the current target
        context.set(target, `Default value for ${target}`); // Store the default value in the context
      } else {
        context.set(target, response); // Store the AI response in the context
      }

      logger.debug(`Context after ${target} AI chat:`, context); // Log the context after the AI chat for the current target
    } catch (error: any) {
      logger.error(`Error generating AI response: ${error.message}`);
    }
  }
  else
  {
    throw new Error(`No such supported model ${model}` );
  }
}
