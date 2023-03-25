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
      for (const dependency of defaultDependencies) {
        if (golemFile[dependency]) {
          resolvedDependencies.push(...golemFile[dependency]!.dependencies);
        } else {
          resolvedDependencies.push(dependency);
        }
      }
    }
  }

  return resolvedDependencies;
}