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
    role: data.role?.trim() || 'കമ്മിറ്റി അംഗം',
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

// 4. Record Handover of Money to a Person (കുപ്പം ഫണ്ടിൽ നിന്ന് ഒരാളെ ഏൽപ്പിക്കൽ)
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
    sourceHandlerName: data.sourceHandlerName || 'കുപ്പം മെയിൻ ഫണ്ട്',
    targetHandlerId: data.targetHandlerId,
    targetHandlerName: data.targetHandlerName,
    title: `${data.targetHandlerName}-ക്ക് ഏൽപ്പിച്ച തുക`,
    date: data.date,
    notes: data.notes || '',
    status: 'active',
    createdByUid: data.createdByUid,
    createdByName: data.createdByName,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 5. Record an Expense (ചെലവ് രേഖപ്പെടുത്തൽ)
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
    sourceHandlerName: data.sourceHandlerName || (data.sourceType === 'district' ? 'ജില്ലാ കമ്മിറ്റി' : 'കുപ്പം മെയിൻ ഫണ്ട്'),
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

// 6. Record Landowner Payment (ഭൂവുടമയ്ക്കുള്ള പേയ്മെന്റ്)
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
    title: 'സ്ഥല ഉടമയ്ക്കുള്ള പേയ്‌മെന്റ്',
    sourceType: data.sourceType,
    sourceHandlerId: data.sourceHandlerId || '',
    sourceHandlerName: data.sourceHandlerName || (data.sourceType === 'district' ? 'ജില്ലാ കമ്മിറ്റി' : 'കുപ്പം മെയിൻ ഫണ്ട്'),
    recipient: 'സ്ഥല ഉടമ (Landowner)',
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
