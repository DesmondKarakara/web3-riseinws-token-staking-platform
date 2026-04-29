// Security utilities for input validation and rate limiting

export function validateStakeAmount(amount: string): { valid: boolean; error?: string } {
  // Check if it's a valid number
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }

  if (isNaN(Number(amount))) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  const numAmount = Number(amount);

  // Check if it's positive
  if (numAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // Check if it's not too large (prevent overflow)
  const maxAmount = Number.MAX_SAFE_INTEGER / 10000000; // Max safe amount in tokens
  if (numAmount > maxAmount) {
    return { valid: false, error: "Amount is too large" };
  }

  // Check decimal precision (Stellar tokens have 7 decimal places)
  const parts = amount.split('.');
  if (parts.length > 1 && parts[1].length > 7) {
    return { valid: false, error: "Maximum 7 decimal places allowed" };
  }

  // Check minimum amount (prevent dust transactions)
  if (numAmount < 0.0000001) {
    return { valid: false, error: "Amount is too small (minimum 0.0000001 TOKEN)" };
  }

  return { valid: true };
}

export function validateAddress(address: string): { valid: boolean; error?: string } {
  // Basic Stellar address validation
  if (!address || address.trim() === "") {
    return { valid: false, error: "Address is required" };
  }

  // Stellar addresses start with 'G' and are 56 characters long
  if (!address.startsWith('G') || address.length !== 56) {
    return { valid: false, error: "Invalid Stellar address format" };
  }

  // Basic checksum validation (simplified)
  // In a real app, you'd use a proper Stellar SDK validation
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  for (const char of address) {
    if (!validChars.includes(char)) {
      return { valid: false, error: "Invalid characters in address" };
    }
  }

  return { valid: true };
}

export function sanitizeError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  // Don't expose sensitive information
  if (lowerMessage.includes('private key') || lowerMessage.includes('secret')) {
    return 'Authentication failed';
  }

  if (lowerMessage.includes('insufficient') && lowerMessage.includes('balance')) {
    return 'Insufficient balance for this transaction';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (lowerMessage.includes('timeout')) {
    return 'Transaction timed out. Please try again.';
  }

  if (lowerMessage.includes('contract')) {
    return 'Smart contract error. Please try again or contact support.';
  }

  // For unknown errors, provide a generic message
  if (lowerMessage.includes('error') || lowerMessage.includes('failed')) {
    return 'An error occurred. Please try again.';
  }

  // If the message seems safe, return it (truncated if too long)
  return message.length > 100 ? message.substring(0, 100) + '...' : message;
}

export class RateLimiter {
  private lastActions: Map<string, number> = new Map();
  private actionCounts: Map<string, number> = new Map();
  private readonly windowMs: number;
  private readonly maxActions: number;
  private readonly cooldownMs: number;

  constructor(windowMs: number = 60000, maxActions: number = 5, cooldownMs: number = 10000) {
    this.windowMs = windowMs; // Time window in milliseconds
    this.maxActions = maxActions; // Max actions per window
    this.cooldownMs = cooldownMs; // Cooldown between actions
  }

  canExecute(userId: string, actionType: string = 'default'): boolean {
    const key = `${userId}:${actionType}`;
    const now = Date.now();
    const lastAction = this.lastActions.get(key) || 0;
    const actionCount = this.actionCounts.get(key) || 0;

    // Reset count if window has passed
    if (now - lastAction > this.windowMs) {
      this.actionCounts.set(key, 0);
    }

    // Check cooldown
    if (now - lastAction < this.cooldownMs) {
      return false;
    }

    // Check rate limit
    if (actionCount >= this.maxActions) {
      return false;
    }

    return true;
  }

  recordAction(userId: string, actionType: string = 'default'): void {
    const key = `${userId}:${actionType}`;
    const now = Date.now();

    this.lastActions.set(key, now);
    this.actionCounts.set(key, (this.actionCounts.get(key) || 0) + 1);
  }

  getRemainingTime(userId: string, actionType: string = 'default'): number {
    const key = `${userId}:${actionType}`;
    const lastAction = this.lastActions.get(key) || 0;
    const now = Date.now();

    const timeSinceLastAction = now - lastAction;
    return Math.max(0, this.cooldownMs - timeSinceLastAction);
  }

  getRemainingActions(userId: string, actionType: string = 'default'): number {
    const key = `${userId}:${actionType}`;
    const actionCount = this.actionCounts.get(key) || 0;
    return Math.max(0, this.maxActions - actionCount);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Action-specific rate limiters
export const stakeRateLimiter = new RateLimiter(60000, 3, 5000); // 3 stakes per minute, 5s cooldown
export const unstakeRateLimiter = new RateLimiter(60000, 2, 10000); // 2 unstakes per minute, 10s cooldown
export const claimRateLimiter = new RateLimiter(300000, 5, 60000); // 5 claims per 5 minutes, 1min cooldown

export function validateTransactionAmount(amount: bigint, userBalance: bigint): { valid: boolean; error?: string } {
  if (amount <= 0n) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (amount > userBalance) {
    return { valid: false, error: "Insufficient balance" };
  }

  // Check for reasonable maximum (prevent accidental large transactions)
  const maxReasonable = userBalance / 10n; // Max 10% of balance at once
  if (amount > maxReasonable && userBalance > 10000000n) { // Only check if balance > 1 TOKEN
    return {
      valid: false,
      error: "Transaction amount too large. Consider smaller transactions for safety."
    };
  }

  return { valid: true };
}