import { CampaignConfig, CampaignAggregates, Offer, CashCollection, PublicAnnouncement, Contributor, CampaignEvent } from '../types';

export const INITIAL_CAMPAIGN: CampaignConfig = {
  id: 'main',
  name: 'Salafi Masjid Land Acquisition & Development',
  targetAmountPaise: 1100000000, // ₹1,10,00,000
  landAreaCent: 19.5,
  landAreaSqFt: 8494.2,
  centRatePaise: 56410300,       // ₹5,64,103
  sqFtRatePaise: 129500,         // ₹1,295
  musallaRatePaise: 1036000,     // ₹10,360
  musallaSqFt: 8.0,
  musallaPackage5Paise: 5180000, // ₹51,800
  minCustomAmountPaise: 1000,   // ₹10
  maxCustomAmountPaise: 100000000, // ₹10,00,000
  liveScreenMode: 'anonymous_feed',
  pricingVersion: 1,
  updatedAt: new Date().toISOString(),
};

export const INITIAL_AGGREGATES: CampaignAggregates = {
  totalVerifiedPaise: 0,
  totalOnlinePaise: 0,
  totalCashPaise: 0,
  pendingCashPaise: 0,
  totalCentUnits: 0,
  totalSqFtUnits: 0,
  totalMusallaUnits: 0,
  totalDonorsCount: 0,
  totalOffersCount: 0,
  lastUpdated: new Date().toISOString(),
};

export const INITIAL_ANNOUNCEMENTS: PublicAnnouncement[] = [];

export const INITIAL_CASH_COLLECTIONS: CashCollection[] = [];

export const INITIAL_EVENTS: CampaignEvent[] = [];
