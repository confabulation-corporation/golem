"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGolemError = exports.GolemError = void 0;
const logger_1 = __importDefault(require("./logger"));
class GolemError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GolemError';
    }
}
exports.GolemError = GolemError;
function handleGolemError(error) {
    logger_1.default.error(`[${error.name}] ${error.message}`);
}
exports.handleGolemError = handleGolemError;
