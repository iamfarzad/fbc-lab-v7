// Mock control for testing and demo purposes
export function isMockEnabled(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.MOCK_MODE === 'true'
}