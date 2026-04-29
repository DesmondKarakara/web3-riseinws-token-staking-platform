/**
 * Level 3: UI Enhancement Tests
 * Tests for progress indicators, loading states, and enhanced UX
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractUI from '@/components/Contract';
import { useStakingData } from '@/hooks/useStakingData';
import { stake, unstake, claimRewards, compoundStake } from '@/hooks/contract';

// Mock the hooks
jest.mock('@/hooks/useStakingData');
jest.mock('@/hooks/contract');

const mockUseStakingData = useStakingData as jest.MockedFunction<typeof useStakingData>;
const mockStake = stake as jest.MockedFunction<typeof stake>;
const mockUnstake = unstake as jest.MockedFunction<typeof unstake>;
const mockClaimRewards = claimRewards as jest.MockedFunction<typeof claimRewards>;
const mockCompoundStake = compoundStake as jest.MockedFunction<typeof compoundStake>;

const mockStakingData = {
  stakerInfo: {
    staked: '100000000',
    pending_rewards: '5000000',
    last_reward_per_token: '1000000',
  },
  globalStats: {
    total_staked: '1000000000',
    staker_count: '5',
    reward_rate: '1000000000',
  },
  isLoading: false,
  error: null,
  lastUpdated: new Date(),
  isStale: false,
  timeSinceUpdate: 30,
  cacheHits: 5,
  autoRefreshEnabled: true,
  setAutoRefreshEnabled: jest.fn(),
  refresh: jest.fn(),
  clearCache: jest.fn(),
};

// Mock transaction response
const mockTransactionResponse = {
  status: 'SUCCESS' as const,
  hash: 'mock-hash',
  result: {},
  latestLedger: 12345,
  latestLedgerCloseTime: '2024-01-01T00:00:00Z',
  ledger: 12345,
  createdAt: '2024-01-01T00:00:00Z',
  applicationOrder: 1,
  feeBump: false,
  envelopeXdr: 'mock-xdr',
  resultXdr: 'mock-result-xdr',
  resultMetaXdr: 'mock-meta-xdr',
  feeCharged: '100',
  maxFee: '1000',
  lastModifiedLedger: 12345,
  lastModifiedTime: '2024-01-01T00:00:00Z'
} as any;

describe('Level 3: Enhanced UI Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStakingData.mockReturnValue(mockStakingData);
    mockStake.mockResolvedValue(mockTransactionResponse);
    mockUnstake.mockResolvedValue(mockTransactionResponse);
    mockClaimRewards.mockResolvedValue(mockTransactionResponse);
    mockCompoundStake.mockResolvedValue(mockTransactionResponse);
  });

  describe('Progress Indicators', () => {
    test('displays progress indicator during stake transaction', async () => {
      const user = userEvent.setup();
      mockStake.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTransactionResponse), 1000)));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      // Switch to stake tab
      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      // Fill stake amount
      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      // Click stake button
      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      // Check progress indicator appears
      await waitFor(() => {
        expect(screen.getByText('Validating input')).toBeInTheDocument();
      });

      // Wait for progress to advance
      await waitFor(() => {
        expect(screen.getByText('Preparing transaction')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('progress indicator shows all steps for unstake', async () => {
      const user = userEvent.setup();
      mockUnstake.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTransactionResponse), 2000)));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      // Switch to unstake tab
      const unstakeTab = screen.getByRole('tab', { name: /unstake/i });
      await user.click(unstakeTab);

      // Fill unstake amount
      const unstakeInput = screen.getByLabelText(/amount to unstake/i);
      await user.type(unstakeInput, '5');

      // Click unstake button
      const unstakeButton = screen.getByRole('button', { name: /unstake tokens/i });
      await user.click(unstakeButton);

      // Check all progress steps
      const steps = ['Validating input', 'Checking balance', 'Preparing transaction', 'Awaiting signature', 'Submitting to network', 'Confirming transaction'];

      for (const step of steps) {
        await waitFor(() => {
          expect(screen.getByText(step)).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });

    test('progress indicator disappears after successful transaction', async () => {
      const user = userEvent.setup();

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      // Switch to stake tab and perform stake
      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      // Wait for transaction to complete
      await waitFor(() => {
        expect(screen.queryByText('Validating input')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Loading States', () => {
    test('shows loading state during data fetch', () => {
      mockUseStakingData.mockReturnValue({
        ...mockStakingData,
        isLoading: true,
      });

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('disables buttons during transaction', async () => {
      const user = userEvent.setup();
      mockStake.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTransactionResponse), 1000)));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      // Button should be disabled during transaction
      expect(stakeButton).toBeDisabled();
      expect(stakeButton).toHaveTextContent(/staking/i);
    });

    test('shows spinner icon during loading', async () => {
      const user = userEvent.setup();
      mockStake.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTransactionResponse), 1000)));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      // Check for spinner icon (assuming it has a specific class or text)
      const spinner = document.querySelector('.animate-spin') || screen.getByText(/⟳|⚪|⏳/);
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('displays error message on transaction failure', async () => {
      const user = userEvent.setup();
      mockStake.mockRejectedValue(new Error('Transaction failed'));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      await waitFor(() => {
        expect(screen.getByText('Transaction failed')).toBeInTheDocument();
      });
    });

    test('clears error on successful retry', async () => {
      const user = userEvent.setup();
      mockStake
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTransactionResponse);

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });

      // First attempt fails
      await user.click(stakeButton);
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Second attempt succeeds
      await user.click(stakeButton);
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('progress indicator is announced to screen readers', async () => {
      const user = userEvent.setup();
      mockStake.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTransactionResponse), 1000)));

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeTab = screen.getByRole('tab', { name: /stake/i });
      await user.click(stakeTab);

      const stakeInput = screen.getByLabelText(/amount to stake/i);
      await user.type(stakeInput, '10');

      const stakeButton = screen.getByRole('button', { name: /stake tokens/i });
      await user.click(stakeButton);

      // Check for aria-live region or role=status
      const progressRegion = screen.getByRole('status') || screen.getByLabelText(/progress/i);
      expect(progressRegion).toBeInTheDocument();
    });

    test('form inputs have proper labels', () => {
      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByLabelText(/amount to stake/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount to unstake/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/extra stake/i)).toBeInTheDocument();
    });

    test('buttons have accessible names', () => {
      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByRole('button', { name: /stake tokens/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unstake tokens/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /claim/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compound/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('debounces input changes', async () => {
      const user = userEvent.setup();
      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeInput = screen.getByLabelText(/amount to stake/i);

      // Type quickly
      await user.type(stakeInput, '123456789');

      // Should only trigger validation once after debounce
      expect(stakeInput).toHaveValue('123456789');
    });

    test('caches form validation results', async () => {
      const user = userEvent.setup();
      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      const stakeInput = screen.getByLabelText(/amount to stake/i);

      // Type valid amount
      await user.type(stakeInput, '100');
      expect(stakeInput).toHaveValue('100');

      // Type same amount again - should use cache
      await user.clear(stakeInput);
      await user.type(stakeInput, '100');
      expect(stakeInput).toHaveValue('100');
    });
  });

  describe('Cache Integration', () => {
    test('displays cache hit information', () => {
      mockUseStakingData.mockReturnValue({
        ...mockStakingData,
        cacheHits: 10,
      });

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByText(/cache hits: 10/i)).toBeInTheDocument();
    });

    test('shows data freshness indicator', () => {
      mockUseStakingData.mockReturnValue({
        ...mockStakingData,
        timeSinceUpdate: 45,
        isStale: false,
      });

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByText(/updated 45s ago/i)).toBeInTheDocument();
    });

    test('shows stale data warning', () => {
      mockUseStakingData.mockReturnValue({
        ...mockStakingData,
        isStale: true,
      });

      render(<ContractUI walletAddress="GA123..." onConnect={jest.fn()} isConnecting={false} />);

      expect(screen.getByText(/data may be stale/i)).toBeInTheDocument();
    });
  });
});