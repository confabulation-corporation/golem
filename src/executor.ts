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
  appendToGolemFile
} from './utils';

import { writeFileSync} from 'fs';

// TODO 1: Check if prompt asks for additional targets.
// TODO 2: Check if targets have other dependencies.
// TODO 3: Saving properly (for example, it saves all of the previous context for imp task)
// TODO 4: Use different files

interface ExecutionContext {
  [key: string]: any;
}

const mainPrompt: ChatGPTMessage = {
  role: 'system',
  content: `You are an Agentic LLM assistant, designed only to produce code and helpful information. You may be asked to generate new targets. If the prompt given to you contains the phrase 'generate new targets', your response will be to generate a list of targets to help answer the prompt. The targets must be written as unnumbered items separated by lines starting with 'Target:'. 
  The items in the list will not be arranged in any particular order. For example:
  Prompt: As an agentic LLM, generate new targets for the next iteration.
  Response:
  Target: Write a function to divide two numbers.
  Target: Create a class called Employee.
  Target: Write unit tests for the function GetPeopleInterests.
  
  It is not always the case that you will be asked to generate new targets. If the prompt does not contain the phrase 'generate new targets', then proceed to answer the prompt as truthfully as possible. For example:
  Prompt: What is capital of France?
  Response: Paris.
  Prompt: How many days are in the month of April?
  Response: 30 days.
  
  You are opinionated. If asked to provide a subjective answer, start by saying 'In my opinion' then answer the prompt. For example:
  Prompt: What is the best sport?
  Response: In my opinion, soccer.
  `
}

export async function executeTarget(target: string, golemFile: GolemFile, golemFilePath: string, context: Map<string, any> = new Map()): Promise<void> {
    
  const golemTarget = golemFile[target];

  if (!golemTarget) {
    throw new Error(`Target "${target}" not found in Golem file.`);
  }

  console.log(`Executing target: ${target}`);

  if (golemTarget.dependencies) {
    console.log(`Dependencies for ${target}: ${golemTarget.dependencies}`);
    for (const dependency of golemTarget.dependencies) {
      if (dependency) {
        await executeTarget(dependency, golemFile, golemFilePath, context);
      }
    }
  }

  await executeAIChatWithCache(target, golemFile, golemFilePath, context);

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

async function executeAIChatWithCache(target: string, golemFile: GolemFile, golemFilePath: string, context: Map<string, any>): Promise<void> {
  
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
    await executeAIChat(target, golemFile, golemFilePath, context);
    saveOutputToCache(target, cacheKey, context);
  }
}

async function executeAIChat(target: string, golemFile: GolemFile, golemFilePath: string, context: Map<string, any>): Promise<void> {

  // ============== Setup start ====================================
  const contextOfCurrentTarget: string[] = [];
  const allOutputs: {[key: string]: any} = {}; 
  const golemTarget = golemFile[target];

  console.log("gT", golemTarget);

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
  else if (!golemTarget.prompt) {
    const defaultValues = new Map(context.entries());
    context.set("default", Object.fromEntries(defaultValues));
    return;
  }

  const model = golemTarget.model ?? 'gpt-3.5-turbo';
  // ============== Setup end ====================================

  if (model === 'cat') {
    const concatenatedOutput = golemTarget.dependencies.map(dep => context.get(dep)).join('');
    context.set(target, concatenatedOutput);
  
  } else if (model == "gpt-3.5-turbo" || model == "gpt-3.5-turbo-0301" || model == "gpt-4-0314" || model == "gpt-4-32k") {
    
    if ("model" in golemTarget) {
      delete golemTarget.model;
    }
    
    // This gets the 'keys' (subtasks) of a target (task)
    const golemTargetKeys: string[] = Object.keys(golemTarget);
    
    // It starts from 1 as index 0 is dependencies. This can be changed if needed
    for (let i = 1; i < golemTargetKeys.length; i++){
      // console.log("gTKi", golemTargetKeys[i]);
    
      const val: any = golemTarget[golemTargetKeys[i] as keyof typeof golemTarget];
      // console.log("val", val);

      const previousContext: string | undefined = contextOfCurrentTarget[0] || '';
        
      // Concat the previousContext (if undefined) to the current subtask (here, named val)
      const content = previousContext + val;
      // console.log("content", content);

      // This block of code replaces the {{}} placeholders in the string from the yaml file 
      // with the output of the subtask or task it requires
      const replacedString = content.replace(/{{(.*?)}}/g, (match, p1) => {
        // Remove the curly braces from the placeholder
        const placeholder = p1.trim();
        // Replace the placeholder with the corresponding value from the map
        return context.get(placeholder) || placeholder;
      });

      // console.log("context", context);
      // console.log("replacedString", replacedString);

      const taskGenerationMessages: ChatGPTMessage[] = [
        mainPrompt,
        {
          role: 'user',
          content: replacedString,
        },
      ];

      const response = await ChatGPT_completion(taskGenerationMessages, model, 0.7, 0.9);

      contextOfCurrentTarget.length = 0; //clear the previous context
      contextOfCurrentTarget.push(response); //append the new context to be used in the next iteration

      allOutputs[golemTargetKeys[i]] = response;

      const lines: string[] = response.split('\n');

      // Extract the targets from the lines that start with "Target:"
      const targets: string[] = lines.filter((line: string) => line.startsWith("Target:"))
      .map((line: string) => line.slice(8));

      let count = 1;
      targets.forEach((createdTarget: string) => {
        const targetName = target.concat("_target".concat(count.toString())); 
        const newTarget: string = `\n${targetName}:\n  dependencies: []\n  prompt: ${createdTarget}`; 
        appendToGolemFile(golemFilePath, newTarget);
        golemTargetKeys.push(targetName);
        golemTarget[targetName] = createdTarget;
        count += 1;
      });  

      if (golemTargetKeys.length === 2){
        if (!response) {
          context.set(target, `Default value for ${target}`);
        } else {
          context.set(target, response);
          console.log(context);
        }
      }
      else if (golemTargetKeys.length > 2){
        try {          
          for (const key in allOutputs) {
            context.set(key, allOutputs[key]);
          }
        }catch (error: any) {
          logger.error(`Error generating AI response: ${error.message}`);
        }  
      }

    }
  }else {
    throw new Error(`No such supported model ${model}`);
  }
}