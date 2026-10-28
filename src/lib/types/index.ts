export type OfferType = 'cash' | 'cent' | 'sqft' | 'musalla' | 'percentage' | 'custom';
export type CommitmentType = 'one_time' | 'installments';
export type PaymentMethod = 'ONLINE' | 'CASH';
export type OfferStatus = 'pending' | 'verified' | 'failed' | 'cancelled' | 'refunded' | 'pledged';
export type CashCollectionStatus = 'pending_verification' | 'verified' | 'rejected' | 'adjusted';
export type AdminRole = 'super_admin' | 'collection_admin' | 'event_operator';

export interface CampaignConfig {
  id: string;
  name: string;
  targetAmountPaise: number;
  landAreaCent: number;
  landAreaSqFt: number;
  centRatePaise: number;
  sqFtRatePaise: number;
  musallaRatePaise: number;
  musallaSqFt: number;
  musallaPackage5Paise: number;
  minCustomAmountPaise: number;
  maxCustomAmountPaise: number;
  liveScreenMode: 'totals_only' | 'anonymous_feed' | 'public_feed';
  pricingVersion: number;
  updatedAt: string;
}

export interface CampaignAggregates {
  totalVerifiedPaise: number;
  totalOnlinePaise: number;
  totalCashPaise: number;
  pendingCashPaise: number;
  totalCentUnits: number;
  totalSqFtUnits: number;
  totalMusallaUnits: number;
  totalDonorsCount: number;
  totalOffersCount: number;
  lastUpdated: string;
}

export interface Contributor {
  id: string;
  fullName?: string;
  normalizedPhone: string;
  phoneCountryCode: string;
  email?: string;
  address?: string;
  allowPublicDisplay: boolean;
  totalContributedPaise: number;
  createdAt: string;
}

export interface Offer {
  id: string;
  offerNumber: string;
  contributorId: string;
  contributorName?: string;
  contributorPhone: string;
  contributorPlace?: string;
  offerType: OfferType;
  quantity: number;
  unitRatePaise: number;
  totalAmountPaise: number;
  commitmentType?: CommitmentType;
  commitmentMonths?: number;
  paidPaise?: number;
  status: OfferStatus;
  paymentChannel: 'online_gateway' | 'cash_in_hand';
  pricingVersion: number;
  eventId?: string;
  eventName?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface CashCollection {
  id: string;
  receiptNumber: string;
  offerId: string;
  contributorId: string;
  contributorName?: string;
  contributorPhone: string;
  amountPaise: number;
  offerType: OfferType;
  quantity: number;
  collectorUid: string;
  collectorName: string;
  eventId?: string;
  eventName?: string;
  status: CashCollectionStatus;
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface CampaignEvent {
  id: string;
  name: string;
  location: string;
  totalOfferedPaise: number;
  totalVerifiedPaise: number;
  offerCount: number;
  verifiedCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface Receipt {
  id: string;
  receiptSerial: string;
  offerId: string;
  contributorId: string;
  contributorName: string;
  contributorPhone: string;
  amountPaise: number;
  amountInWords: string;
  offerType: OfferType;
  quantity: number;
  unitRatePaise: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  issuedAt: string;
  verificationToken: string;
}

export interface PublicAnnouncement {
  id: string;
  displayName: string;
  offerType: OfferType;
  quantity: number;
  amountPaise: number;
  timestamp: string;
  isHighlighted?: boolean;
}
