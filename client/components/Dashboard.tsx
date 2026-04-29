"use client";

import { useEffect, useState } from "react";
import { getGlobalStats, getStakerInfo } from "@/hooks/contract";
import { formatAmount } from "@/hooks/transactionUtils";

interface DashboardProps {
  walletAddress: string;
}

interface Metrics {
  dailyAPY: number;
  weeklyEarnings: number;
  monthlyProjection: number;
  nextRewardTime: number;
}

export function Dashboard({ walletAddress }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    dailyAPY: 0,
    weeklyEarnings: 0,
    monthlyProjection: 0,
    nextRewardTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMetrics = async () => {
      try {
        const [stakerInfo, globalStats] = await Promise.all([
          getStakerInfo(walletAddress),
          getGlobalStats(),
        ]);

        // Calculate APY (Annual Percentage Yield)
        const rewardRate = Number(globalStats.reward_rate) / 10000000; // Convert from stroops
        const totalStaked = Number(globalStats.total_staked) / 10000000;
        const dailyRewards = rewardRate * 86400; // Rewards per day
        const dailyAPY = totalStaked > 0 ? (dailyRewards / totalStaked) * 365 * 100 : 0;

        // Calculate earnings projections
        const userStaked = stakerInfo ? Number(stakerInfo.staked) / 10000000 : 0;
        const userShare = totalStaked > 0 ? userStaked / totalStaked : 0;
        const userDailyRewards = dailyRewards * userShare;

        setMetrics({
          dailyAPY,
          weeklyEarnings: userDailyRewards * 7,
          monthlyProjection: userDailyRewards * 30,
          nextRewardTime: stakerInfo ? calculateNextClaimTime(stakerInfo) : 0,
        });
      } catch (error) {
        console.error("Failed to calculate metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      calculateMetrics();
      // Update every 30 seconds
      const interval = setInterval(calculateMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-6 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        label="Daily APY"
        value={`${metrics.dailyAPY.toFixed(2)}%`}
        icon="📈"
      />
      <MetricCard
        label="Weekly Earnings"
        value={`${formatAmount(metrics.weeklyEarnings.toString())} TOKEN`}
        icon="💰"
      />
      <MetricCard
        label="Monthly Projection"
        value={`${formatAmount(metrics.monthlyProjection.toString())} TOKEN`}
        icon="📅"
      />
      <MetricCard
        label="Next Reward"
        value={formatTime(metrics.nextRewardTime)}
        icon="⏰"
      />
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-4 hover:border-blue-500/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function calculateNextClaimTime(stakerInfo: { last_reward_per_token?: string } | null): number {
  // This is a simplified calculation - in reality you'd need to track last claim time
  // For now, we'll assume rewards are claimable every 24 hours
  const lastClaimTime = Date.now() - (Math.random() * 24 * 60 * 60 * 1000); // Mock last claim
  const nextClaimTime = lastClaimTime + (24 * 60 * 60 * 1000); // 24 hours later
  return Math.max(0, nextClaimTime - Date.now());
}

function formatTime(ms: number): string {
  if (ms <= 0) return "Ready to claim";

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}