import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export function generateCacheKey(target: string, dependencies: string[], prompt: string): string {
  const inputString = `${target}_${dependencies.join('_')}_${prompt}`;
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

export function saveOutputToCache(target: string, cacheKey: string, output: string): void {
  const cachedOutputPath = getCachedOutputPath(target, cacheKey);
  writeFileSync(cachedOutputPath, output, 'utf-8');
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
