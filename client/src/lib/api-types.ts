export interface RecentPriceDrop {
  listingId: string;
  productId: string;
  productName: string;
  storeName: string;
  previousPrice: number;
  currentPrice: number;
  dropPercent: number;
  currencyCode: string;
  recordedAt: string;
}

export interface TrendingProductCard {
  productId: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  newTrackingsInWindow: number;
}

export interface PopularCategoryCard {
  categoryId: number;
  name: string;
  newTrackingsInWindow: number;
}

export interface RecentProductCard {
  productId: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  addedAtUtc: string;
  verifiedOfferCount: number;
}

export interface RecentStoreCard {
  storeId: string;
  name: string;
  country: string;
  currencyCode?: string | null;
  addedAtUtc: string;
  verifiedOfferCount: number;
}

export interface DiscoveryOverviewResponse {
  generatedAtUtc: string;
  activityWindowDays: number;
  trendingProducts: TrendingProductCard[];
  popularCategories: PopularCategoryCard[];
  recentlyAddedProducts: RecentProductCard[];
  recentlyAddedStores: RecentStoreCard[];
  bestRecentDeals: RecentPriceDrop[];
}

export interface ProductResponse {
  productId: string | null;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  storeName?: string | null;
  productUrl?: string | null;
  primaryImage?: string | null;
  lowestPrice?: number | null;
  currency?: string | null;
  currencyCode?: string | null;
  isVerified?: boolean;
}

export interface DealQualityAssessment {
  score?: number | null;
  reason?: string | null;
}

export interface ListingResponse {
  listingId: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  marketCountry?: string | null;
  productUrl: string;
  isActive: boolean;
  isExcluded: boolean;
  hasVerifiedPrice: boolean;
  lastScrapedAt?: string | null;
  currentPrice?: number | null;
  currencyCode?: string | null;
  currency?: string | null;
  dealQuality?: DealQualityAssessment | null;
}

export interface PriceObservation {
  id: string | number;
  price: number;
  currencyCode: string;
  recordedAt: string;
}

export interface TrackingResponse {
  trackingId: string;
  userId: string;
  productId: string;
  productName: string;
  categoryName?: string | null;
  marketCountry?: string | null;
  listingId?: string | null;
  storeName?: string | null;
  targetPrice: number;
  currencyCode: string;
  currentPrice?: number | null;
  currentPriceCurrencyCode?: string | null;
  currentPriceInTargetCurrency?: number | null;
  currentPriceInDisplayCurrency?: number | null;
  targetPriceInDisplayCurrency?: number | null;
  previousPriceInDisplayCurrency?: number | null;
  priceDropPercent?: number | null;
  currentPriceUpdatedAt?: string | null;
  isActive: boolean;
  notifyEmail: boolean;
  notifyFurtherDecreaseEmail?: boolean;
  createdAt: string;
}

export type NotificationEventType =
  "targetReached" | "furtherDecrease" | "trackingStopped";

export interface NotificationResponse {
  notificationId: number;
  productId?: string | null;
  trackingId: string;
  listingId?: string | null;
  eventType: NotificationEventType;
  productName: string;
  storeName: string;
  triggeredPrice: number;
  convertedTriggeredPrice?: number | null;
  conversionRate?: number | null;
  rateUpdatedAtUtc?: string | null;
  triggeredCurrencyCode: string;
  targetCurrencyCode: string;
  targetPrice: number;
  currencyCode: string;
  channel: string;
  status: string;
  isRead: boolean;
  sentAt: string;
}

export interface ProductFeedItem {
  productId: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  primaryImage?: string | null;
  lowestPrice?: number | null;
  currency?: string | null;
  currencyCode?: string | null;
  storeCount?: number;
  previousPrice?: number | null;
  previousRecordedAt?: string | null;
  priceChangePercent?: number | null;
}
