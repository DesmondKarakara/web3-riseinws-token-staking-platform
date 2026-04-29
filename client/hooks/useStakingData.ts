import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getStakerInfo,
  getGlobalStats,
} from "@/hooks/contract";

export interface StakerInfo {
  staked: string;
  pending_rewards: string;
  last_reward_per_token: string;
}

export interface GlobalStats {
  total_staked: string;
  staker_count: string;
  reward_rate: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface AutoRefreshConfig {
  interval?: number;
  cacheTtl?: number;
  backgroundRefresh?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: { staker: StakerInfo | null; global: GlobalStats | null }) => void;
}

/**
 * Enhanced caching system with TTL and background refresh
 */
class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
const stakerCache = new DataCache<StakerInfo>();
const globalStatsCache = new DataCache<GlobalStats>();

/**
 * Enhanced custom hook for auto-refreshing staking data with caching
 * Handles polling, error recovery, state management, and intelligent caching
 */
export function useStakingData(
  walletAddress: string | null,
  config: AutoRefreshConfig = {}
) {
  const {
    interval = 10000,
    cacheTtl = 30000,
    backgroundRefresh = true,
    onError,
    onSuccess
  } = config;

  const [stakerInfo, setStakerInfo] = useState<StakerInfo | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [cacheHits, setCacheHits] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Cache keys
  const stakerCacheKey = useMemo(() =>
    walletAddress ? `staker_${walletAddress}` : null,
    [walletAddress]
  );
  const globalCacheKey = 'global_stats';

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!walletAddress && !forceRefresh) return;

    setIsLoading(true);
    setError(null);

    try {
      let stakerData = null;
      let globalData = null;
      let cacheUsed = false;

      // Try to get data from cache first (unless force refresh)
      if (!forceRefresh) {
        if (stakerCacheKey) {
          stakerData = stakerCache.get(stakerCacheKey);
        }
        globalData = globalStatsCache.get(globalCacheKey);

        if (stakerData || globalData) {
          cacheUsed = true;
          setCacheHits(prev => prev + 1);
        }
      }

      // Fetch fresh data if not in cache or force refresh
      if (!stakerData && walletAddress) {
        stakerData = await getStakerInfo(walletAddress);
        if (stakerData && stakerCacheKey) {
          stakerCache.set(stakerCacheKey, stakerData, cacheTtl);
        }
      }

      if (!globalData) {
        globalData = await getGlobalStats();
        if (globalData) {
          globalStatsCache.set(globalCacheKey, globalData, cacheTtl);
        }
      }

      // Update state
      setStakerInfo(stakerData);
      setGlobalStats(globalData);
      setLastUpdated(new Date());

      // Call success callback
      if (onSuccess) {
        onSuccess({ staker: stakerData, global: globalData });
      }

      // Background refresh for cached data
      if (cacheUsed && backgroundRefresh && !forceRefresh) {
        setTimeout(async () => {
          try {
            const [freshStaker, freshGlobal] = await Promise.all([
              walletAddress ? getStakerInfo(walletAddress) : Promise.resolve(null),
              getGlobalStats(),
            ]);

            if (freshStaker && stakerCacheKey) {
              stakerCache.set(stakerCacheKey, freshStaker, cacheTtl);
            }
            if (freshGlobal) {
              globalStatsCache.set(globalCacheKey, freshGlobal, cacheTtl);
            }

            // Update state if component still mounted
            setStakerInfo(freshStaker);
            setGlobalStats(freshGlobal);
            setLastUpdated(new Date());
          } catch {
            // Silent background refresh failure
          }
        }, 1000);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [walletAddress, stakerCacheKey, cacheTtl, backgroundRefresh, onError, onSuccess]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const startAutoRefresh = () => {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, interval);
    };

    // Initial load
    if (isInitialLoadRef.current) {
      fetchData();
    } else {
      startAutoRefresh();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, interval, autoRefreshEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Computed values
  const isStale = useMemo(() => {
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated.getTime() > cacheTtl;
  }, [lastUpdated, cacheTtl]);

  const timeSinceUpdate = useMemo(() => {
    if (!lastUpdated) return null;
    return Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  }, [lastUpdated]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => !prev);
  }, []);

  return {
    stakerInfo,
    globalStats,
    isLoading,
    error,
    lastUpdated,
    isStale,
    timeSinceUpdate,
    cacheHits,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refresh: () => fetchData(true),
    clearCache: () => {
      stakerCache.clear();
      globalStatsCache.clear();
      setCacheHits(0);
    },
  };
}

/**
 * Hook for calculating APY and reward metrics
 */
