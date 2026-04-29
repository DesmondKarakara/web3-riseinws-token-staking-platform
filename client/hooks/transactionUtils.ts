/**
 * Transaction validation and utilities for Yellow Belt Level 2
 */

/**
 * Validate transaction amount input
 */
export function validateAmount(
  amount: string,
  maxAmount?: bigint
): { valid: boolean; error?: string } {
  // Check if it's a valid number
  if (!amount || isNaN(Number(amount))) {
    return { valid: false, error: "Please enter a valid number" };
  }

  const numAmount = Number(amount);

  // Check it's positive
  if (numAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // Check precision (max 7 decimals)
  const decimals = (amount.split(".")[1] || "").length;
  if (decimals > 7) {
    return { valid: false, error: "Too many decimal places (max 7)" };
  }

  // Check against maximum
  if (maxAmount !== undefined) {
    const maxNum = Number(maxAmount) / 10000000;
    if (numAmount > maxNum) {
      return { valid: false, error: `Amount exceeds maximum: ${maxNum}` };
    }
  }

  return { valid: true };
}

/**
 * Convert user input to contract amount (with 7 decimal precision)
 */
export function toContractAmount(userInput: string): bigint {
  const num = Number(userInput);
  return BigInt(Math.floor(num * 10000000));
}

/**
 * Convert contract amount to user display format
 */
export function toDisplayAmount(contractAmount: string | bigint): string {
  const amount = typeof contractAmount === "string" ? BigInt(contractAmount) : contractAmount;
  const divisor = BigInt(10000000);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(7, "0");
  const trimmed = fractionStr.replace(/0+$/, "");
  return `${whole}.${trimmed}`;
}

/**
 * Format contract amount for display with fixed decimals
 */
export function formatAmount(
  contractAmount: string | bigint | undefined,
  decimals: number = 4
): string {
  if (!contractAmount) return "0";

  const display = toDisplayAmount(contractAmount);
  const [whole, frac = "0"] = display.split(".");
  return `${whole}.${frac.padEnd(decimals, "0").slice(0, decimals)}`;
}

/**
 * Rate limiter to prevent transaction spam
 */
export class RateLimiter {
  private lastAction: Map<string, number> = new Map();
  private minIntervalMs: number;

  constructor(minIntervalMs: number = 10000) {
    this.minIntervalMs = minIntervalMs;
  }

  canExecute(userId: string): boolean {
    const lastTime = this.lastAction.get(userId) || 0;
    const now = Date.now();

    if (now - lastTime < this.minIntervalMs) {
      return false;
    }

    this.lastAction.set(userId, now);
    return true;
  }

  getWaitTime(userId: string): number {
    const lastTime = this.lastAction.get(userId) || 0;
    const now = Date.now();
    const waitTime = this.minIntervalMs - (now - lastTime);
    return Math.max(0, waitTime);
  }

  reset(userId: string): void {
    this.lastAction.delete(userId);
  }
}

/**
 * Debounce function for delayed execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Poll for transaction confirmation
 */
export async function pollForConfirmation(
  hashFn: () => Promise<{ status: string; error?: string }>,
  maxAttempts: number = 60,
  intervalMs: number = 1000
): Promise<{ status: string; error?: string; attempts: number }> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await hashFn();

      if (result.status === "SUCCESS" || result.status === "FAILED") {
        return { ...result, attempts };
      }
    } catch (error) {
      console.error("Poll error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new Error(`Transaction confirmation timeout after ${maxAttempts} attempts`);
}

/**
 * Batch fetch multiple contract calls
 */
export async function batchFetch<T>(
  fetchers: (() => Promise<T>)[],
  timeout: number = 10000
): Promise<(T | Error)[]> {
  const promises = fetchers.map((fetcher) =>
    Promise.race([fetcher(), new Promise((_, reject) => setTimeout(() => reject(new Error("Fetch timeout")), timeout))])
      .catch((err) => err)
  );

  return Promise.all(promises) as Promise<(T | Error)[]>;
}

/**
 * Local storage utilities for persisting user data
 */
export const StorageKeys = {
  RECENT_TRANSACTIONS: "staking_recent_txs",
  WALLET_ADDRESS: "connected_wallet",
  PREFERRED_WALLET: "preferred_wallet",
  SETTINGS: "user_settings",
} as const;

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Storage error:", error);
  }
}

export function getFromStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue ?? null;
  } catch (error) {
    console.error("Storage error:", error);
    return defaultValue ?? null;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Storage error:", error);
  }
}

/**
 * Calculate projected earnings
 */
export function calculateProjectedEarnings(
  stakedAmount: bigint,
  rewardRate: bigint,
  totalStaked: bigint,
  daysAhead: number = 30
): string {
  if (totalStaked === BigInt(0)) return "0";

  const secondsAhead = daysAhead * 24 * 60 * 60;
  const totalRewards = rewardRate * BigInt(secondsAhead);
  const userShare = (stakedAmount * totalRewards) / totalStaked;

  return toDisplayAmount(userShare);
}

/**
 * Calculate compound growth
 */
export function calculateCompoundGrowth(
  principal: bigint,
  dailyRewardRate: number,
  days: number
): string {
  let amount = Number(principal);

  for (let i = 0; i < days; i++) {
    amount = amount * (1 + dailyRewardRate);
  }

  return formatAmount(BigInt(Math.floor(amount)));
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

/**
 * Validate contract address format
 */
export function isValidContractAddress(address: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(address);
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, length: number = 4): string {
  if (address.length <= length * 2 + 3) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Sleep utility for testing/debugging
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility for resilient operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts - 1) {
        await sleep(delayMs * Math.pow(2, attempt)); // Exponential backoff
      }
    }
  }

  throw lastError || new Error("Max retry attempts exceeded");
}
