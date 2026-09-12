import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AccountReconciliationResult {
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  storedBalance: number;
  calculatedBalance: number;
  difference: number;
  status: 'BALANCED' | 'MISMATCH';
  totalInflows: number;
  totalOutflows: number;
  activeTxnCount: number;
  lastCheckedAt: Date;
}

export interface TreasuryReconciliationSummary {
  accounts: AccountReconciliationResult[];
  allBalanced: boolean;
  totalAccounts: number;
  balancedCount: number;
  mismatchCount: number;
  checkedAt: Date;
}

/**
 * Reconciles a single treasury account by calculating its net balance from
 * all approved/active FinancialTransactions and comparing with the stored balance.
 */
export async function reconcileTreasuryAccount(
  accountId: string,
  tx?: any
): Promise<AccountReconciliationResult | null> {
  const db = tx || prisma;

  const account = await db.treasuryAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) return null;

  // Fetch all non-cancelled financial transactions targeting this account
  const transactions = await db.financialTransaction.findMany({
    where: {
      accountId,
      status: { not: 'ملغاة' },
    },
    select: {
      type: true,
      amountEgp: true,
      amountCurrency: true,
      currency: true,
    },
  });

  let totalInflows = new Prisma.Decimal(0);
  let totalOutflows = new Prisma.Decimal(0);

  for (const txn of transactions) {
    const isCollection =
      txn.type.includes('تحصيل') ||
      txn.type.includes('وارد') ||
      txn.type.includes('Inflow') ||
      txn.type.includes('سداد') ||
      txn.type.includes('استرداد') ||
      txn.type.includes('تسوية دائنة') ||
      txn.type.includes('زيادة');

    // All transactions in the unified system are in EGP
    const amt = new Prisma.Decimal(txn.amountEgp);

    if (isCollection) {
      totalInflows = totalInflows.add(amt);
    } else {
      totalOutflows = totalOutflows.add(amt);
    }
  }

  const calculatedBalanceDecimal = totalInflows.sub(totalOutflows);
  const storedBalanceDecimal = new Prisma.Decimal(account.balance);
  const diffDecimal = storedBalanceDecimal.sub(calculatedBalanceDecimal).abs();

  // Allow a tiny precision tolerance (0.001) for decimal rounding
  const isBalanced = diffDecimal.lessThanOrEqualTo(new Prisma.Decimal(0.001));

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    currency: account.currency,
    storedBalance: Number(storedBalanceDecimal),
    calculatedBalance: Number(calculatedBalanceDecimal),
    difference: Number(diffDecimal),
    status: isBalanced ? 'BALANCED' : 'MISMATCH',
    totalInflows: Number(totalInflows),
    totalOutflows: Number(totalOutflows),
    activeTxnCount: transactions.length,
    lastCheckedAt: new Date(),
  };
}

/**
 * Reconciles all active treasury accounts in the system.
 */
export async function reconcileAllTreasuryAccounts(): Promise<TreasuryReconciliationSummary> {
  const accounts = await prisma.treasuryAccount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: AccountReconciliationResult[] = [];
  let mismatchCount = 0;

  for (const acc of accounts) {
    const res = await reconcileTreasuryAccount(acc.id);
    if (res) {
      results.push(res);
      if (res.status === 'MISMATCH') {
        mismatchCount++;
      }
    }
  }

  return {
    accounts: results,
    allBalanced: mismatchCount === 0,
    totalAccounts: accounts.length,
    balancedCount: results.length - mismatchCount,
    mismatchCount,
    checkedAt: new Date(),
  };
}
