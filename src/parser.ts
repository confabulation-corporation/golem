import * as yaml from 'js-yaml';
import { GolemFile } from './types';

export function parseGolemFile(content: string): GolemFile {
  try {
    const parsedContent = yaml.load(content) as GolemFile;
    return parsedContent;
  } catch (error: any) {
    throw new Error(`Error parsing Golem file: ${error.message}`);
  }
}
