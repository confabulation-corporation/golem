"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDependencies = void 0;
const types_1 = require("./types");
const errors_1 = require("./errors");
function resolveDependencies(golemFile) {
    const resolvedDependencies = [];
    if (!golemFile.default) {
        throw new errors_1.GolemError("No default target specified");
    }
    const defaultTarget = golemFile.default;
    if ((0, types_1.isGolemTarget)(defaultTarget)) {
        const defaultDependencies = defaultTarget.dependencies;
        if (Array.isArray(defaultDependencies)) {
            resolvedDependencies.push(...defaultDependencies);
        }
    }
    return resolvedDependencies;
}
exports.resolveDependencies = resolveDependencies;
