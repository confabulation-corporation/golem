import { parseGolemFile } from '../src/parser';
import fs from 'fs';
import { executeTarget } from '../src/executor';

describe('Nested dependencies test', () => {
  test('Check if the executor can handle complex dependency structures', async () => {
    const golemFileContent = fs.readFileSync('golems/nested_dependencies.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    const context = new Map();
    await executeTarget('default', golemFile, context);

    expect(context.get('level_1')).toBe("Level 1 result: Level 2 result: Level 3 result: This is the final level.");
  });
});
