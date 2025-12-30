export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  points: 1000,
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const createMockMarket = (overrides = {}) => ({
  id: '1',
  title: 'Will Avatar 3 gross over $2B worldwide?',
  description: 'Test market description',
  category: 'box_office',
  status: 'open',
  blindPeriodEnds: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  resolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  totalBetsYes: 500,
  totalBetsNo: 500,
  totalBettorsYes: 5,
  totalBettorsNo: 5,
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const createMockBet = (overrides = {}) => ({
  id: '1',
  userId: '1',
  marketId: '1',
  prediction: 'yes',
  amount: 100,
  odds: 2.0,
  isBlind: true,
  createdAt: new Date().toISOString(),
  ...overrides,
})

export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
    } as Response)
  )
}

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const setupAuthMock = (user = createMockUser()) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user))
  }
  return user
}

export const clearAuthMock = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser')
  }
}
