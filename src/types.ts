export interface GolemTarget {
  dependencies: string[];
  prompt: string;
  model?: string; // Add this line
  task_generation_prompt?: string; // Add this line
}
export type GolemFile = {
  default: string[];
} & {
  [target: string]: GolemTarget | undefined;
};

export function isGolemTarget(target: GolemTarget | string[] | undefined): target is GolemTarget {
  return target !== undefined && (target as GolemTarget).dependencies !== undefined;
}
