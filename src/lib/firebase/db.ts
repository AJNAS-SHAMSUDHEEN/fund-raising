import {
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
  Timestamp,
  Unsubscribe,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './client';
import { OfferType } from '@/lib/types';

export interface FirestoreOffer {
  id?: string;
  contributorName: string;
  contributorPhone: string;
  offerType: OfferType;
  quantity: number;
  totalOfferedPaise: number;
  paidPaise?: number;
  allowPublicDisplay: boolean;
  status: 'pledged' | 'partial' | 'completed';
  createdAt?: any;
}

export interface FirestoreCashCollection {
  id?: string;
  receiptNumber: string;
  contributorName: string;
  contributorPhone: string;
  offerType: OfferType;
  quantity: number;
  amountPaise: number;
  collectorName: string;
  status: 'verified' | 'pending_verification';
  createdAt?: any;
}

export interface CampaignAggregatesData {
  targetAmountPaise: number;
  totalOfferedPaise: number;
  totalVerifiedPaise: number;
  offerCount: number;
  verifiedCount: number;
  centCount: number;
  sqFtCount: number;
  musallaCount: number;
  updatedAt?: any;
}

const AGGREGATES_DOC_PATH = 'campaignAggregates/main';

// 1. Submit a new Public Offer (Optionally tagged to an event)
export async function submitOfferToFirebase(offerData: {
  contributorName?: string;
  contributorPhone: string;
  contributorPlace?: string;
  offerType: OfferType;
  quantity: number;
  totalOfferedPaise: number;
  unitRatePaise?: number;
  commitmentType?: 'one_time' | 'installments';
  commitmentMonths?: number;
  allowPublicDisplay?: boolean;
  eventId?: string;
  eventName?: string;
  offerNumber?: string;
}) {
  try {
    const generatedOfferNumber = offerData.offerNumber || `OFF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const docRef = await addDoc(collection(db, 'offers'), {
      ...offerData,
      offerNumber: generatedOfferNumber,
      contributorName: offerData.contributorName?.trim() || 'Well Wisher',
      contributorPlace: offerData.contributorPlace?.trim() || '',
      commitmentType: offerData.commitmentType || 'one_time',
      commitmentMonths: offerData.commitmentMonths || 1,
      unitRatePaise: offerData.unitRatePaise || 0,
      eventId: offerData.eventId || 'general',
      eventName: offerData.eventName || 'General Campaign',
      paidPaise: 0,
      status: 'pledged',
      createdAt: serverTimestamp(),
    });

    // 1. Increment grand total aggregate counter document
    const aggRef = doc(db, 'campaignAggregates', 'main');
    await setDoc(
      aggRef,
      {
        totalOfferedPaise: increment(offerData.totalOfferedPaise),
        offerCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Increment Event-Specific aggregate document if tagged
    if (offerData.eventId && offerData.eventId !== 'general') {
      const eventRef = doc(db, 'events', offerData.eventId);
      await setDoc(
        eventRef,
        {
          name: offerData.eventName || offerData.eventId,
          totalOfferedPaise: increment(offerData.totalOfferedPaise),
          offerCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return docRef.id;
  } catch (error) {
    console.error('Error submitting offer to Firebase:', error);
    throw error;
  }
}

// 1b. Update an Existing Offer (Admin Correction)
export async function updateOfferInFirebase(
  offerId: string,
  updatedData: {
    contributorName?: string;
    contributorPhone?: string;
    offerType?: OfferType;
    quantity?: number;
    totalOfferedPaise?: number;
    status?: 'pledged' | 'partial' | 'completed' | 'cancelled';
    eventId?: string;
    eventName?: string;
  },
  previousAmountPaise: number,
  previousEventId?: string
) {
  try {
    const offerRef = doc(db, 'offers', offerId);
    await updateDoc(offerRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });

    const newAmount = updatedData.totalOfferedPaise ?? previousAmountPaise;
    const diffPaise = newAmount - previousAmountPaise;

    // Adjust campaign-level total if amount changed
    if (diffPaise !== 0) {
      const aggRef = doc(db, 'campaignAggregates', 'main');
      await setDoc(
        aggRef,
        {
          totalOfferedPaise: increment(diffPaise),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Handle event-level adjustments
    const currentEventId = updatedData.eventId ?? previousEventId;
    if (previousEventId && updatedData.eventId && previousEventId !== updatedData.eventId) {
      if (previousEventId !== 'general') {
        const prevEventRef = doc(db, 'events', previousEventId);
        await setDoc(
          prevEventRef,
          {
            totalOfferedPaise: increment(-previousAmountPaise),
            offerCount: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      if (updatedData.eventId !== 'general') {
        const newEventRef = doc(db, 'events', updatedData.eventId);
        await setDoc(
          newEventRef,
          {
            name: updatedData.eventName || updatedData.eventId,
            totalOfferedPaise: increment(newAmount),
            offerCount: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } else if (diffPaise !== 0 && currentEventId && currentEventId !== 'general') {
      const eventRef = doc(db, 'events', currentEventId);
      await setDoc(
        eventRef,
        {
          name: updatedData.eventName || currentEventId,
          totalOfferedPaise: increment(diffPaise),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Error updating offer in Firebase:', error);
    throw error;
  }
}

// 1c. Remove/Delete an Offer (Admin Mistake Removal)
export async function deleteOfferFromFirebase(
  offerId: string,
  amountPaise: number,
  eventId?: string
) {
  try {
    const offerRef = doc(db, 'offers', offerId);
    await deleteDoc(offerRef);

    // Decrement grand totals
    const aggRef = doc(db, 'campaignAggregates', 'main');
    await setDoc(
      aggRef,
      {
        totalOfferedPaise: increment(-Math.max(0, amountPaise)),
        offerCount: increment(-1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Decrement event totals if applicable
    if (eventId && eventId !== 'general') {
      const eventRef = doc(db, 'events', eventId);
      await setDoc(
        eventRef,
        {
          totalOfferedPaise: increment(-Math.max(0, amountPaise)),
          offerCount: increment(-1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Error deleting offer from Firebase:', error);
    throw error;
  }
}

export interface DonorOfferRecord {
  id: string;
  offerType: OfferType;
  quantity: number;
  totalOfferedPaise: number;
  paidPaise: number;
  remainingPaise: number;
  status: string;
  date: string;
  eventName?: string;
  eventId?: string;
}

export interface DonorHistory {
  phone: string;
  contributorName: string;
  totalOfferedPaise: number;
  totalPaidPaise: number;
  remainingPaise: number;
  offers: DonorOfferRecord[];
  recentCashPayments: Array<{
    id: string;
    receiptNumber: string;
    amountPaise: number;
    date: string;
    eventName?: string;
  }>;
}

// 2. Record Direct Cash Collection by Admin (Optionally tagged to an event & linked to an offer)
export async function recordCashToFirebase(cashData: {
  receiptNumber: string;
  contributorName?: string;
  contributorPhone: string;
  offerType: OfferType;
  quantity: number;
  amountPaise: number;
  collectorName: string;
  eventId?: string;
  eventName?: string;
  offerId?: string;
  notes?: string;
}) {
  try {
    const docRef = await addDoc(collection(db, 'cashCollections'), {
      ...cashData,
      contributorName: cashData.contributorName?.trim() || 'Well Wisher',
      eventId: cashData.eventId || 'general',
      eventName: cashData.eventName || 'General Campaign',
      status: 'verified',
      createdAt: serverTimestamp(),
    });

    // If linked to an offer, update paidPaise on that offer document
    if (cashData.offerId && !cashData.offerId.startsWith('mock-') && !cashData.offerId.startsWith('off-')) {
      try {
        const offerRef = doc(db, 'offers', cashData.offerId);
        await setDoc(
          offerRef,
          {
            paidPaise: increment(cashData.amountPaise),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not increment offer paidPaise:', e);
      }
    }

    // 1. Update grand total aggregate verified totals
    const aggRef = doc(db, 'campaignAggregates', 'main');
    await setDoc(
      aggRef,
      {
        totalVerifiedPaise: increment(cashData.amountPaise),
        verifiedCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Update Event-Specific aggregate document if tagged
    if (cashData.eventId && cashData.eventId !== 'general') {
      const eventRef = doc(db, 'events', cashData.eventId);
      await setDoc(
        eventRef,
        {
          name: cashData.eventName || cashData.eventId,
          totalVerifiedPaise: increment(cashData.amountPaise),
          verifiedCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return docRef.id;
  } catch (error) {
    console.error('Error recording cash collection to Firebase:', error);
    throw error;
  }
}

// 2b. Lookup Donor Profile & Previous Offers by Mobile Number
export async function getDonorHistoryByPhone(phoneInput: string): Promise<DonorHistory> {
  const cleanPhone = phoneInput.replace(/\D/g, '').slice(-10);
  const result: DonorHistory = {
    phone: cleanPhone,
    contributorName: 'Well Wisher',
    totalOfferedPaise: 0,
    totalPaidPaise: 0,
    remainingPaise: 0,
    offers: [],
    recentCashPayments: [],
  };

  if (!cleanPhone || cleanPhone.length < 10) return result;

  // 1. Try Firebase query first
  try {
    const offersQ = query(
      collection(db, 'offers'),
      where('contributorPhone', '==', cleanPhone)
    );
    const offersSnap = await getDocs(offersQ);
    offersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.contributorName && result.contributorName === 'Well Wisher') {
        result.contributorName = data.contributorName;
      }
      const total = Number(data.totalOfferedPaise) || 0;
      const paid = Number(data.paidPaise) || 0;
      result.totalOfferedPaise += total;
      result.totalPaidPaise += paid;
      result.offers.push({
        id: docSnap.id,
        offerType: data.offerType || 'custom',
        quantity: data.quantity || 1,
        totalOfferedPaise: total,
        paidPaise: paid,
        remainingPaise: Math.max(0, total - paid),
        status: data.status || 'pledged',
        date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent',
        eventName: data.eventName,
        eventId: data.eventId,
      });
    });

    const cashQ = query(
      collection(db, 'cashCollections'),
      where('contributorPhone', '==', cleanPhone)
    );
    const cashSnap = await getDocs(cashQ);
    cashSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.contributorName && result.contributorName === 'Well Wisher') {
        result.contributorName = data.contributorName;
      }
      result.recentCashPayments.push({
        id: docSnap.id,
        receiptNumber: data.receiptNumber || 'CASH-REC',
        amountPaise: Number(data.amountPaise) || 0,
        date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent',
        eventName: data.eventName,
      });
    });
  } catch (err) {
    console.warn('Firebase getDonorHistoryByPhone query fallback:', err);
  }

  // 2. Also check local storage fallback (for offline or local session)
  if (typeof window !== 'undefined') {
    try {
      const localOffers = JSON.parse(localStorage.getItem('masjid_user_offers') || '[]');
      localOffers.forEach((lo: any) => {
        if (!result.offers.some((o) => o.id === lo.id)) {
          const total = Number(lo.totalOfferedPaise) || 0;
          const paid = Number(lo.paidPaise) || 0;
          result.totalOfferedPaise += total;
          result.totalPaidPaise += paid;
          result.offers.push({
            id: lo.id,
            offerType: lo.offerType || 'custom',
            quantity: lo.quantity || 1,
            totalOfferedPaise: total,
            paidPaise: paid,
            remainingPaise: Math.max(0, total - paid),
            status: lo.status || 'pledged',
            date: lo.date || 'Recent',
            eventName: lo.eventName,
            eventId: lo.eventId,
          });
        }
      });

      const localCash = JSON.parse(localStorage.getItem('masjid_cash_collections') || '[]');
      localCash.forEach((lc: any) => {
        const phoneMatch = lc.contributorPhone && lc.contributorPhone.replace(/\D/g, '').slice(-10) === cleanPhone;
        if (phoneMatch && !result.recentCashPayments.some((p) => p.receiptNumber === lc.receiptNumber)) {
          if (lc.contributorName && result.contributorName === 'Well Wisher') {
            result.contributorName = lc.contributorName;
          }
          result.recentCashPayments.push({
            id: lc.receiptNumber,
            receiptNumber: lc.receiptNumber,
            amountPaise: Number(lc.amountPaise) || 0,
            date: lc.date || 'Recent',
            eventName: lc.eventName,
          });
        }
      });
    } catch (e) {}
  }

  result.remainingPaise = Math.max(0, result.totalOfferedPaise - result.totalPaidPaise);
  return result;
}

// 3. Real-time Listener for Event-Specific Aggregates (Live Screen in Event Mode)
export function subscribeToEventAggregates(
  eventId: string,
  onUpdate: (data: { totalOfferedPaise: number; totalVerifiedPaise: number; offerCount: number; name?: string }) => void
): Unsubscribe {
  const eventRef = doc(db, 'events', eventId);

  return onSnapshot(
    eventRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        onUpdate({
          totalOfferedPaise: d.totalOfferedPaise || 0,
          totalVerifiedPaise: d.totalVerifiedPaise || 0,
          offerCount: d.offerCount || 0,
          name: d.name || eventId,
        });
      } else {
        // Starts fresh from ZERO when event is newly created
        onUpdate({
          totalOfferedPaise: 0,
          totalVerifiedPaise: 0,
          offerCount: 0,
          name: eventId,
        });
      }
    },
    (error) => {
      console.warn('Firestore event subscription fallback:', error.message);
    }
  );
}

// 3. Real-time Listener for Campaign Aggregates (Live Screen & Home)
export function subscribeToCampaignAggregates(
  onUpdate: (data: CampaignAggregatesData) => void
): Unsubscribe {
  const docRef = doc(db, 'campaignAggregates', 'main');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CampaignAggregatesData;
        onUpdate(data);
      } else {
        // Fresh initial zero state when document does not exist yet
        onUpdate({
          targetAmountPaise: 1100000000,
          totalOfferedPaise: 0,
          totalVerifiedPaise: 0,
          offerCount: 0,
          verifiedCount: 0,
          centCount: 0,
          sqFtCount: 0,
          musallaCount: 0,
        });
      }
    },
    (error) => {
      console.warn('Firestore subscription fallback mode:', error.message);
    }
  );
}

// 4. Real-time Listener for Recent Feed (Live Screen Ticker)
export function subscribeToLiveFeed(
  onUpdate: (items: any[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'offers'),
    orderBy('createdAt', 'desc'),
    limit(10)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore live feed fallback mode:', error.message);
    }
  );
}

// 5. Fetch User Contribution History by Phone Number
export async function fetchUserContributionsFromFirebase(phone: string) {
  try {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const offersQuery = query(
      collection(db, 'offers'),
      where('contributorPhone', '==', cleanPhone)
    );
    const offersSnapshot = await getDocs(offersQuery);
    const offers = offersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const cashQuery = query(
      collection(db, 'cashCollections'),
      where('contributorPhone', '==', cleanPhone)
    );
    const cashSnapshot = await getDocs(cashQuery);
    const cashList = cashSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return { offers, cashList };
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    return { offers: [], cashList: [] };
  }
}
