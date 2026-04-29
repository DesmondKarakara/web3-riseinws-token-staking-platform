"use client";

import { useState, useCallback, useEffect } from "react";
import {
  stake,
  unstake,
  claimRewards,
  compoundStake,
  getStakerInfo,
  getGlobalStats,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  validateStakeAmount,
  sanitizeError,
  stakeRateLimiter,
  unstakeRateLimiter,
  claimRateLimiter,
  validateTransactionAmount
} from "@/lib/security";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9 12h6" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

// ── Progress Indicator ──────────────────────────────────────

function ProgressIndicator({
  steps,
  currentStep,
  isActive = false
}: {
  steps: string[];
  currentStep: number;
  isActive?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Transaction Progress
        </span>
        <span className="text-xs text-white/30">
          {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium transition-all ${
              index < currentStep
                ? "border-[#34d399] bg-[#34d399]/10 text-[#34d399]"
                : index === currentStep && isActive
                ? "border-[#7c6cf0] bg-[#7c6cf0]/10 text-[#7c6cf0] animate-pulse"
                : "border-white/10 bg-white/5 text-white/30"
            }`}>
              {index < currentStep ? (
                <CheckIcon />
              ) : index === currentStep && isActive ? (
                <SpinnerIcon />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-sm transition-colors ${
              index <= currentStep
                ? "text-white/70"
                : "text-white/30"
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {isActive && (
        <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c6cf0] to-[#4fc3f7] transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Enhanced Loading States ──────────────────────────────────

function TransactionStatus({
  status,
  progressSteps,
  currentStep,
  isActive
}: {
  status: string | null;
  progressSteps?: string[];
  currentStep?: number;
  isActive?: boolean;
}) {
  if (!status && !progressSteps) return null;

  return (
    <div className="space-y-4">
      {status && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex h-8 w-8 items-center justify-center">
            {status.includes("success") ? (
              <CheckIcon />
            ) : status.includes("error") || status.includes("failed") ? (
              <AlertIcon />
            ) : (
              <SpinnerIcon />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/90">{status}</p>
            {status.includes("success") && (
              <p className="text-xs text-white/50 mt-1">
                Transaction confirmed on Stellar testnet
              </p>
            )}
          </div>
        </div>
      )}

      {progressSteps && currentStep !== undefined && (
        <ProgressIndicator
          steps={progressSteps}
          currentStep={currentStep}
          isActive={isActive}
        />
      )}
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  color,
}: {
  name: string;
  params: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "stake" | "unstake" | "rewards" | "stats";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("stake");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isUnstaking, setIsUnstaking] = useState(false);

  const [compoundAmount, setCompoundAmount] = useState("");
  const [isCompounding, setIsCompounding] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stakerInfo, setStakerInfo] = useState<{ staked: string; pending_rewards: string; last_reward_per_token: string } | null>(null);
  const [globalStats, setGlobalStats] = useState<{ total_staked: string; staker_count: string; reward_rate: string } | null>(null);

  // Enhanced transaction progress tracking
  const [txProgress, setTxProgress] = useState<{
    steps: string[];
    currentStep: number;
    isActive: boolean;
  } | null>(null);

  const stakeSteps = ["Validating input", "Preparing transaction", "Awaiting signature", "Submitting to network", "Confirming transaction"];
  const unstakeSteps = ["Validating input", "Checking balance", "Preparing transaction", "Awaiting signature", "Submitting to network", "Confirming transaction"];
  const claimSteps = ["Checking rewards", "Preparing transaction", "Awaiting signature", "Submitting to network", "Confirming transaction"];

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatAmount = (val: string | undefined) => {
    if (!val) return "0";
    const n = BigInt(val);
    const divisor = BigInt(10000000);
    const whole = n / divisor;
    const fraction = n % divisor;
    if (fraction === BigInt(0)) return whole.toString();
    return `${whole}.${fraction.toString().padStart(7, "0").slice(0, 4)}`;
  };

  const refreshData = useCallback(async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);
    try {
      const [info, stats] = await Promise.all([
        getStakerInfo(walletAddress),
        getGlobalStats(),
      ]);
      if (info) setStakerInfo(info as typeof stakerInfo);
      if (stats) setGlobalStats(stats as typeof globalStats);
    } catch {
      /* ignore */
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) refreshData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [walletAddress, refreshData]);

  const handleStake = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");

    // Validate input
    const validation = validateStakeAmount(stakeAmount);
    if (!validation.valid) {
      return setError(validation.error || "Invalid input");
    }

    // Check rate limiting
    if (!stakeRateLimiter.canExecute(walletAddress)) {
      const remainingTime = stakeRateLimiter.getRemainingTime(walletAddress);
      return setError(`Please wait ${Math.ceil(remainingTime / 1000)} seconds before staking again`);
    }

    // Check transaction amount against user balance (simplified check)
    if (stakerInfo) {
      const amount = BigInt(Math.floor(Number(stakeAmount) * 10000000));
      // For simplicity, assume user has enough balance - in real app check wallet balance
      const validation2 = validateTransactionAmount(amount, BigInt("1000000000000")); // Mock large balance
      if (!validation2.valid) {
        return setError(validation2.error || "Invalid transaction amount");
      }
    }

    setError(null);
    setIsStaking(true);
    setTxProgress({ steps: stakeSteps, currentStep: 0, isActive: true });
    setTxStatus("Validating transaction...");

    try {
      stakeRateLimiter.recordAction(walletAddress);

      // Step 1: Validating input
      setTxProgress(prev => prev ? { ...prev, currentStep: 0 } : null);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Preparing transaction
      setTxProgress(prev => prev ? { ...prev, currentStep: 1 } : null);
      setTxStatus("Preparing transaction...");
      const amount = BigInt(Math.floor(Number(stakeAmount) * 10000000));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Awaiting signature
      setTxProgress(prev => prev ? { ...prev, currentStep: 2 } : null);
      setTxStatus("Awaiting signature...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Submitting to network
      setTxProgress(prev => prev ? { ...prev, currentStep: 3 } : null);
      setTxStatus("Submitting to network...");
      await stake(walletAddress, amount);

      // Step 5: Confirming transaction
      setTxProgress(prev => prev ? { ...prev, currentStep: 4 } : null);
      setTxStatus("Confirming transaction...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTxStatus("Tokens staked successfully!");
      setStakeAmount("");
      await refreshData();

      // Clear progress after success
      setTimeout(() => {
        setTxStatus(null);
        setTxProgress(null);
      }, 3000);

    } catch (err: unknown) {
      const sanitizedError = sanitizeError(err instanceof Error ? err : new Error(String(err)));
      setError(sanitizedError);
      setTxStatus(null);
      setTxProgress(null);
    } finally {
      setIsStaking(false);
    }
  }, [walletAddress, stakeAmount, stakerInfo, refreshData]);

  const handleUnstake = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");

    // Validate input
    const validation = validateStakeAmount(unstakeAmount);
    if (!validation.valid) {
      return setError(validation.error || "Invalid input");
    }

    // Check rate limiting
    if (!unstakeRateLimiter.canExecute(walletAddress)) {
      const remainingTime = unstakeRateLimiter.getRemainingTime(walletAddress);
      return setError(`Please wait ${Math.ceil(remainingTime / 1000)} seconds before unstaking again`);
    }

    // Check if user has enough staked tokens
    if (stakerInfo) {
      const amount = BigInt(Math.floor(Number(unstakeAmount) * 10000000));
      const userStaked = BigInt(stakerInfo.staked);
      const validation2 = validateTransactionAmount(amount, userStaked);
      if (!validation2.valid) {
        return setError(validation2.error || "Invalid transaction amount");
      }
    }

    setError(null);
    setIsUnstaking(true);
    setTxStatus("Validating transaction...");

    try {
      unstakeRateLimiter.recordAction(walletAddress);

      const amount = BigInt(Math.floor(Number(unstakeAmount) * 10000000));
      setTxStatus("Awaiting signature...");
      await unstake(walletAddress, amount);

      setTxStatus("Tokens unstaked successfully!");
      setUnstakeAmount("");
      await refreshData();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      const sanitizedError = sanitizeError(err instanceof Error ? err : new Error(String(err)));
      setError(sanitizedError);
      setTxStatus(null);
    } finally {
      setIsUnstaking(false);
    }
  }, [walletAddress, unstakeAmount, stakerInfo, refreshData]);

  const handleClaim = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");

    // Check rate limiting
    if (!claimRateLimiter.canExecute(walletAddress)) {
      const remainingTime = claimRateLimiter.getRemainingTime(walletAddress);
      return setError(`Please wait ${Math.ceil(remainingTime / 1000)} seconds before claiming again`);
    }

    setError(null);
    setIsClaiming(true);
    setTxStatus("Validating transaction...");

    try {
      claimRateLimiter.recordAction(walletAddress);

      setTxStatus("Awaiting signature...");
      await claimRewards(walletAddress);

      setTxStatus("Rewards claimed successfully!");
      await refreshData();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      const sanitizedError = sanitizeError(err instanceof Error ? err : new Error(String(err)));
      setError(sanitizedError);
      setTxStatus(null);
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, refreshData]);

  const handleCompound = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");

    // Validate compound amount if provided
    if (compoundAmount) {
      const validation = validateStakeAmount(compoundAmount);
      if (!validation.valid) {
        return setError(validation.error || "Invalid input");
      }
    }

    // Check rate limiting
    if (!claimRateLimiter.canExecute(walletAddress)) {
      const remainingTime = claimRateLimiter.getRemainingTime(walletAddress);
      return setError(`Please wait ${Math.ceil(remainingTime / 1000)} seconds before compounding again`);
    }

    setError(null);
    setIsCompounding(true);
    setTxStatus("Validating transaction...");

    try {
      claimRateLimiter.recordAction(walletAddress);

      const amount = compoundAmount
        ? BigInt(Math.floor(Number(compoundAmount) * 10000000))
        : BigInt(0);

      setTxStatus("Awaiting signature...");
      await compoundStake(walletAddress, amount);

      setTxStatus("Compounded successfully!");
      setCompoundAmount("");
      await refreshData();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      const sanitizedError = sanitizeError(err instanceof Error ? err : new Error(String(err)));
      setError(sanitizedError);
      setTxStatus(null);
    } finally {
      setIsCompounding(false);
    }
  }, [walletAddress, compoundAmount, refreshData]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "stake", label: "Stake", icon: <ArrowUpIcon />, color: "#34d399" },
    { key: "unstake", label: "Unstake", icon: <ArrowDownIcon />, color: "#f87171" },
    { key: "rewards", label: "Rewards", icon: <ZapIcon />, color: "#fbbf24" },
    { key: "stats", label: "Stats", icon: <CoinIcon />, color: "#7c6cf0" },
  ];

  const rewardRate = globalStats?.reward_rate;
  const apyDisplay = rewardRate ? (Number(rewardRate) * 31536000 / 1000000000).toFixed(2) : "0.00";

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Enhanced Transaction Status */}
      <TransactionStatus
        status={txStatus}
        progressSteps={txProgress?.steps}
        currentStep={txProgress?.currentStep}
        isActive={txProgress?.isActive}
      />

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#34d399]/20 to-[#fbbf24]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#34d399]">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v8M9 12h6" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Token Staking</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                {apyDisplay}% APY
              </Badge>
              <Badge variant="info">Soroban</Badge>
            </div>
          </div>

          {/* My Position Banner */}
          {walletAddress && stakerInfo && (
            <div className="mx-6 mt-4 rounded-xl border border-[#7c6cf0]/10 bg-gradient-to-r from-[#7c6cf0]/[0.06] to-[#4fc3f7]/[0.06] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Staked</p>
                  <p className="font-mono text-sm font-semibold text-white/90">{formatAmount(stakerInfo.staked)}</p>
                </div>
                <div className="h-8 w-px bg-white/[0.06]" />
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">Pending Rewards</p>
                  <p className="font-mono text-sm font-semibold text-[#fbbf24]">{formatAmount(stakerInfo.pending_rewards)}</p>
                </div>
              </div>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <RefreshIcon />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2 mt-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-5">
            {/* Stake */}
            {activeTab === "stake" && (
              <div className="space-y-5">
                <MethodSignature name="stake" params="(staker: Address, amount: i128)" color="#34d399" />
                <Input
                  label="Amount to Stake"
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  suffix="TOKEN"
                />
                <p className="text-[10px] text-white/15 -mt-2">
                  Note: Approve the staking contract to spend your tokens first, then stake.
                </p>
                {walletAddress ? (
                  <ShimmerButton onClick={handleStake} disabled={isStaking} shimmerColor="#34d399" className="w-full">
                    {isStaking ? <><SpinnerIcon /> Staking...</> : <><ArrowUpIcon /> Stake Tokens</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to stake
                  </button>
                )}
              </div>
            )}

            {/* Unstake */}
            {activeTab === "unstake" && (
              <div className="space-y-5">
                <MethodSignature name="unstake" params="(staker: Address, amount: i128)" color="#f87171" />
                <Input
                  label="Amount to Unstake"
                  type="number"
                  placeholder="0.0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  suffix="TOKEN"
                />
                <p className="text-[10px] text-white/15 -mt-2">
                  Unstaking includes your pending rewards automatically.
                </p>
                {walletAddress ? (
                  <ShimmerButton onClick={handleUnstake} disabled={isUnstaking} shimmerColor="#f87171" className="w-full">
                    {isUnstaking ? <><SpinnerIcon /> Unstaking...</> : <><ArrowDownIcon /> Unstake Tokens</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#f87171]/20 bg-[#f87171]/[0.03] py-4 text-sm text-[#f87171]/60 hover:border-[#f87171]/30 hover:text-[#f87171]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to unstake
                  </button>
                )}
              </div>
            )}

            {/* Rewards */}
            {activeTab === "rewards" && (
              <div className="space-y-5">
                <MethodSignature name="claim_rewards" params="(staker: Address)" color="#fbbf24" />
                <MethodSignature name="compound_stake" params="(staker: Address, extra: i128)" color="#fbbf24" />

                {/* Reward Preview */}
                <div className="rounded-xl border border-[#fbbf24]/10 bg-[#fbbf24]/[0.04] px-4 py-3">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Pending Rewards</p>
                  <p className="font-mono text-2xl font-bold text-[#fbbf24]">
                    {formatAmount(stakerInfo?.pending_rewards)} <span className="text-sm text-white/30">TOKEN</span>
                  </p>
                </div>

                <Input
                  label="Extra Stake (optional)"
                  type="number"
                  placeholder="0.0"
                  value={compoundAmount}
                  onChange={(e) => setCompoundAmount(e.target.value)}
                  suffix="TOKEN"
                />
                <p className="text-[10px] text-white/15 -mt-2">
                  Compound reinvests your rewards + any extra amount you add.
                </p>

                <div className="flex gap-3">
                  {walletAddress ? (
                    <>
                      <ShimmerButton onClick={handleClaim} disabled={isClaiming} shimmerColor="#fbbf24" className="flex-1">
                        {isClaiming ? <><SpinnerIcon /> Claiming...</> : <><ZapIcon /> Claim</>}
                      </ShimmerButton>
                      <ShimmerButton onClick={handleCompound} disabled={isCompounding} shimmerColor="#fbbf24" className="flex-1">
                        {isCompounding ? <><SpinnerIcon /> Compounding...</> : <><RefreshIcon /> Compound</>}
                      </ShimmerButton>
                    </>
                  ) : (
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      Connect wallet to claim
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            {activeTab === "stats" && (
              <div className="space-y-5">
                <MethodSignature name="get_global_stats" params="() -> GlobalStats" color="#7c6cf0" />

                {/* Global Stats */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="border-b border-white/[0.04] px-4 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">Platform Stats</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#7c6cf0]" />
                        <span className="text-xs text-white/40">Total Staked</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white/80">
                        {formatAmount(globalStats?.total_staked)} TOKEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#4fc3f7]" />
                        <span className="text-xs text-white/40">Stakers</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white/80">
                        {globalStats?.staker_count ?? "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
                        <span className="text-xs text-white/40">Reward Rate</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white/80">
                        {rewardRate ? (Number(rewardRate) / 1000000000).toFixed(8) : "0"} / sec
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
                        <span className="text-xs text-white/40">Est. APY</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#34d399]">
                        {apyDisplay}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* My Position */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="border-b border-white/[0.04] px-4 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/25 flex items-center gap-1.5">
                      <UserIcon /> Your Position
                    </p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Staked Amount</span>
                      <span className="font-mono text-sm font-semibold text-white/80">
                        {formatAmount(stakerInfo?.staked)} TOKEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Pending Rewards</span>
                      <span className="font-mono text-sm font-semibold text-[#fbbf24]">
                        {formatAmount(stakerInfo?.pending_rewards)} TOKEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Total Earnable</span>
                      <span className="font-mono text-sm font-bold text-white/90">
                        {stakerInfo
                          ? formatAmount(
                              (BigInt(stakerInfo.staked) + BigInt(stakerInfo.pending_rewards)).toString()
                            )
                          : "0"} TOKEN
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={refreshData}
                  disabled={isRefreshing || !walletAddress}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-xs text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshIcon />
                  Refresh Data
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Token Staking &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Permissionless", "Auto-rewards", "Compound"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