export function useRewardMetrics(globalStats: GlobalStats | null) {
  const metrics = useMemo(() => {
    if (!globalStats) {
      return {
        apy: "0.00",
        rewardRate: "0.00000000",
        secondlyReward: "0",
        dailyReward: "0",
        monthlyReward: "0",
      };
    }

    const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60; // 31,536,000
    const rewardRate = BigInt(globalStats.reward_rate);
    const totalStaked = BigInt(globalStats.total_staked);

    // Avoid division by zero
    if (totalStaked === BigInt(0)) {
      return {
        apy: "0.00",
        rewardRate: (Number(rewardRate) / 1000000000).toFixed(8),
        secondlyReward: "0",
        dailyReward: "0",
        monthlyReward: "0",
      };
    }

    // Calculate APY
    const yearlyRewards = Number(rewardRate) * SECONDS_PER_YEAR;
    const apy = (yearlyRewards / Number(totalStaked)) * 100;

    // Calculate various reward periods
    const secondlyReward = Number(rewardRate) / 1000000000;
    const dailyReward = secondlyReward * 86400;
    const monthlyReward = dailyReward * 30;

    return {
      apy: apy.toFixed(2),
      rewardRate: (Number(rewardRate) / 1000000000).toFixed(8),
      secondlyReward: secondlyReward.toFixed(8),
      dailyReward: dailyReward.toFixed(8),
      monthlyReward: monthlyReward.toFixed(6),
    };
  }, [globalStats]);
}

/**
 * Hook for transaction state management
 */
export type TransactionState = "idle" | "signing" | "pending" | "confirmed" | "failed" | "error";

interface TransactionRecord {
  type: "stake" | "unstake" | "claim" | "compound";
  amount?: string;
  timestamp: Date;
  hash?: string;
  status: TransactionState;
  error?: string;
}

export function useTransactionHistory(maxRecords: number = 10) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  const addTransaction = useCallback(
    (record: Omit<TransactionRecord, "timestamp">) => {
      setTransactions((prev) => [
        { ...record, timestamp: new Date() },
        ...prev.slice(0, maxRecords - 1),
      ]);
    },
    [maxRecords]
  );

  const updateTransaction = useCallback(
    (index: number, updates: Partial<TransactionRecord>) => {
      setTransactions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearHistory,
  };
}

/**
 * Hook for debouncing refresh operations
 */
export function useDebouncedRefresh(
  refreshFn: () => Promise<void>,
  delayMs: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedRefresh = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsRefreshing(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        await refreshFn();
      } finally {
        setIsRefreshing(false);
      }
    }, delayMs);
  }, [refreshFn, delayMs]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debouncedRefresh, isRefreshing, cancel };
}

/**
 * Hook for error classification and user messaging
 */
export enum ErrorType {
  INSUFFICIENT_BALANCE = "insufficient_balance",
  INSUFFICIENT_STAKE = "insufficient_stake",
  INVALID_AMOUNT = "invalid_amount",
  NETWORK_ERROR = "network_error",
  SIGNATURE_REJECTED = "signature_rejected",
  CONTRACT_ERROR = "contract_error",
  TIMEOUT = "timeout",
  UNKNOWN = "unknown",
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
}

export function useErrorHandler() {
  const classifyError = useCallback((error: Error | string): ErrorInfo => {
    const message = (typeof error === "string" ? error : error.message).toLowerCase();

    let type = ErrorType.UNKNOWN;
    let userMessage = "An error occurred. Please try again.";
    let recoverable = false;

    if (message.includes("insufficient balance")) {
      type = ErrorType.INSUFFICIENT_BALANCE;
      userMessage = "You don't have enough tokens to complete this operation.";
      recoverable = true;
    } else if (message.includes("insufficient staked")) {
      type = ErrorType.INSUFFICIENT_STAKE;
      userMessage = "You don't have enough staked tokens for this operation.";
      recoverable = true;
    } else if (message.includes("invalid amount")) {
      type = ErrorType.INVALID_AMOUNT;
      userMessage = "Please enter a valid amount.";
      recoverable = true;
    } else if (message.includes("network") || message.includes("timeout")) {
      type = ErrorType.NETWORK_ERROR;
      userMessage = "Network error. Please check your connection and try again.";
      recoverable = true;
    } else if (message.includes("rejected") || message.includes("denied")) {
      type = ErrorType.SIGNATURE_REJECTED;
      userMessage = "You rejected the transaction. No changes were made.";
      recoverable = true;
    } else if (message.includes("contract")) {
      type = ErrorType.CONTRACT_ERROR;
      userMessage = "Smart contract error. Please try again later.";
      recoverable = false;
    }

    return {
      type,
      message: typeof error === "string" ? error : error.message,
      userMessage,
      recoverable,
    };
  }, []);

  return { classifyError };
}
