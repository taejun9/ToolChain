export class ToolError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}
export const errorCode = (error: unknown) =>
  error instanceof ToolError
    ? error.code
    : error instanceof RangeError
      ? 'too-large'
      : 'processing'
