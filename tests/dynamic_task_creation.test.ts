import { executeTarget } from '../src/executor';
import { parseGolemFile } from '../src/parser';
import { GolemFile } from '../src/types';

describe('Dynamic Task Creation', () => {
  let golemFile: GolemFile;

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
    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBeGreaterThan(0);
  });

  test('dynamic task creation with AI chat failure', async () => {
    const initialContext = new Map();

    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'INVALID_KEY';

    try {
      await executeTarget('initial_task', golemFile, initialContext);
    } catch (error: any) {
      expect(error.message).toContain('Error generating AI response');
    } finally {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  test('dynamic task creation with duplicate or invalid target names', async () => {
    if (golemFile['initial_task']) {
      golemFile['initial_task'].task_generation_prompt = 'Generate a new target with the same name as the initial_task.';
    }

    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBe(0);
  });

  test('dynamic task creation with no new tasks generated', async () => {
    if (golemFile['initial_task']) {
      golemFile['initial_task'].task_generation_prompt = 'Do not generate any new targets.';
    }

    const initialContext = new Map();
    await executeTarget('initial_task', golemFile, initialContext);
    const newTargets = Object.keys(golemFile).filter(target => target !== 'default' && target !== 'initial_task');
    expect(newTargets.length).toBe(0);
  });
});