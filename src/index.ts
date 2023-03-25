import { parseGolemFile } from './parser';
import { GolemFile } from './types';
import { resolveDependencies } from './dependencies';
import { executeTarget } from './executor';
import { GolemError, handleGolemError } from './errors';

async function main() {
  try {
    // Read the Golem file content, e.g., from a file or command line input
    const golemFileContent = '...';

    const golemFile: GolemFile = parseGolemFile(golemFileContent);
    const dependencies = resolveDependencies(golemFile);

    for (const target of dependencies) {
      await executeTarget(target, golemFile);
    }
  } catch (error) {
    if (error instanceof GolemError) {
      handleGolemError(error);
    } else {
      throw error;
    }
  }
}

main();