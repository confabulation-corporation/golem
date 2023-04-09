#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const executor_1 = require("./executor");
const parser_1 = require("./parser");
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
const utils_1 = require("./utils"); // Add this import
yargs_1.default
    .command('golem [golemFile]', 'Run the specified Golem file or the default Golem file if none is provided.', (yargs) => {
    yargs.positional('golemFile', {
        describe: 'Path to the Golem file',
        default: 'Golem.yaml',
        type: 'string',
    });
}, async (argv) => {
    try {
        const golemFilePath = argv.golemFile;
        // Add this line to create the .golem/ directory
        (0, utils_1.createGolemCacheDir)();
        // Read the Golem file content
        const golemFileContent = fs_1.default.readFileSync(golemFilePath, 'utf8');
        const golemFile = (0, parser_1.parseGolemFile)(golemFileContent);
        // Execute the default target with an empty context
        await (0, executor_1.executeTarget)('default', golemFile, new Map());
    }
    catch (error) {
        logger_1.default.error(`Error: ${error.message}`);
    }
})
    .demandCommand(1, 'You must provide a valid command.')
    .help()
    .alias('h', 'help')
    .strict().argv;
