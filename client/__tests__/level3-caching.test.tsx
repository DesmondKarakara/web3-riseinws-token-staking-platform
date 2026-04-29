/**
 * Level 3: Caching System Tests
 * Tests for the enhanced useStakingData hook with caching
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStakingData } from '@/hooks/useStakingData';
import { getStakerInfo, getGlobalStats } from '@/hooks/contract';

// Mock the contract hooks
jest.mock('@/hooks/contract', () => ({
  getStakerInfo: jest.fn(),
  getGlobalStats: jest.fn(),
}));

const mockStakerInfo = {
  staked: '100000000',
  pending_rewards: '5000000',
  last_reward_per_token: '1000000',
};

const mockGlobalStats = {
  total_staked: '1000000000',
  staker_count: '5',
  reward_rate: '1000000000',
};

describe('Level 3: Enhanced Caching System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    (getStakerInfo as jest.Mock).mockResolvedValue(mockStakerInfo);
    (getGlobalStats as jest.Mock).mockResolvedValue(mockGlobalStats);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Caching', () => {
    test('caches staker info with TTL', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 5000 })
      );

      // Initial load
      await waitFor(() => {
        expect(result.current.stakerInfo).toEqual(mockStakerInfo);
      });

      // Should use cache on second call
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledTimes(1); // Still cached
      });

      // Advance time past TTL
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledTimes(2); // Cache expired
      });
    });

    test('caches global stats separately', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 5000 })
      );

      await waitFor(() => {
        expect(result.current.globalStats).toEqual(mockGlobalStats);
      });

      expect(getGlobalStats).toHaveBeenCalledTimes(1);

      // Second hook instance should use cache
      const { result: result2 } = renderHook(() =>
        useStakingData('GA456...', { cacheTtl: 5000 })
      );

      await waitFor(() => {
        expect(result2.current.globalStats).toEqual(mockGlobalStats);
      });

      // Global stats should still be cached
      expect(getGlobalStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Background Refresh', () => {
    test('performs background refresh for cached data', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          cacheTtl: 5000,
          backgroundRefresh: true
        })
      );

      // Initial load
      await waitFor(() => {
        expect(result.current.stakerInfo).toEqual(mockStakerInfo);
      });

      // Simulate time passing for background refresh
      act(() => {
        jest.advanceTimersByTime(1100); // Background refresh delay
      });

      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledTimes(2); // Background refresh
      });
    });

    test('updates UI when background refresh completes', async () => {
      const updatedStakerInfo = { ...mockStakerInfo, staked: '200000000' };

      (getStakerInfo as jest.Mock)
        .mockResolvedValueOnce(mockStakerInfo)
        .mockResolvedValueOnce(updatedStakerInfo);

      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          cacheTtl: 5000,
          backgroundRefresh: true
        })
      );

      // Initial load
      await waitFor(() => {
        expect(result.current.stakerInfo?.staked).toBe('100000000');
      });

      // Background refresh
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(result.current.stakerInfo?.staked).toBe('200000000');
      });
    });
  });

  describe('Cache Management', () => {
    test('clearCache removes all cached data', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 5000 })
      );

      await waitFor(() => {
        expect(result.current.stakerInfo).toBeDefined();
      });

      act(() => {
        result.current.clearCache();
      });

      act(() => {
        result.current.refresh();
      });

      // Should fetch fresh data after cache clear
      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledTimes(2);
      });
    });

    test('tracks cache hits', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 5000 })
      );

      await waitFor(() => {
        expect(result.current.cacheHits).toBeGreaterThan(0);
      });
    });
  });

  describe('Auto-refresh', () => {
    test('auto-refreshes at specified interval', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          interval: 2000,
          cacheTtl: 5000
        })
      );

      await waitFor(() => {
        expect(result.current.stakerInfo).toBeDefined();
      });

      // Advance time to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledTimes(2);
      });
    });

    test('respects autoRefreshEnabled flag', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          interval: 2000,
          cacheTtl: 5000
        })
      );

      await waitFor(() => {
        expect(result.current.stakerInfo).toBeDefined();
      });

      // Disable auto-refresh
      act(() => {
        result.current.setAutoRefreshEnabled(false);
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have auto-refreshed
      expect(getStakerInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      (getStakerInfo as jest.Mock).mockRejectedValue(new Error('API Error'));

      const mockOnError = jest.fn();

      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          onError: mockOnError
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    test('calls success callback on successful fetch', async () => {
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() =>
        useStakingData('GA123...', {
          onSuccess: mockOnSuccess
        })
      );

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          staker: mockStakerInfo,
          global: mockGlobalStats,
        });
      });
    });
  });

  describe('Performance Metrics', () => {
    test('tracks time since last update', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 5000 })
      );

      await waitFor(() => {
        expect(result.current.lastUpdated).toBeDefined();
      });

      const initialTime = result.current.timeSinceUpdate;

      // Advance time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeSinceUpdate).toBe(initialTime! + 1);
    });

    test('detects stale data', async () => {
      const { result } = renderHook(() =>
        useStakingData('GA123...', { cacheTtl: 2000 })
      );

      await waitFor(() => {
        expect(result.current.isStale).toBe(false);
      });

      // Advance past TTL
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.isStale).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('cleans up intervals on unmount', () => {
      const { unmount } = renderHook(() =>
        useStakingData('GA123...', { interval: 1000 })
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test('handles wallet address changes', async () => {
      const { result, rerender } = renderHook(
        ({ address }) => useStakingData(address, { cacheTtl: 5000 }),
        { initialProps: { address: 'GA123...' } }
      );

      await waitFor(() => {
        expect(result.current.stakerInfo).toBeDefined();
      });

      // Change wallet address
      rerender({ address: 'GA456...' });

      await waitFor(() => {
        expect(getStakerInfo).toHaveBeenCalledWith('GA456...');
      });
    });
  });
});