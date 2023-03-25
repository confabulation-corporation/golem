import { exec } from 'child_process';
import { GolemFile, GolemTarget, isGolemTarget } from './types';
import { ChatGPTMessage, ChatGPT_completion } from './chat_gpt';
import { readFile } from 'fs/promises';
import { dirname } from 'path';

interface ExecutionContext {
  [key: string]: any;
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
        if (golemFile[dependency]) {
          // Execute the dependency and update the context with its result
          await executeTarget(dependency, golemFile, context);
        } else {
          try {
            // Try to read the file content
            const fileContent = await readFile(dependency, 'utf-8');

            // Store the file content in the context
            context.set(dependency, fileContent);
          } catch (error: any) { /* FIXME: This is not the correct way to handle exception types */
            if (error.code === 'ENOENT') {
              console.error(`Error executing target "${target}": dependency "${dependency}" not found.`);
            } else {
              console.error(`Error executing target "${target}": ${error.message}`);
            }
          }
        }
      }
    }
  }

  // Call the executeAIChat function for the current target
  await executeAIChat(target, golemFile, context);

  console.log(`Context after ${target} execution:`, context); // Log the context after the current target's execution
}


function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

async function executeAIChat(target: string, golemFile: GolemFile, context: Map<string, any>): Promise<void> {
  console.log("================================");
  console.log( target );
  console.log( golemFile );
  console.log( context );


  const golemTarget = golemFile[target];

  let prompt = golemTarget?.prompt ?? "{no prompt}";
  if (isGolemTarget(golemTarget) && golemTarget.prompt) {
    prompt = golemTarget.prompt;
//    const placeholderRegex = /{{\s*(\w+)\s*}}/g;
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
  console.log(golemTarget?.prompt ?? "{no prompt}");
  console.log("================================");
  console.log(`Prompt for ${target}: ${prompt}`); // Log the prompt for the current target

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
    console.log("a");
    const response = await ChatGPT_completion(messages, 'gpt-3.5-turbo', 0.7, 0.9);
    console.log(`AI Response for ${target}: ${response}`); // Log the AI response for the current target

    if (!response) {
      console.log(`No AI response for ${target}. Storing default value.`); // Log when there is no AI response for the current target
      context.set(target, `Default value for ${target}`); // Store the default value in the context
    } else {
      context.set(target, response); // Store the AI response in the context
    }

    console.log(`Context after ${target} AI chat:`, context); // Log the context after the AI chat for the current target
  } catch (error: any) {
    console.error(`Error generating AI response: ${error.message}`);
  }
}
