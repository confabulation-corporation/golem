#!/usr/bin/env node
import yargs from 'yargs';
import { executeTarget } from './executor';
import { parseGolemFile } from './parser';
import fs from 'fs';

yargs
  .command(
    'golem [golemFile]',
    'Run the specified Golem file or the default Golem file if none is provided.',
    (yargs) => {
      yargs.positional('golemFile', {
        describe: 'Path to the Golem file',
        default: 'Golem.yaml',
        type: 'string',
      });
    },
    async (argv) => {
      try {
        const golemFilePath = argv.golemFile as string;

        // Read the Golem file content
        const golemFileContent = fs.readFileSync(golemFilePath, 'utf8');
        const golemFile = parseGolemFile(golemFileContent);

        // Execute the default target with an empty context
        await executeTarget('default', golemFile, new Map());
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }
    }
  )
  .demandCommand(1, 'You must provide a valid command.')
  .help()
  .alias('h', 'help')
  .strict().argv;