export function logError(error: Error | unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ error: message, context, ts: new Date() }))
}
