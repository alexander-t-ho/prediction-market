/**
 * Retry Utility with Exponential Backoff
 * For handling API failures gracefully
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch failed') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  },
  onRetry: (attempt: number, error: Error) => {
    console.log(`[Retry] Attempt ${attempt} failed: ${error.message}`);
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Call retry callback
      opts.onRetry(attempt, lastError);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      // Add jitter (±20%) to prevent thundering herd
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const finalDelay = Math.max(0, delay + jitter);

      console.log(`[Retry] Waiting ${Math.round(finalDelay)}ms before attempt ${attempt + 1}/${opts.maxAttempts}`);

      // Wait before retrying
      await sleep(finalDelay);
    }
  }

  throw lastError!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with specific error handling for rate limits
 */
export async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests') ||
        (options.shouldRetry ? options.shouldRetry(error) : defaultOptions.shouldRetry(error))
      );
    },
    initialDelayMs: options.initialDelayMs || 2000, // Longer initial delay for rate limits
    maxAttempts: options.maxAttempts || 5,
  });
}

/**
 * Batch requests with rate limiting
 * Processes requests in chunks with delays between chunks
 */
export async function batchWithRateLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatchesMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const {
    batchSize = 10,
    delayBetweenBatchesMs = 1000,
    onProgress,
  } = options;

  const results: R[] = [];
  const batches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    console.log(`[Batch] Processing batch ${i + 1}/${batches} (${start}-${end - 1})`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item => fn(item))
    );

    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(results.length, items.length);
    }

    // Wait between batches (except for the last one)
    if (i < batches - 1) {
      await sleep(delayBetweenBatchesMs);
    }
  }

  return results;
}
