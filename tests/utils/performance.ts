export interface PerformanceMetrics {
  loadTime: number
  ttfb: number // Time to First Byte
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  cls: number // Cumulative Layout Shift
  fid: number // First Input Delay
}

export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}

  startTiming(label: string): () => number {
    const start = performance.now()
    return () => {
      const end = performance.now()
      const duration = end - start
      console.log(`${label}: ${duration.toFixed(2)}ms`)
      return duration
    }
  }

  async measurePageLoad(url: string): Promise<number> {
    const start = performance.now()
    await fetch(url)
    const end = performance.now()
    return end - start
  }

  async measureApiCall(url: string, options?: RequestInit): Promise<{
    duration: number
    status: number
  }> {
    const start = performance.now()
    const response = await fetch(url, options)
    const end = performance.now()

    return {
      duration: end - start,
      status: response.status,
    }
  }

  recordMetric(name: keyof PerformanceMetrics, value: number): void {
    this.metrics[name] = value
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics }
  }

  clearMetrics(): void {
    this.metrics = {}
  }

  assertPerformance(
    metric: keyof PerformanceMetrics,
    threshold: number
  ): boolean {
    const value = this.metrics[metric]
    if (value === undefined) {
      throw new Error(`Metric ${metric} not recorded`)
    }
    return value <= threshold
  }
}

export const performanceMonitor = new PerformanceMonitor()

export async function runLoadTest(
  url: string,
  concurrentUsers: number,
  duration: number
): Promise<{
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
}> {
  const results: number[] = []
  const errors: number[] = []
  const startTime = Date.now()

  const makeRequest = async (): Promise<void> => {
    while (Date.now() - startTime < duration) {
      try {
        const requestStart = performance.now()
        const response = await fetch(url)
        const requestEnd = performance.now()

        if (response.ok) {
          results.push(requestEnd - requestStart)
        } else {
          errors.push(response.status)
        }
      } catch (error) {
        errors.push(0)
      }
    }
  }

  const workers = Array.from({ length: concurrentUsers }, () => makeRequest())
  await Promise.all(workers)

  return {
    totalRequests: results.length + errors.length,
    successfulRequests: results.length,
    failedRequests: errors.length,
    averageResponseTime:
      results.reduce((a, b) => a + b, 0) / results.length || 0,
    minResponseTime: results.length > 0 ? results.reduce((a, b) => Math.min(a, b), Infinity) : 0,
    maxResponseTime: results.length > 0 ? results.reduce((a, b) => Math.max(a, b), -Infinity) : 0,
  }
}

export function assertLoadTime(duration: number, threshold: number): void {
  if (duration > threshold) {
    throw new Error(
      `Load time ${duration}ms exceeded threshold ${threshold}ms`
    )
  }
}

export function assertResponseTime(duration: number, threshold: number): void {
  if (duration > threshold) {
    throw new Error(
      `Response time ${duration}ms exceeded threshold ${threshold}ms`
    )
  }
}
