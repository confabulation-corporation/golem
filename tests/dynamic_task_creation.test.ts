import { executeTarget } from '../src/executor';
import { parseGolemFile } from '../src/parser';

describe('Dynamic Task Creation', () => {
  let golemFile;

  beforeEach(() => {
    // Load the Golem file with dynamic task generation
    const golemFileContent = `
    default:
      dependencies:
        - initial_task

    initial_task:
      dependencies: []
      prompt: "Create a Python function that adds two numbers."
      task_generation_prompt: "Based on the outcome of the initial_task, generate new targets to create functions for other arithmetic operations."
    `;
    golemFile = parseGolemFile(golemFileContent);
  });

  test('successful dynamic task creation', async () => {
    // Test the successful dynamic task creation scenario
    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBeGreaterThan(0);
  });

  test('dynamic task creation with AI chat failure', async () => {
    // Test the dynamic task creation when the AI chat fails
    // To simulate an AI chat failure, temporarily set an invalid API key
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'INVALID_KEY';

    const initialContext = new Map();
    try {
      await executeTarget('initial_task', golemFile, initialContext);
    } catch (error) {
      expect(error.message).toContain('Error generating AI response');
    } finally {
      // Restore the original API key after the test
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  test('dynamic task creation with duplicate or invalid target names', async () => {
    // Test the dynamic task creation with duplicate or invalid target names
    // Modify the task_generation_prompt to generate a duplicate target name
    golemFile['initial_task'].task_generation_prompt = 'Generate a new target with the same name as the initial_task.';

    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBe(0); // No new targets should be created due to duplicate target names
  });

  test('dynamic task creation with no new tasks generated', async () => {
    // Test the dynamic task creation when no new tasks are generated
    // Modify the task_generation_prompt to not generate any new targets
    golemFile['initial_task'].task_generation_prompt = 'Do not generate any new targets.';

    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBe(0); // No new targets should be created
  });
});
