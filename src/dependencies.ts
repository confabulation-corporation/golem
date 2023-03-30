import { GolemFile, isGolemTarget } from './types';
import { GolemError } from './errors';

export function resolveDependencies(golemFile: GolemFile): string[] {
  const resolvedDependencies: string[] = [];

  if (!golemFile.default) {
    throw new GolemError("No default target specified");
  }

  const defaultTarget = golemFile.default;

  if (isGolemTarget(defaultTarget)) {
    const defaultDependencies = defaultTarget.dependencies;
    if (Array.isArray(defaultDependencies)) {
      resolvedDependencies.push(...defaultDependencies);
    }
  }

  return resolvedDependencies;
}

