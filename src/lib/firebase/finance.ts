import {
  runTransaction,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from './client';
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceGroup,
  ExpenseCategory,
} from '@/lib/types/finance';

const ACCOUNTS_COLLECTION = 'financeAccounts';
const TRANSACTIONS_COLLECTION = 'financeTransactions';

// Generate sequential or timestamped transaction code e.g. FT-2026-XXXX
function generateTransactionNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FT-${year}-${rand}`;
}

// 1. Fetch or Subscribe to Accounts
export function subscribeToFinanceAccounts(callback: (accounts: FinanceAccount[]) => void) {
  const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const accounts: FinanceAccount[] = [];
      snap.forEach((d) => {
        accounts.push({ id: d.id, ...(d.data() as any) });
      });
      callback(accounts);
    },
    (err) => {
      console.warn('Error fetching finance accounts:', err);
    }
  );
}

// 2. Fetch or Subscribe to Transactions
export function subscribeToFinanceTransactions(
  callback: (transactions: FinanceTransaction[]) => void,
  limitCount = 100
) {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: FinanceTransaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      callback(list);
    },
    (err) => {
      console.warn('Error fetching finance transactions:', err);
    }
  );
}

// 3. Create a new Custodian / Account
export async function createFinanceAccount(accountData: {
  name: string;
  group: FinanceGroup;
  holderName?: string;
  holderPhone?: string;
  accountNumber?: string;
  bankName?: string;
  openingBalancePaise?: number;
  notes?: string;
}): Promise<string> {
  const openingPaise = accountData.openingBalancePaise || 0;
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), {
    name: accountData.name.trim(),
    group: accountData.group,
    holderName: accountData.holderName?.trim() || '',
    holderPhone: accountData.holderPhone?.trim() || '',
    accountNumber: accountData.accountNumber?.trim() || '',
    bankName: accountData.bankName?.trim() || '',
    openingBalancePaise: openingPaise,
    currentBalancePaise: openingPaise,
    totalReceivedPaise: openingPaise,
    totalTransferredOutPaise: 0,
    totalExpensesPaidPaise: 0,
    notes: accountData.notes?.trim() || '',
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// 4. Update an existing Custodian / Account Details
export async function updateFinanceAccount(
  accountId: string,
  updates: Partial<FinanceAccount>
) {
  const docRef = doc(db, ACCOUNTS_COLLECTION, accountId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// 5. Atomic Money Transfer (From Holder A -> To Holder B)
export async function recordMoneyTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amountPaise: number;
  date: string;
  purpose: string;
  referenceNumber?: string;
  notes?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  if (params.fromAccountId === params.toAccountId) {
    return { success: false, error: 'Sender and receiver accounts cannot be the same.' };
  }
  if (params.amountPaise <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }

  try {
    const txnId = await runTransaction(db, async (transaction) => {
      const fromRef = doc(db, ACCOUNTS_COLLECTION, params.fromAccountId);
      const toRef = doc(db, ACCOUNTS_COLLECTION, params.toAccountId);

      const fromSnap = await transaction.get(fromRef);
      const toSnap = await transaction.get(toRef);

      if (!fromSnap.exists()) throw new Error('Sender account not found.');
      if (!toSnap.exists()) throw new Error('Receiver account not found.');

      const fromData = fromSnap.data() as FinanceAccount;
      const toData = toSnap.data() as FinanceAccount;

      // Overdraft check: verify sender has enough balance
      if (fromData.currentBalancePaise < params.amountPaise) {
        throw new Error(
          `Insufficient balance. Available with ${fromData.name}: ₹${(fromData.currentBalancePaise / 100).toLocaleString('en-IN')}`
        );
      }

      // Update sender balance
      transaction.update(fromRef, {
        currentBalancePaise: fromData.currentBalancePaise - params.amountPaise,
        totalTransferredOutPaise: (fromData.totalTransferredOutPaise || 0) + params.amountPaise,
        updatedAt: serverTimestamp(),
      });

      // Update receiver balance
      transaction.update(toRef, {
        currentBalancePaise: toData.currentBalancePaise + params.amountPaise,
        totalReceivedPaise: (toData.totalReceivedPaise || 0) + params.amountPaise,
        updatedAt: serverTimestamp(),
      });

      // Create transaction record
      const txnRef = doc(collection(db, TRANSACTIONS_COLLECTION));
      transaction.set(txnRef, {
        transactionNumber: generateTransactionNumber(),
        transactionType: 'transfer',
        fromAccountId: params.fromAccountId,
        fromAccountName: fromData.name,
        toAccountId: params.toAccountId,
        toAccountName: toData.name,
        amountPaise: params.amountPaise,
        date: params.date,
        expenseTitle: params.purpose,
        referenceNumber: params.referenceNumber?.trim() || '',
        notes: params.notes?.trim() || '',
        createdByUid: params.createdByUid,
        createdByName: params.createdByName,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      return txnRef.id;
    });

    return { success: true, transactionId: txnId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Transaction failed.' };
  }
}

// 6. Atomic Record Expense
export async function recordExpense(params: {
  fromAccountId: string;
  amountPaise: number;
  category: ExpenseCategory | string;
  expenseTitle: string;
  paidToRecipient: string;
  date: string;
  referenceNumber?: string;
  notes?: string;
  attachmentUrl?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  if (params.amountPaise <= 0) {
    return { success: false, error: 'Expense amount must be greater than zero.' };
  }

  try {
    const txnId = await runTransaction(db, async (transaction) => {
      const fromRef = doc(db, ACCOUNTS_COLLECTION, params.fromAccountId);
      const fromSnap = await transaction.get(fromRef);

      if (!fromSnap.exists()) throw new Error('Source account not found.');
      const fromData = fromSnap.data() as FinanceAccount;

      if (fromData.currentBalancePaise < params.amountPaise) {
        throw new Error(
          `Insufficient balance. Available with ${fromData.name}: ₹${(fromData.currentBalancePaise / 100).toLocaleString('en-IN')}`
        );
      }

      // Deduct from source account
      transaction.update(fromRef, {
        currentBalancePaise: fromData.currentBalancePaise - params.amountPaise,
        totalExpensesPaidPaise: (fromData.totalExpensesPaidPaise || 0) + params.amountPaise,
        updatedAt: serverTimestamp(),
      });

      // Create expense transaction record
      const txnRef = doc(collection(db, TRANSACTIONS_COLLECTION));
      transaction.set(txnRef, {
        transactionNumber: generateTransactionNumber(),
        transactionType: 'expense',
        fromAccountId: params.fromAccountId,
        fromAccountName: fromData.name,
        amountPaise: params.amountPaise,
        category: params.category,
        expenseTitle: params.expenseTitle.trim(),
        paidToRecipient: params.paidToRecipient.trim(),
        date: params.date,
        referenceNumber: params.referenceNumber?.trim() || '',
        notes: params.notes?.trim() || '',
        attachmentUrl: params.attachmentUrl?.trim() || '',
        createdByUid: params.createdByUid,
        createdByName: params.createdByName,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      return txnRef.id;
    });

    return { success: true, transactionId: txnId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Expense recording failed.' };
  }
}

// 7. Atomic Record Landowner Payment
export async function recordLandownerPayment(params: {
  fromAccountId: string;
  landownerAccountId?: string;
  amountPaise: number;
  date: string;
  paidToRecipient: string; // e.g. Landowner Name
  referenceNumber?: string; // Cheque No, Bank UTR
  notes?: string;
  attachmentUrl?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  if (params.amountPaise <= 0) {
    return { success: false, error: 'Payment amount must be greater than zero.' };
  }

  try {
    const txnId = await runTransaction(db, async (transaction) => {
      const fromRef = doc(db, ACCOUNTS_COLLECTION, params.fromAccountId);
      const fromSnap = await transaction.get(fromRef);

      if (!fromSnap.exists()) throw new Error('Source account not found.');
      const fromData = fromSnap.data() as FinanceAccount;

      if (fromData.currentBalancePaise < params.amountPaise) {
        throw new Error(
          `Insufficient balance. Available with ${fromData.name}: ₹${(fromData.currentBalancePaise / 100).toLocaleString('en-IN')}`
        );
      }

      // Deduct from source account
      transaction.update(fromRef, {
        currentBalancePaise: fromData.currentBalancePaise - params.amountPaise,
        totalTransferredOutPaise: (fromData.totalTransferredOutPaise || 0) + params.amountPaise,
        updatedAt: serverTimestamp(),
      });

      // If a dedicated landowner account exists, track cumulative payments to them
      if (params.landownerAccountId) {
        const landRef = doc(db, ACCOUNTS_COLLECTION, params.landownerAccountId);
        const landSnap = await transaction.get(landRef);
        if (landSnap.exists()) {
          const landData = landSnap.data() as FinanceAccount;
          transaction.update(landRef, {
            currentBalancePaise: landData.currentBalancePaise + params.amountPaise,
            totalReceivedPaise: (landData.totalReceivedPaise || 0) + params.amountPaise,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Create landowner payment transaction record
      const txnRef = doc(collection(db, TRANSACTIONS_COLLECTION));
      transaction.set(txnRef, {
        transactionNumber: generateTransactionNumber(),
        transactionType: 'landowner_payment',
        fromAccountId: params.fromAccountId,
        fromAccountName: fromData.name,
        toAccountId: params.landownerAccountId || '',
        toAccountName: params.paidToRecipient.trim(),
        amountPaise: params.amountPaise,
        category: 'land_related',
        expenseTitle: 'Landowner Land Acquisition Payment',
        paidToRecipient: params.paidToRecipient.trim(),
        date: params.date,
        referenceNumber: params.referenceNumber?.trim() || '',
        notes: params.notes?.trim() || '',
        attachmentUrl: params.attachmentUrl?.trim() || '',
        createdByUid: params.createdByUid,
        createdByName: params.createdByName,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      return txnRef.id;
    });

    return { success: true, transactionId: txnId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Landowner payment recording failed.' };
  }
}

// 8. Safely Cancel / Reverse a Finance Transaction (Reversal Entry)
export async function cancelFinanceTransaction(params: {
  transactionId: string;
  cancellationReason: string;
  cancelledByUid: string;
  cancelledByName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const txnRef = doc(db, TRANSACTIONS_COLLECTION, params.transactionId);
      const txnSnap = await transaction.get(txnRef);

      if (!txnSnap.exists()) throw new Error('Transaction record not found.');
      const txn = txnSnap.data() as FinanceTransaction;

      if (txn.status === 'cancelled') {
        throw new Error('Transaction is already cancelled.');
      }

      // Reverse account balances based on transaction type
      if (txn.transactionType === 'transfer') {
        const fromRef = doc(db, ACCOUNTS_COLLECTION, txn.fromAccountId!);
        const toRef = doc(db, ACCOUNTS_COLLECTION, txn.toAccountId!);

        const fromSnap = await transaction.get(fromRef);
        const toSnap = await transaction.get(toRef);

        if (fromSnap.exists() && toSnap.exists()) {
          const fromData = fromSnap.data() as FinanceAccount;
          const toData = toSnap.data() as FinanceAccount;

          // Refund sender
          transaction.update(fromRef, {
            currentBalancePaise: fromData.currentBalancePaise + txn.amountPaise,
            totalTransferredOutPaise: Math.max(0, (fromData.totalTransferredOutPaise || 0) - txn.amountPaise),
            updatedAt: serverTimestamp(),
          });
          // Deduct from receiver
          transaction.update(toRef, {
            currentBalancePaise: Math.max(0, toData.currentBalancePaise - txn.amountPaise),
            totalReceivedPaise: Math.max(0, (toData.totalReceivedPaise || 0) - txn.amountPaise),
            updatedAt: serverTimestamp(),
          });
        }
      } else if (txn.transactionType === 'expense') {
        const fromRef = doc(db, ACCOUNTS_COLLECTION, txn.fromAccountId!);
        const fromSnap = await transaction.get(fromRef);
        if (fromSnap.exists()) {
          const fromData = fromSnap.data() as FinanceAccount;
          // Refund source account
          transaction.update(fromRef, {
            currentBalancePaise: fromData.currentBalancePaise + txn.amountPaise,
            totalExpensesPaidPaise: Math.max(0, (fromData.totalExpensesPaidPaise || 0) - txn.amountPaise),
            updatedAt: serverTimestamp(),
          });
        }
      } else if (txn.transactionType === 'landowner_payment') {
        const fromRef = doc(db, ACCOUNTS_COLLECTION, txn.fromAccountId!);
        const fromSnap = await transaction.get(fromRef);
        if (fromSnap.exists()) {
          const fromData = fromSnap.data() as FinanceAccount;
          // Refund source account
          transaction.update(fromRef, {
            currentBalancePaise: fromData.currentBalancePaise + txn.amountPaise,
            totalTransferredOutPaise: Math.max(0, (fromData.totalTransferredOutPaise || 0) - txn.amountPaise),
            updatedAt: serverTimestamp(),
          });
        }
        if (txn.toAccountId) {
          const landRef = doc(db, ACCOUNTS_COLLECTION, txn.toAccountId);
          const landSnap = await transaction.get(landRef);
          if (landSnap.exists()) {
            const landData = landSnap.data() as FinanceAccount;
            transaction.update(landRef, {
              currentBalancePaise: Math.max(0, landData.currentBalancePaise - txn.amountPaise),
              totalReceivedPaise: Math.max(0, (landData.totalReceivedPaise || 0) - txn.amountPaise),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      // Mark transaction cancelled
      transaction.update(txnRef, {
        status: 'cancelled',
        cancellationReason: params.cancellationReason.trim(),
        cancelledByUid: params.cancelledByUid,
        cancelledByName: params.cancelledByName,
        cancelledAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cancellation failed.' };
  }
}

// 9. Initial Seed: Helper to seed standard custodian accounts if none exist
export async function seedDefaultFinanceAccountsIfEmpty() {
  try {
    const snap = await getDocs(collection(db, ACCOUNTS_COLLECTION));
    if (!snap.empty) return; // Already initialized

    const defaults: Array<{
      name: string;
      group: FinanceGroup;
      holderName?: string;
      notes?: string;
    }> = [
      {
        name: 'കുപ്പം കമ്മിറ്റി കാഷ് കസ്റ്റഡി (Kuppam Cash Custody)',
        group: 'cash_box',
        holderName: 'കൗണ്ടർ / ട്രഷറർ',
        notes: 'നേരിട്ട് കൈപ്പറ്റുന്ന കാഷ് സൂക്ഷിക്കുന്ന കസ്റ്റഡി',
      },
      {
        name: 'കുപ്പം യൂണിറ്റ് ബാങ്ക് അക്കൗണ്ട് (Kuppam Unit Bank A/c)',
        group: 'bank',
        holderName: 'കുപ്പം യൂണിറ്റ് കമ്മിറ്റി',
        notes: 'യൂണിറ്റ് ഔദ്യോഗിക ബാങ്ക് അക്കൗണ്ട്',
      },
      {
        name: 'ജില്ലാ കമ്മിറ്റി ഫണ്ട് (District Committee Holding)',
        group: 'district_committee',
        holderName: 'വിസ്ഡം ജില്ലാ കമ്മിറ്റി',
        notes: 'ജില്ലാ കമ്മിറ്റിയിലേക്ക് കൈമാറിയ ഫണ്ട്',
      },
      {
        name: 'ഭൂവുടമ അക്കൗണ്ട് (Landowner Account)',
        group: 'landowner',
        holderName: 'ഭൂവുടമ',
        notes: 'ഭൂമി വാങ്ങലിനായി ഭൂവുടമയ്ക്ക് നൽകുന്ന പേയ്‌മെന്റുകൾ',
      },
    ];

    for (const item of defaults) {
      await createFinanceAccount({
        name: item.name,
        group: item.group,
        holderName: item.holderName,
        openingBalancePaise: 0,
        notes: item.notes,
      });
    }
  } catch (e) {
    console.warn('Finance accounts seed check error:', e);
  }
}

