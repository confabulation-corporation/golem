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
  
  const golemFileToArray: any = [];
  for (const key in golemFile){
    const val = golemFile[key as keyof typeof golemFile];
    golemFileToArray.push(val);
  }
  
  const golemTarget = golemFile[target];
 
  if (!golemTarget || !isGolemTarget(golemTarget)) {
    return;
  }

  const cacheKey = generateCacheKey(target, golemTarget.dependencies || [], [...golemFileToArray] || '');

  if (isCacheValid(target, cacheKey)) {
    console.log("Returning Cached output");
    const cachedOutput = loadOutputFromCache(target, cacheKey);
    context.set(target, cachedOutput);
  } else {
    await executeAIChat(target, golemFile, context);
    saveOutputToCache(target, cacheKey, context);
  }
}

async function executeAIChat(target: string, golemFile: GolemFile, context: Map<string, any>): Promise<void> {

  // TODO: change variable name to better reflect its functionality
  const newContext: string[] = [];

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

      // This gets the 'keys' (subtasks) of a target (task). For example,
      // imp_task:
      //   dependencies: []
      //   prompt: "Pick 2 numbers from 3, 5 and 5."
      // Here, imp_task is a target (task) and prompt is a key (subtask)
      const golemTargetKeys: string[] = Object.keys(golemTarget);

      if (golemTargetKeys.length === 2){
        const response = await ChatGPT_completion(messages, model, 0.7, 0.9);

        if (!response) {
          context.set(target, `Default value for ${target}`);
        } else {
          context.set(target, response);
        }
      }

      else if (golemTargetKeys.length > 2){
        try {
    
          // It starts from 1 as index 0 is dependencies. This can be changed if needed
          for (let i = 1; i < golemTargetKeys.length; i++){
  
            const val: any = golemTarget[golemTargetKeys[i] as keyof typeof golemTarget];
            
            // This gets the previous context. Array newContext is saving the context as we loop through the targets
            const previousContext: string | undefined = newContext[0] || '';
            
            // Concat the previousContext (if undefined) to the current subtask (here, named val)
            const content = previousContext + val;

            // This block of code replaces the {{}} placeholders in the string from the yaml file 
            // with the output of the subtask or task it requires
            // For example, 
            // best_year_for_genre:
            //   dependencies: [ 'find_genre' ]
            //   prompt: >
            //     Find the best year for the musical genre "{{find_genre}}". Please provide a 4-digit number representing the year.
            // Here, find_genre is replaced with the output of find_genre
            const replacedString = content.replace(/{{(.*?)}}/g, (match, p1) => {
              // Remove the curly braces from the placeholder
              const placeholder = p1.trim();
              // Replace the placeholder with the corresponding value from the map
              return context.get(placeholder) || placeholder;
            });

            const taskGenerationMessages: ChatGPTMessage[] = [
              {
                role: 'system',
                content: `You are a helpful assistant!`,
              },
              {
                role: 'user',
                content: replacedString,
              },
            ];
  
            const taskGenerationResponse = await ChatGPT_completion(taskGenerationMessages, model, 0.7, 0.9);
            console.log(`AI response for ${val}:`, taskGenerationResponse);

            newContext.length = 0; //clear the previous context
            newContext.push(taskGenerationResponse); //append the new context to be used in the next iteration

            context.set(target, taskGenerationResponse);
          }
  
        } catch (error: any) {
          logger.error(`Error generating AI response: ${error.message}`);
        }  
      }

  }else {
    throw new Error(`No such supported model ${model}`);
  }
}