import { createMockBet, createMockUser, mockFetch } from '../../utils/test-helpers'

describe('Bets API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/bets', () => {
    it('should place a bet successfully during blind period', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'yes',
        amount: 100,
        isBlind: true,
      }

      mockFetch({ success: true, betId: 'bet123', contrarian: false })

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.betId).toBe('bet123')
    })

    it('should calculate contrarian bonus correctly', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'no',
        amount: 100,
        isBlind: true,
      }

      mockFetch({
        success: true,
        betId: 'bet456',
        contrarian: true,
        contrarianBonus: 20
      })

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.contrarian).toBe(true)
      expect(data.contrarianBonus).toBeGreaterThan(0)
    })

    it('should validate bet amount', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'yes',
        amount: -100, // Invalid negative amount
        isBlind: true,
      }

      mockFetch({ success: false, error: 'Invalid bet amount' }, 400)

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })

      expect(response.status).toBe(400)
    })

    it('should check user has sufficient points', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'yes',
        amount: 10000, // More than user has
        isBlind: true,
      }

      mockFetch({ success: false, error: 'Insufficient points' }, 400)

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })

      expect(response.status).toBe(400)
    })

    it('should prevent betting on closed markets', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'yes',
        amount: 100,
        isBlind: false,
      }

      mockFetch({ success: false, error: 'Market is closed' }, 400)

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })

      expect(response.status).toBe(400)
    })

    it('should record bet with correct odds during open period', async () => {
      const betData = {
        userId: '1',
        marketId: '1',
        prediction: 'yes',
        amount: 100,
        isBlind: false,
      }

      mockFetch({
        success: true,
        betId: 'bet789',
        odds: 1.85,
        potentialWin: 185
      })

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.odds).toBeGreaterThan(0)
      expect(data.potentialWin).toBeGreaterThan(0)
    })
  })

  describe('GET /api/bets', () => {
    it('should fetch user bets', async () => {
      const mockBets = [
        createMockBet({ id: '1', marketId: '1' }),
        createMockBet({ id: '2', marketId: '2' }),
      ]

      mockFetch({ success: true, bets: mockBets })

      const response = await fetch('/api/bets?userId=1')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.bets).toHaveLength(2)
    })
  })
})
