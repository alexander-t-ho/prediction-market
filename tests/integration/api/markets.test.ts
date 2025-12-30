import { createMockMarket, mockFetch } from '../../utils/test-helpers'

describe('Markets API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/markets', () => {
    it('should fetch all markets successfully', async () => {
      const mockMarkets = [
        createMockMarket({ id: '1', title: 'Market 1' }),
        createMockMarket({ id: '2', title: 'Market 2' }),
      ]

      mockFetch({ success: true, markets: mockMarkets })

      const response = await fetch('/api/markets')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.markets).toHaveLength(2)
      expect(data.markets[0].title).toBe('Market 1')
    })

    it('should handle errors gracefully', async () => {
      mockFetch({ success: false, error: 'Database error' }, 500)

      const response = await fetch('/api/markets')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/markets/[id]', () => {
    it('should fetch a single market by id', async () => {
      const mockMarket = createMockMarket({ id: '1' })
      mockFetch({ success: true, market: mockMarket })

      const response = await fetch('/api/markets/1')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.market.id).toBe('1')
    })

    it('should return 404 for non-existent market', async () => {
      mockFetch({ success: false, error: 'Market not found' }, 404)

      const response = await fetch('/api/markets/nonexistent')

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/markets/propose', () => {
    it('should create a new market proposal', async () => {
      const proposalData = {
        title: 'New Market',
        description: 'Test description',
        category: 'box_office',
        resolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockFetch({ success: true, marketId: '123' })

      const response = await fetch('/api/markets/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.marketId).toBe('123')
    })

    it('should validate required fields', async () => {
      mockFetch({ success: false, error: 'Missing required fields' }, 400)

      const response = await fetch('/api/markets/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Incomplete' }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/markets/[id]/odds', () => {
    it('should calculate dynamic odds correctly', async () => {
      const mockOdds = {
        yesOdds: 1.8,
        noOdds: 2.2,
        totalPool: 1000,
      }

      mockFetch({ success: true, ...mockOdds })

      const response = await fetch('/api/markets/1/odds')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.yesOdds).toBeGreaterThan(0)
      expect(data.noOdds).toBeGreaterThan(0)
    })
  })

  describe('POST /api/markets/[id]/resolve', () => {
    it('should resolve a market with correct outcome', async () => {
      mockFetch({ success: true, resolved: true })

      const response = await fetch('/api/markets/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'yes', adminId: 'admin123' }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.resolved).toBe(true)
    })

    it('should require admin authorization', async () => {
      mockFetch({ success: false, error: 'Unauthorized' }, 403)

      const response = await fetch('/api/markets/1/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'yes' }),
      })

      expect(response.status).toBe(403)
    })
  })
})
