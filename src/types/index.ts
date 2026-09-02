export type PeriodFilter = 
  | 'today' 
  | 'yesterday' 
  | '3d' 
  | '7d' 
  | '14d' 
  | '30d' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export type ROASCalculationBase = 'gross' | 'net';

export type CampaignLinkStatus = 'auto' | 'manual' | 'unlinked';

export type CaktoItemType = 'main' | 'order_bump' | 'additional';

export type CaktoPaymentMethod = 'credit_card' | 'pix' | 'boleto';

export type CaktoSaleStatus = 
  | 'approved' 
  | 'pending' 
  | 'refused' 
  | 'cancelled' 
  | 'refunded' 
  | 'chargeback';

export type HealthStatus = 'excellent' | 'healthy' | 'warning' | 'critical';

export type ActionCategory = 'action_required' | 'warning' | 'opportunity' | 'info';

export interface MetaTaxRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'percentage' | 'fixed';
  rate: number; // e.g. 10 for 10%
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  country: string;
  notes?: string;
  createdAt: string;
}

export interface ProductTarget {
  targetCpaIdeal: number;
  targetCpaAcceptable: number;
  targetCpaMax: number;
  targetRoasMin: number;
  targetRoasIdeal: number;
  targetMarginMin: number;
  minSpendForAnalysis: number;
  minSalesForAnalysis: number;
  primaryWindowDays: number;
}

export interface Product {
  id: string;
  name: string;
  internalCode: string;
  campaignCode: string; // e.g. "FOTO01" - matched in [FOTO01]
  status: 'active' | 'paused' | 'archived';
  category: string;
  startDate: string;
  notes?: string;
  
  // Data Traceability
  source?: 'manual' | 'cakto_api' | 'cakto_webhook';
  externalId?: string;
  importedAt?: string;

  // Cakto associations
  caktoProductIds: string[];
  caktoProductName?: string;
  caktoOfferIds: string[];
  caktoOfferName?: string;
  additionalCaktoIds: string[];
  relatedOffers: string[];
  orderBumpNames: string[];

  // Targets
  targets: ProductTarget;

  createdAt: string;
}

export interface MetaBusinessManager {
  id: string;
  metaBmId: string;
  name: string;
  accessToken?: string;
  isActive: boolean;
  verificationStatus?: string;
  createdAt?: string;
  lastSyncAt?: string | null;
  adAccountsCount?: number;
  campaignsCount?: number;
  lastError?: string | null;
  isManual?: boolean;
}

export interface MetaAdAccount {
  id: string;
  connectionId: string;
  accountName: string;
  bmId?: string;
  bmName: string;
  currency: string;
  status: 'active' | 'disabled';
  spendCap?: number;
  source?: 'meta_api';
  externalId?: string;
  importedAt?: string;
}

export interface CampaignDailyMetric {
  id: string;
  campaignId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  outboundClicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  results: number;
  costPerResult: number;
  conversions: number;
  conversionValue: number;
  accountCurrency: string;
}

export interface CaktoCatalogOffer {
  id: string; // Official Cakto offer ID
  productId: string;
  name: string;
  price: number;
  status: string;
  isOrderBump?: boolean;
  checkoutUrl?: string;
}

export interface CaktoCatalogProduct {
  id: string; // Official Cakto product ID
  name: string;
  description?: string;
  price: number;
  status: string;
  category?: string;
  productType?: string;
  imageUrl?: string;
  createdAt?: string;
  offers: CaktoCatalogOffer[];
}

export interface Campaign {
  id: string;
  accountId: string;
  accountName: string;
  campaignId: string; // Meta Official ID
  campaignName: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  dailyBudget: number;
  linkStatus: CampaignLinkStatus;
  linkedProductId?: string;
  linkedProductName?: string;
  linkedProductCode?: string;

  // Data Traceability
  source?: 'meta_api' | 'manual';
  externalId?: string; // Official Meta Campaign ID
  importedAt?: string;
  
  // Accumulated/Filtered Metrics
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  clicks: number;
  cpc: number;
  ctr: number;
  results: number; // Meta reported purchases
  costPerResult: number; // Meta reported CPA
  conversionValue: number; // Meta reported revenue
  metaRoas: number;
  
  updatedAt: string;
}

export interface CaktoTransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  offerId: string;
  offerName: string;
  itemType: CaktoItemType;
  grossAmount: number;
  paidAmount: number;
  netAmount: number;
}

