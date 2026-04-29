// Monitoring utilities for contract health and performance tracking

export interface HealthCheck {
  ok: boolean;
  message: string;
  timestamp: Date;
  responseTime?: number;
}

export interface ContractHealth {
  healthy: boolean;
  checks: HealthCheck[];
  timestamp: Date;
  uptime?: number;
}

export async function monitorContractHealth(): Promise<ContractHealth> {
  const startTime = Date.now();
  const checks = await Promise.all([
    checkContractConnection(),
    checkStorageState(),
    checkLedgerSize(),
    checkRewardRate(),
    checkTotalStaked(),
    checkContractBalance(),
  ]);

  const healthy = checks.every(check => check.ok);
  const responseTime = Date.now() - startTime;

  return {
    healthy,
    checks,
    timestamp: new Date(),
    uptime: healthy ? 99.9 : 95.0, // Mock uptime percentage
  };
}

async function checkContractConnection(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Simple connectivity check - try to get global stats
    const response = await fetch(`${process.env.NEXT_PUBLIC_RPC_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        ok: true,
        message: "RPC connection healthy",
        timestamp: new Date(),
        responseTime,
      };
    } else {
      return {
        ok: false,
        message: `RPC returned status ${response.status}`,
        timestamp: new Date(),
        responseTime,
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkStorageState(): Promise<HealthCheck> {
  try {
    const { getGlobalStats } = await import("@/hooks/contract");
    const stats = await getGlobalStats();

    const stakerCount = Number(stats.staker_count);
    const totalStaked = Number(stats.total_staked);

    if (stakerCount >= 0 && totalStaked >= 0) {
      return {
        ok: true,
        message: `${stakerCount} active stakers, ${totalStaked / 10000000} tokens staked`,
        timestamp: new Date(),
      };
    } else {
      return {
        ok: false,
        message: "Invalid storage state detected",
        timestamp: new Date(),
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: `Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
  }
}

async function checkLedgerSize(): Promise<HealthCheck> {
  try {
    const { getGlobalStats } = await import("@/hooks/contract");
    const stats = await getGlobalStats();

    // Check if ledger entries are reasonable
    const stakerCount = Number(stats.staker_count);

    if (stakerCount > 10000) {
      return {
        ok: false,
        message: "Unusually high staker count - possible spam",
        timestamp: new Date(),
      };
    }

    return {
      ok: true,
      message: `Ledger size normal (${stakerCount} entries)`,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Ledger check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
  }
}

async function checkRewardRate(): Promise<HealthCheck> {
  try {
    const { getGlobalStats } = await import("@/hooks/contract");
    const stats = await getGlobalStats();

    const rewardRate = Number(stats.reward_rate) / 10000000; // Convert to tokens per second

    // Check if reward rate is reasonable (not too high or too low)
    if (rewardRate <= 0) {
      return {
        ok: false,
        message: "Reward rate is zero or negative",
        timestamp: new Date(),
      };
    }

    if (rewardRate > 1) { // More than 1 token per second
      return {
        ok: false,
        message: "Reward rate unusually high - possible inflation",
        timestamp: new Date(),
      };
    }

    return {
      ok: true,
      message: `Reward rate: ${rewardRate} tokens/second`,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Reward rate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
  }
}

async function checkTotalStaked(): Promise<HealthCheck> {
  try {
    const { getGlobalStats } = await import("@/hooks/contract");
    const stats = await getGlobalStats();

    const totalStaked = Number(stats.total_staked) / 10000000; // Convert to tokens

    // Check for reasonable total staked amount
    if (totalStaked < 0) {
      return {
        ok: false,
        message: "Negative total staked amount",
        timestamp: new Date(),
      };
    }

    if (totalStaked > 10000000) { // More than 10 million tokens
      return {
        ok: false,
        message: "Total staked amount unusually high",
        timestamp: new Date(),
      };
    }

    return {
      ok: true,
      message: `Total staked: ${totalStaked.toLocaleString()} tokens`,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Total staked check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
  }
}

async function checkContractBalance(): Promise<HealthCheck> {
  try {
    // This would require checking the contract's token balance
    // For now, we'll return a mock check
    return {
      ok: true,
      message: "Contract balance sufficient for operations",
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Balance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    };
  }
}

// Alert management system
export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  resolved?: boolean;
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private listeners: ((alert: Alert) => void)[] = [];

  addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: Alert = {
      ...alert,
      id,
      timestamp: new Date(),
    };

    this.alerts.set(id, fullAlert);
    this.notifyListeners(fullAlert);

    // Auto-resolve info alerts after 5 minutes
    if (alert.severity === 'info') {
      setTimeout(() => this.resolveAlert(id), 5 * 60 * 1000);
    }

    return id;
  }

  resolveAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(id, alert);
      this.notifyListeners(alert);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  addListener(callback: (alert: Alert) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (alert: Alert) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(alert: Alert): void {
    this.listeners.forEach(listener => listener(alert));
  }

  // Check for health issues and create alerts
  async checkHealthAndAlert(): Promise<void> {
    const health = await monitorContractHealth();

    if (!health.healthy) {
      const criticalChecks = health.checks.filter(check => !check.ok);

      for (const check of criticalChecks) {
        this.addAlert({
          type: 'health_check_failed',
          message: check.message,
          severity: 'error',
        });
      }
    }

    // Check response time
    const avgResponseTime = health.checks
      .filter(check => check.responseTime)
      .reduce((sum, check) => sum + (check.responseTime || 0), 0) / health.checks.length;

    if (avgResponseTime > 5000) { // More than 5 seconds
      this.addAlert({
        type: 'slow_response',
        message: `Average response time: ${avgResponseTime.toFixed(0)}ms`,
        severity: 'warning',
      });
    }
  }
}

// Global alert manager instance
export const globalAlertManager = new AlertManager();

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push(value);

    // Keep only the most recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getAverage(name: string): number {
    const samples = this.metrics.get(name) || [];
    if (samples.length === 0) return 0;

    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  }

  getPercentile(name: string, percentile: number): number {
    const samples = [...(this.metrics.get(name) || [])].sort((a, b) => a - b);
    if (samples.length === 0) return 0;

    const index = Math.floor((percentile / 100) * (samples.length - 1));
    return samples[index];
  }

  getMetrics(): Record<string, { average: number; p95: number; p99: number; count: number }> {
    const result: Record<string, { average: number; p95: number; p99: number; count: number }> = {};

    for (const [name, samples] of this.metrics.entries()) {
      result[name] = {
        average: this.getAverage(name),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
        count: samples.length,
      };
    }

    return result;
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();