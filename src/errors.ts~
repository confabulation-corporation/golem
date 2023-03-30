export class GolemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GolemError';
  }
}

export function handleGolemError(error: GolemError): void {
  console.error(`[${error.name}] ${error.message}`);
}