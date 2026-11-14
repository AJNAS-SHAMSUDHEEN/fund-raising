import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client';
import {
  KuppamHandler,
  FinanceRecord,
  FinanceRecordType,
  FinanceSourceType,
} from '@/lib/types/finance';

const HANDLERS_COLLECTION = 'kuppamHandlers';
const RECORDS_COLLECTION = 'financeRecords';

function generateRecordNumber(prefix = 'TXN'): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${rand}`;
}

// 1. Subscribe to Kuppam Handlers (People / Accounts holding funds)
export function subscribeToKuppamHandlers(callback: (handlers: KuppamHandler[]) => void) {
  const q = query(collection(db, HANDLERS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: KuppamHandler[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      callback(list);
    },
    (err) => {
      console.warn('Error fetching kuppam handlers:', err);
    }
  );
}

// 2. Add a new Person / Handler
export async function createKuppamHandler(data: {
  name: string;
  phone?: string;
  role?: string;
  notes?: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, HANDLERS_COLLECTION), {
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    role: data.role?.trim() || 'Committee Member',
    notes: data.notes?.trim() || '',
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 3. Subscribe to Finance Records (Handovers, Expenses, Landowner Payments)
export function subscribeToFinanceRecords(callback: (records: FinanceRecord[]) => void) {
  const q = query(collection(db, RECORDS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: FinanceRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      callback(list);
    },
    (err) => {
      console.warn('Error fetching finance records:', err);
    }
  );
}

// 4. Record Handover of Money to a Person
export async function recordMoneyHandover(data: {
  amountPaise: number;
  targetHandlerId: string;
  targetHandlerName: string;
  sourceType?: FinanceSourceType; // default 'kuppam_main'
  sourceHandlerId?: string;
  sourceHandlerName?: string;
  date: string;
  notes?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, RECORDS_COLLECTION), {
    recordNumber: generateRecordNumber('HND'),
    type: 'handover' as FinanceRecordType,
    amountPaise: data.amountPaise,
    sourceType: data.sourceType || 'kuppam_main',
    sourceHandlerId: data.sourceHandlerId || '',
    sourceHandlerName: data.sourceHandlerName || 'Kuppam Main Treasury',
    targetHandlerId: data.targetHandlerId,
    targetHandlerName: data.targetHandlerName,
    title: `Funds Handed over to ${data.targetHandlerName}`,
    date: data.date,
    notes: data.notes || '',
    status: 'active',
    createdByUid: data.createdByUid,
    createdByName: data.createdByName,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 5. Record an Expense
export async function recordFinanceExpense(data: {
  amountPaise: number;
  title: string;
  category: string;
  sourceType: FinanceSourceType; // 'district' | 'handler' | 'kuppam_main'
  sourceHandlerId?: string;
  sourceHandlerName?: string;
  recipient?: string;
  date: string;
  notes?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, RECORDS_COLLECTION), {
    recordNumber: generateRecordNumber('EXP'),
    type: 'expense' as FinanceRecordType,
    amountPaise: data.amountPaise,
    title: data.title.trim(),
    category: data.category || 'other',
    sourceType: data.sourceType,
    sourceHandlerId: data.sourceHandlerId || '',
    sourceHandlerName: data.sourceHandlerName || (data.sourceType === 'district' ? 'District Committee' : 'Kuppam Main Treasury'),
    recipient: data.recipient?.trim() || '',
    date: data.date,
    notes: data.notes || '',
    status: 'active',
    createdByUid: data.createdByUid,
    createdByName: data.createdByName,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 6. Record Landowner Payment
export async function recordLandownerPayment(data: {
  amountPaise: number;
  sourceType: FinanceSourceType;
  sourceHandlerId?: string;
  sourceHandlerName?: string;
  date: string;
  notes?: string;
  createdByUid: string;
  createdByName: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, RECORDS_COLLECTION), {
    recordNumber: generateRecordNumber('LND'),
    type: 'landowner_payment' as FinanceRecordType,
    amountPaise: data.amountPaise,
    title: 'Payment to Landowner',
    sourceType: data.sourceType,
    sourceHandlerId: data.sourceHandlerId || '',
    sourceHandlerName: data.sourceHandlerName || (data.sourceType === 'district' ? 'District Committee' : 'Kuppam Main Treasury'),
    recipient: 'Landowner',
    date: data.date,
    notes: data.notes || '',
    status: 'active',
    createdByUid: data.createdByUid,
    createdByName: data.createdByName,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 7. Cancel / Reverse a Record
export async function cancelFinanceRecord(
  recordId: string,
  reason: string,
  admin: { uid: string; name: string }
): Promise<void> {
  const docRef = doc(db, RECORDS_COLLECTION, recordId);
  await updateDoc(docRef, {
    status: 'cancelled',
    cancellationReason: reason.trim() || 'Admin cancelled',
    cancelledByUid: admin.uid,
    cancelledByName: admin.name,
    cancelledAt: serverTimestamp(),
  });
}

// 8. Update / Edit a Finance Record (Admin only)
export async function updateFinanceRecord(
  recordId: string,
  data: {
    amountPaise?: number;
    title?: string;
    category?: string;
    sourceType?: FinanceSourceType;
    sourceHandlerId?: string;
    sourceHandlerName?: string;
    targetHandlerId?: string;
    targetHandlerName?: string;
    recipient?: string;
    date?: string;
    notes?: string;
  },
  admin: { uid: string; name: string }
): Promise<void> {
  const docRef = doc(db, RECORDS_COLLECTION, recordId);
  const updatePayload: Record<string, any> = {
    updatedByUid: admin.uid,
    updatedByName: admin.name,
    updatedAt: serverTimestamp(),
  };

  if (data.amountPaise !== undefined) updatePayload.amountPaise = data.amountPaise;
  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.sourceType !== undefined) updatePayload.sourceType = data.sourceType;
  if (data.sourceHandlerId !== undefined) updatePayload.sourceHandlerId = data.sourceHandlerId;
  if (data.sourceHandlerName !== undefined) updatePayload.sourceHandlerName = data.sourceHandlerName;
  if (data.targetHandlerId !== undefined) updatePayload.targetHandlerId = data.targetHandlerId;
  if (data.targetHandlerName !== undefined) updatePayload.targetHandlerName = data.targetHandlerName;
  if (data.recipient !== undefined) updatePayload.recipient = data.recipient;
  if (data.date !== undefined) updatePayload.date = data.date;
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  await updateDoc(docRef, updatePayload);
}
