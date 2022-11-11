export function error(message: string, ...errorTask: unknown[]) {
  return message
    ? console.error(`[setsuna-router error]: ${message}`, ...(errorTask ?? []))
    : console.error(message)
}
