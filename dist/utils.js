"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGolemCacheDir = exports.loadOutputFromCache = exports.saveOutputToCache = exports.isCacheValid = exports.getCachedOutputPath = exports.generateCacheKey = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
function generateCacheKey(target, dependencies, prompt) {
    const inputString = `${target}_${dependencies.join('_')}_${prompt}`;
    const hash = (0, crypto_1.createHash)('sha1').update(inputString).digest('hex');
    return hash;
}
exports.generateCacheKey = generateCacheKey;
function getCachedOutputPath(target, cacheKey) {
    return (0, path_1.join)('.golem', `${target}_${cacheKey}_output.txt`);
}
exports.getCachedOutputPath = getCachedOutputPath;
function isCacheValid(target, cacheKey) {
    const cachedOutputPath = getCachedOutputPath(target, cacheKey);
    return (0, fs_1.existsSync)(cachedOutputPath);
}
exports.isCacheValid = isCacheValid;
function saveOutputToCache(target, cacheKey, output) {
    const cachedOutputPath = getCachedOutputPath(target, cacheKey);
    (0, fs_1.writeFileSync)(cachedOutputPath, output, 'utf-8');
}
exports.saveOutputToCache = saveOutputToCache;
function loadOutputFromCache(target, cacheKey) {
    const cachedOutputPath = getCachedOutputPath(target, cacheKey);
    return (0, fs_1.readFileSync)(cachedOutputPath, 'utf-8');
}
exports.loadOutputFromCache = loadOutputFromCache;
function createGolemCacheDir() {
    if (!(0, fs_1.existsSync)('.golem')) {
        (0, fs_1.mkdirSync)('.golem');
    }
}
exports.createGolemCacheDir = createGolemCacheDir;
