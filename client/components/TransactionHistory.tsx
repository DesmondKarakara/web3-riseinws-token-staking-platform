"use client";

import { useEffect, useState } from "react";

interface Transaction {
  hash: string;
  type: string;
  timestamp: Date;
  status: "success" | "failed";
  amount?: string;
}

interface TransactionHistoryProps {
  walletAddress: string;
}

export function TransactionHistory({ walletAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!walletAddress) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch transactions from Horizon API
        const response = await fetch(
          `https://horizon-testnet.stellar.org/accounts/${walletAddress}/transactions?limit=20&order=desc`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transaction history");
        }

        const data = await response.json();

        // Parse and filter transactions related to our contract
        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
        const parsedTransactions: Transaction[] = data._embedded?.records
          .filter((tx: { operations?: unknown[] }) => {
            // Filter for transactions that interact with our contract
            return tx.operations?.some((op) => {
              const operation = op as { source_account?: string; destination?: string; asset_code?: string };
              return operation.source_account === contractAddress ||
                     operation.destination === contractAddress ||
                     operation.asset_code === "TOKEN";
            });
          })
          .map((tx: { hash: string; operations?: unknown[]; successful: boolean; created_at: string }) => ({
            hash: tx.hash,
            type: determineTransactionType(tx),
            timestamp: new Date(tx.created_at),
            status: tx.successful ? "success" : "failed",
            amount: extractAmount(tx),
          })) || [];

        setTransactions(parsedTransactions);
      } catch (err) {
        console.error("Failed to fetch transaction history:", err);
        setError(err instanceof Error ? err.message : "Failed to load transactions");

        // Fallback: Generate mock transactions for demo purposes
        setTransactions(generateMockTransactions());
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Transaction History</h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Transaction History</h3>
        <div className="text-red-400 text-sm">
          {error}
        </div>
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Recent Activity (Demo)</h4>
          {generateMockTransactions().slice(0, 3).map((tx, i) => (
            <TransactionItem key={i} transaction={tx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Transaction History</h3>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">No transactions found</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <TransactionItem key={tx.hash} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "stake":
        return "text-green-400";
      case "unstake":
        return "text-orange-400";
      case "claim":
        return "text-blue-400";
      case "compound":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    return status === "success" ? "✅" : "❌";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center space-x-3">
        <span className="text-sm">{getStatusIcon(transaction.status)}</span>
        <div>
          <div className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
            {transaction.type.toUpperCase()}
          </div>
          <div className="text-xs text-gray-500">
            {transaction.timestamp.toLocaleDateString()} {transaction.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div className="text-right">
        {transaction.amount && (
          <div className="text-sm font-medium text-white">
            {transaction.amount} TOKEN
          </div>
        )}
        <div className="text-xs text-gray-500">
          {transaction.hash.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
}

function determineTransactionType(tx: { operations?: unknown[] }): string {
  // This is a simplified type determination
  // In a real app, you'd parse the transaction operations more carefully
  const operations = tx.operations || [];

  if (operations.some((op) => {
    const operation = op as { type?: string };
    return operation.type === "invoke_host_function";
  })) {
    // Check the function name from the operation
    // This is simplified - you'd need to decode the XDR
    return "contract_call";
  }

  if (operations.some((op) => {
    const operation = op as { type?: string };
    return operation.type === "payment";
  })) {
    return operations[0] && (operations[0] as { amount?: string }).amount && parseFloat((operations[0] as { amount?: string }).amount || "0") > 0 ? "receive" : "send";
  }

  return "unknown";
}

function extractAmount(tx: { operations?: unknown[] }): string | undefined {
  const operations = tx.operations || [];
  const paymentOp = operations.find((op) => {
    const operation = op as { type?: string };
    return operation.type === "payment";
  }) as { amount?: string; asset_code?: string } | undefined;

  if (paymentOp && paymentOp.asset_code === "TOKEN") {
    return paymentOp.amount;
  }

  return undefined;
}

function generateMockTransactions(): Transaction[] {
  const types = ["stake", "unstake", "claim", "compound"];
  const now = new Date();

  return Array.from({ length: 8 }, (_, i) => ({
    hash: `mock_tx_${i}_${Math.random().toString(36).substr(2, 9)}`,
    type: types[Math.floor(Math.random() * types.length)],
    timestamp: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    status: Math.random() > 0.1 ? "success" : "failed" as "success" | "failed",
    amount: (Math.random() * 1000).toFixed(2),
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}