"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        - The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const contract = new Contract(CONTRACT_ADDRESS);

  // For read-only calls, we need a valid account for simulation
  // Use a well-known testnet account that exists
  const accountId = caller || "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"; // A known testnet account
  const account = await server.getAccount(accountId);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// Wallet Balance Helpers
// ============================================================

/**
 * Get XLM balance for a wallet address from Horizon API.
 */
interface HorizonBalance {
  asset_type: string;
  balance: string;
}

export async function getWalletBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!response.ok) {
      throw new Error(`Horizon API error: ${response.status}`);
    }
    const data = await response.json();
    const xlmBalance = data.balances.find((b: HorizonBalance) => b.asset_type === 'native');
    if (!xlmBalance) {
      return "0";
    }
    return xlmBalance.balance;
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    throw new Error("Unable to fetch wallet balance");
  }
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i64" });
}

// ============================================================
// Token Staking Platform — Contract Methods
// ============================================================

/**
 * Stake tokens into the staking contract.
 * Calls: stake(staker: Address, amount: i128)
 */
export async function stake(
  caller: string,
  amount: bigint
) {
  return callContract(
    "stake",
    [toScValAddress(caller), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Unstake tokens from the staking contract (includes rewards).
 * Calls: unstake(staker: Address, amount: i128)
 */
export async function unstake(
  caller: string,
  amount: bigint
) {
  return callContract(
    "unstake",
    [toScValAddress(caller), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Claim accumulated staking rewards.
 * Calls: claim_rewards(staker: Address)
 */
export async function claimRewards(caller: string) {
  return callContract(
    "claim_rewards",
    [toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Compound stake — reinvest rewards + add extra tokens.
 * Calls: compound_stake(staker: Address, extra_amount: i128)
 */
export async function compoundStake(
  caller: string,
  extraAmount: bigint
) {
  return callContract(
    "compound_stake",
    [toScValAddress(caller), toScValI128(extraAmount)],
    caller,
    true
  );
}

/**
 * Get staker info (read-only).
 * Calls: get_staker_info(staker: Address)
 * Returns: { staked: i128, pending_rewards: i128, last_reward_per_token: i128 }
 */
export async function getStakerInfo(
  staker: string,
  caller?: string
) {
  return readContract(
    "get_staker_info",
    [toScValAddress(staker)],
    caller
  );
}

/**
 * Get global staking stats (read-only).
 * Calls: get_global_stats()
 * Returns: { total_staked: i128, staker_count: u32, reward_rate: i128 }
 */
export async function getGlobalStats(caller?: string) {
  return readContract("get_global_stats", [], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };
