export function chunk<T>(items: T[], size = 50): T[][] {
  if (size < 1) throw new Error('Chunk size must be at least 1')
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}
