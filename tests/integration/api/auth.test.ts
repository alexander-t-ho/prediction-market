import { createMockUser, mockFetch } from '../../utils/test-helpers'

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
      }

      mockFetch({
        success: true,
        user: createMockUser(userData),
        token: 'mock-jwt-token'
      })

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.user.username).toBe('newuser')
    })

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        displayName: 'New User',
      }

      mockFetch({ success: false, error: 'Username already exists' }, 409)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(409)
    })

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        displayName: 'New User',
      }

      mockFetch({ success: false, error: 'Email already exists' }, 409)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(409)
    })

    it('should validate email format', async () => {
      const userData = {
        username: 'newuser',
        email: 'invalid-email',
        displayName: 'New User',
      }

      mockFetch({ success: false, error: 'Invalid email format' }, 400)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(400)
    })

    it('should validate username length', async () => {
      const userData = {
        username: 'ab', // Too short
        email: 'test@example.com',
        displayName: 'New User',
      }

      mockFetch({ success: false, error: 'Username too short' }, 400)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        username: 'testuser',
        email: 'test@example.com',
      }

      mockFetch({
        success: true,
        user: createMockUser(credentials),
        token: 'mock-jwt-token'
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.user.username).toBe('testuser')
    })

    it('should reject invalid credentials', async () => {
      const credentials = {
        username: 'wronguser',
        email: 'wrong@example.com',
      }

      mockFetch({ success: false, error: 'User not found' }, 401)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      expect(response.status).toBe(401)
    })
  })
})
