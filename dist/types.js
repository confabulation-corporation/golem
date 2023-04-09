"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGolemTarget = void 0;
function isGolemTarget(target) {
    return target !== undefined && target.dependencies !== undefined;
}
exports.isGolemTarget = isGolemTarget;