export interface CaktoTransaction {
  id: string;
  transactionId: string; // Official Cakto ID
  orderId: string;
  productId: string;
  productName: string;
  productInternalId?: string; // Linked system product ID
  offerId: string;
  offerName: string;
  date: string; // ISO String
  status: CaktoSaleStatus;
  grossAmount: number;
  paidAmount: number;
  netAmount: number;
  buyerName?: string;
  buyerEmail?: string;
  paymentMethod: CaktoPaymentMethod;
  installments: number;
  origin: string;
  eventType: string;
  items: CaktoTransactionItem[];
  rawPayload?: Record<string, any>;
}

export interface FinancialSummary {
  metaSpend: number;
  metaTaxes: number;
  realCost: number; // Spend + Taxes
  totalOrders: number;
  approvedSales: number;
  itemsSold: number;
  mainProductRevenue: number;
  orderBumpRevenue: number;
  grossRevenue: number;
  netRevenue: number;
  effectiveRevenue: number; // based on config gross/net
  realCpa: number; // realCost / approvedSales
  realRoas: number; // effectiveRevenue / realCost
  profit: number; // effectiveRevenue - realCost
  margin: number; // (profit / effectiveRevenue) * 100
  breakEvenCpa: number; // average ticket
  averageTicket: number;
  refundsCount: number;
  refundsAmount: number;
  chargebacksCount: number;
  chargebacksAmount: number;
  refundRate: number;
}

export interface ProductMetricSummary extends FinancialSummary {
  productId: string;
  productName: string;
  productCode: string;
  campaignCount: number;
  activeCampaignCount: number;
  healthScore: number;
  healthStatus: HealthStatus;
  previousPeriod?: Partial<FinancialSummary>;
  changes?: {
    spendChange: number;
    revenueChange: number;
    cpaChange: number;
    roasChange: number;
    salesChange: number;
    profitChange: number;
  };
}

export interface AIActionItem {
  id: string;
  category: ActionCategory;
  title: string;
  subtitle: string;
  productId?: string;
  productName?: string;
  campaignId?: string;
  campaignName?: string;
  currentCpa?: number;
  targetCpa?: number;
  roas?: number;
  trendText?: string;
  diagnosis: string;
  possibleCause: string;
  recommendation: string;
  metricsSnapshot: {
    cpa: number;
    roas: number;
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
    spend: number;
    sales: number;
  };
  analyzed: boolean;
  createdAt: string;
}

export interface AIDailySummary {
  date: string;
  activeProductsCount: number;
  healthyCount: number;
  opportunityCount: number;
  attentionCount: number;
  highRiskCount: number;
  totalSpend: number;
  totalRevenue: number;
  totalRoas: number;
  averageCpa: number;
  summaryText: string;
  topRecommendations: string[];
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  integration: 'Cakto' | 'Meta' | 'IA' | 'System';
  event: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  payload?: any;
}

export interface SystemAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  resolved: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export type AppMode = 'production' | 'demo';

export interface IntegrationStatus {
  meta: {
    connected: boolean;
    user?: { id: string; name: string } | null;
    businessManagers: MetaBusinessManager[];
    connectionName?: string;
    lastSyncAt: string | null;
    lastSuccessSyncAt?: string | null;
    accountsCount: number;
    campaignsCount: number;
    error: string | null;
    syncing: boolean;
  };
  cakto: {
    connected: boolean;
    apiConnected: boolean;
    catalogLastSyncAt: string | null;
    productsCount: number;
    offersCount: number;
    lastEventAt: string | null;
    lastEventType?: string | null;
    transactionsCount: number;
    webhookActive: boolean;
    webhookUrl?: string;
    error: string | null;
    syncing: boolean;
  };
  supabase: {
    connected: boolean;
    url: string | null;
    error: string | null;
  };
}

export interface GlobalSettings {
  appMode: AppMode;
  roasCalculationBase: ROASCalculationBase;
  currency: string;
  metaSyncIntervalMinutes: number;
  metaAccessToken?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaAdAccountId?: string;
  caktoWebhookSecret: string;
  caktoApiToken?: string;
  caktoClientId?: string;
  caktoClientSecret?: string;
  caktoApiUrl?: string;
  geminiModel: string;
  geminiAnalysisIntervalHours: number;
  minSpendForAiDecision: number;
  aiStrictCautionMode: boolean;
  supabaseConfigured: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}
