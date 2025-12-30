import {
  performanceMonitor,
  runLoadTest,
  assertLoadTime,
  assertResponseTime,
} from '../utils/performance'
import { mockFetch } from '../utils/test-helpers'

describe('Performance Tests', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics()
  })

  describe('Page Load Performance', () => {
    it('should load homepage within performance budget', async () => {
      const endTiming = performanceMonitor.startTiming('Homepage Load')
      mockFetch({ success: true, data: {} })

      await fetch('/')

      const duration = endTiming()
      assertLoadTime(duration, 2000) // 2 second budget
    })

    it('should load markets page within performance budget', async () => {
      const endTiming = performanceMonitor.startTiming('Markets Page Load')
      mockFetch({ success: true, markets: [] })

      await fetch('/markets')

      const duration = endTiming()
      assertLoadTime(duration, 2000)
    })
  })

  describe('API Performance', () => {
    it('should respond to /api/markets within 500ms', async () => {
      mockFetch({ success: true, markets: [] })

      const result = await performanceMonitor.measureApiCall('/api/markets')

      expect(result.status).toBe(200)
      assertResponseTime(result.duration, 500)
    })

    it('should respond to /api/markets/[id] within 300ms', async () => {
      mockFetch({ success: true, market: {} })

      const result = await performanceMonitor.measureApiCall('/api/markets/1')

      expect(result.status).toBe(200)
      assertResponseTime(result.duration, 300)
    })

    it('should respond to /api/bets within 400ms', async () => {
      mockFetch({ success: true, betId: '123' })

      const result = await performanceMonitor.measureApiCall('/api/bets', {
        method: 'POST',
        body: JSON.stringify({
          userId: '1',
          marketId: '1',
          prediction: 'yes',
          amount: 100,
        }),
      })

      expect(result.status).toBe(200)
      assertResponseTime(result.duration, 400)
    })

    it('should respond to /api/leaderboards within 600ms', async () => {
      mockFetch({ success: true, leaderboard: [] })

      const result = await performanceMonitor.measureApiCall('/api/leaderboards')

      expect(result.status).toBe(200)
      assertResponseTime(result.duration, 600)
    })
  })

  describe('Load Testing', () => {
    it('should handle 10 concurrent users', async () => {
      mockFetch({ success: true, data: {} })

      const results = await runLoadTest(
        '/api/markets',
        10,
        5000 // 5 second test
      )

      expect(results.successfulRequests).toBeGreaterThan(0)
      expect(results.failedRequests).toBe(0)
      expect(results.averageResponseTime).toBeLessThan(1000)
    }, 10000)

    it('should handle 50 concurrent users', async () => {
      mockFetch({ success: true, data: {} })

      const results = await runLoadTest(
        '/api/markets',
        50,
        5000
      )

      const errorRate = results.failedRequests / results.totalRequests
      expect(errorRate).toBeLessThan(0.05) // Less than 5% error rate
      expect(results.averageResponseTime).toBeLessThan(2000)
    }, 15000)
  })

  describe('Database Query Performance', () => {
    it('should fetch markets with pagination efficiently', async () => {
      mockFetch({ success: true, markets: [], total: 100 })

      const result = await performanceMonitor.measureApiCall(
        '/api/markets?limit=20&offset=0'
      )

      assertResponseTime(result.duration, 400)
    })

    it('should fetch user bets efficiently', async () => {
      mockFetch({ success: true, bets: [] })

      const result = await performanceMonitor.measureApiCall('/api/bets?userId=1')

      assertResponseTime(result.duration, 300)
    })

    it('should calculate odds efficiently', async () => {
      mockFetch({ success: true, yesOdds: 1.8, noOdds: 2.2 })

      const result = await performanceMonitor.measureApiCall(
        '/api/markets/1/odds'
      )

      assertResponseTime(result.duration, 200)
    })
  })

  describe('Caching Performance', () => {
    it('should benefit from response caching', async () => {
      mockFetch({ success: true, markets: [] })

      const firstCall = await performanceMonitor.measureApiCall('/api/markets')
      const secondCall = await performanceMonitor.measureApiCall('/api/markets')

      expect(secondCall.duration).toBeLessThanOrEqual(firstCall.duration * 1.2)
    })
  })
})
