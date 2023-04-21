import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export function generateCacheKey(target: string, dependencies: string[], furtherInstructionsArr: string[]): string {

  const stringToHash = JSON.stringify(furtherInstructionsArr);
  const inputString = `${target}:${dependencies.join(',')}_${stringToHash}`;
  const hash = createHash('sha1').update(inputString).digest('hex');
  return hash;
  
}

export function getCachedOutputPath(target: string, cacheKey: string): string {
  return join('.golem', `${target}_${cacheKey}_output.txt`);
}

export function isCacheValid(target: string, cacheKey: string): boolean {
  const cachedOutputPath = getCachedOutputPath(target, cacheKey);
  return existsSync(cachedOutputPath);
}

export function saveOutputToCache(target: string, cacheKey: string, context: Map<string, any>): void {
  const cachedOutputPath = getCachedOutputPath(target, cacheKey);
  writeFileSync(cachedOutputPath, JSON.stringify(Object.fromEntries(context), null, 2), 'utf-8');
}

export function loadOutputFromCache(target: string, cacheKey: string): string {
  const cachedOutputPath = getCachedOutputPath(target, cacheKey);
  return readFileSync(cachedOutputPath, 'utf-8');
}

export function createGolemCacheDir(): void {
  if (!existsSync('.golem')) {
    mkdirSync('.golem');
  }
}
