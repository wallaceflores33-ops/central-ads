import { 
  Product, 
  Campaign, 
  MetaAdAccount, 
  MetaBusinessManager,
  CampaignDailyMetric,
  CaktoCatalogProduct,
  CaktoCatalogOffer,
  MetaTaxRule, 
  CaktoTransaction, 
  CaktoTransactionItem, 
  CaktoPaymentMethod,
  IntegrationLog, 
  SystemAlert, 
  AIActionItem, 
  AIDailySummary, 
  GlobalSettings, 
  FinancialSummary, 
  ProductMetricSummary, 
  PeriodFilter, 
  HealthStatus,
  IntegrationStatus,
  AppMode
} from '../src/types/index.ts';
import { metaApi, MetaAdAccountRaw } from './metaApi.ts';
import { caktoApi } from './caktoApi.ts';
import { supabaseService } from './supabase.ts';

function generateProductCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0].slice(0, 3) + words[1].slice(0, 3)).slice(0, 6);
  }
  return clean.slice(0, 6) || 'PROD';
}

interface Dataset {
  products: Product[];
  metaBusinessManagers: MetaBusinessManager[];
  metaAdAccounts: MetaAdAccount[];
  campaigns: Campaign[];
  campaignDailyMetrics: CampaignDailyMetric[];
  caktoCatalogProducts: CaktoCatalogProduct[];
  caktoCatalogOffers: CaktoCatalogOffer[];
  caktoTransactions: CaktoTransaction[];
  metaTaxRules: MetaTaxRule[];
  integrationLogs: IntegrationLog[];
  alerts: SystemAlert[];
  aiActionItems: AIActionItem[];
}

export class CentralAdsStore {
  // 1. Production dataset (Zero fake data - starts 100% real)
  private realData: Dataset = {
    products: [],
    metaBusinessManagers: [],
    metaAdAccounts: [],
    campaigns: [],
    campaignDailyMetrics: [],
    caktoCatalogProducts: [],
    caktoCatalogOffers: [],
    caktoTransactions: [],
    metaTaxRules: [
      {
        id: 'tax-2026-br',
        name: 'Imposto / IOF Meta Ads Brasil 2026',
        enabled: true,
        type: 'percentage',
        rate: 10.0,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        country: 'Brasil',
        notes: 'Taxa operacional e tributária sobre gastos no Meta Ads (faturas internacionais/cartão).',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    integrationLogs: [],
    alerts: [],
    aiActionItems: []
  };

  // 2. Demo dataset (Completely isolated for testing/preview only)
  private demoData: Dataset = {
    products: [],
    metaBusinessManagers: [],
    metaAdAccounts: [],
    campaigns: [],
    campaignDailyMetrics: [],
    caktoCatalogProducts: [],
    caktoCatalogOffers: [],
    caktoTransactions: [],
    metaTaxRules: [
      {
        id: 'tax-demo',
        name: 'Imposto / IOF Meta Ads 10%',
        enabled: true,
        type: 'percentage',
        rate: 10.0,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        country: 'Brasil',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    integrationLogs: [],
    alerts: [],
    aiActionItems: []
  };

  public globalSettings: GlobalSettings = {
    appMode: 'production', // ALWAYS DEFAULT TO PRODUCTION
    roasCalculationBase: 'gross',
    currency: 'BRL',
    metaSyncIntervalMinutes: 30,
    metaAccessToken: process.env.META_ACCESS_TOKEN || '',
    metaAppId: process.env.META_APP_ID || '',
    metaAppSecret: process.env.META_APP_SECRET || '',
    metaAdAccountId: process.env.META_AD_ACCOUNT_ID || '',
    caktoWebhookSecret: process.env.CAKTO_WEBHOOK_SECRET || 'cakto_sec_live_9f8d7a6b5c4e3d2a1',
    caktoApiToken: process.env.CAKTO_API_TOKEN || '',
    caktoClientId: process.env.CAKTO_CLIENT_ID || '',
    caktoClientSecret: process.env.CAKTO_CLIENT_SECRET || '',
    caktoApiUrl: process.env.CAKTO_API_URL || 'https://api.cakto.com.br',
    geminiModel: 'gemini-3.8-flash',
    geminiAnalysisIntervalHours: 6,
    minSpendForAiDecision: 150,
    aiStrictCautionMode: true,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };

  // Integration operational state
  public metaConnectedUser: { id: string; name: string } | null = null;
  public metaLastSyncAt: string | null = null;
  public metaLastSuccessSyncAt: string | null = null;
  public metaLastError: string | null = null;
  public isMetaSyncing: boolean = false;

  public caktoCatalogLastSyncAt: string | null = null;
  public caktoLastEventAt: string | null = null;
  public caktoLastEventType: string | null = null;
  public caktoLastError: string | null = null;
  public caktoWebhookActive: boolean = false;
  public isCaktoSyncing: boolean = false;

  public supabaseLastError: string | null = null;

  private processedWebhookKeys: Set<string> = new Set();

  constructor() {
    this.seedDemoData();
    this.initRealState();
  }

  private initRealState() {
    // In production mode, check initial alerts:
    if (!this.globalSettings.metaAccessToken) {
      this.realData.alerts.push({
        id: 'alert_meta_not_connected',
        type: 'meta_disconnected',
        title: 'Meta Ads não conectado',
        message: 'Configure as credenciais da integração Meta Marketing API nas Configurações para iniciar a sincronização de contas, campanhas e métricas reais.',
        severity: 'high',
        timestamp: new Date().toISOString(),
        resolved: false,
        actionUrl: 'settings',
        actionLabel: 'Conectar Meta Ads'
      });
    }

    this.realData.alerts.push({
      id: 'alert_cakto_webhook_pending',
      type: 'cakto_webhook_waiting',
      title: 'Cakto aguardando primeiro evento',
      message: 'Configure a URL de Webhook /api/webhooks/cakto ou sincronize o catálogo de produtos para carregar sua esteira de vendas.',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      resolved: false,
      actionUrl: 'settings',
      actionLabel: 'Configurar Cakto'
    });

    this.realData.integrationLogs.push({
      id: `log_init_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'System',
      event: 'Inicialização Central Ads',
      status: 'success',
      message: 'Modo Produção ativo. Banco de dados inicializado sem dados fictícios. Aguardando dados reais da Meta API e Cakto.'
    });
  }

  // Active dataset getter based on appMode
  private get activeData(): Dataset {
    return this.globalSettings.appMode === 'demo' ? this.demoData : this.realData;
  }

  public get products(): Product[] {
    return this.activeData.products;
  }
  public set products(val: Product[]) {
    this.activeData.products = val;
  }

  public get metaBusinessManagers(): MetaBusinessManager[] {
    return this.activeData.metaBusinessManagers;
  }
  public set metaBusinessManagers(val: MetaBusinessManager[]) {
    this.activeData.metaBusinessManagers = val;
  }

  public get metaAdAccounts(): MetaAdAccount[] {
    return this.activeData.metaAdAccounts;
  }
  public set metaAdAccounts(val: MetaAdAccount[]) {
    this.activeData.metaAdAccounts = val;
  }

  public get campaigns(): Campaign[] {
    return this.activeData.campaigns;
  }
  public set campaigns(val: Campaign[]) {
    this.activeData.campaigns = val;
  }

  public get campaignDailyMetrics(): CampaignDailyMetric[] {
    return this.activeData.campaignDailyMetrics;
  }
  public set campaignDailyMetrics(val: CampaignDailyMetric[]) {
    this.activeData.campaignDailyMetrics = val;
  }

  public get caktoCatalogProducts(): CaktoCatalogProduct[] {
    return this.activeData.caktoCatalogProducts;
  }
  public set caktoCatalogProducts(val: CaktoCatalogProduct[]) {
    this.activeData.caktoCatalogProducts = val;
  }

  public get caktoCatalogOffers(): CaktoCatalogOffer[] {
    return this.activeData.caktoCatalogOffers;
  }
  public set caktoCatalogOffers(val: CaktoCatalogOffer[]) {
    this.activeData.caktoCatalogOffers = val;
  }

  public get caktoTransactions(): CaktoTransaction[] {
    return this.activeData.caktoTransactions;
  }
  public set caktoTransactions(val: CaktoTransaction[]) {
    this.activeData.caktoTransactions = val;
  }

  public get metaTaxRules(): MetaTaxRule[] {
    return this.activeData.metaTaxRules;
  }
  public set metaTaxRules(val: MetaTaxRule[]) {
    this.activeData.metaTaxRules = val;
  }

  public get integrationLogs(): IntegrationLog[] {
    return this.activeData.integrationLogs;
  }
  public set integrationLogs(val: IntegrationLog[]) {
    this.activeData.integrationLogs = val;
  }

  public get alerts(): SystemAlert[] {
    return this.activeData.alerts;
  }
  public set alerts(val: SystemAlert[]) {
    this.activeData.alerts = val;
  }

  public get aiActionItems(): AIActionItem[] {
    return this.activeData.aiActionItems;
  }
  public set aiActionItems(val: AIActionItem[]) {
    this.activeData.aiActionItems = val;
  }

  // Integration Status
  public getIntegrationStatus(): IntegrationStatus {
    const isDemo = this.globalSettings.appMode === 'demo';

    return {
      meta: {
        connected: isDemo ? true : (this.realData.metaAdAccounts.length > 0 && !this.metaLastError),
        user: isDemo ? { id: "1000123456", name: "Gestor de Tráfego Demo" } : this.metaConnectedUser,
        businessManagers: isDemo 
          ? [{ id: "bm_demo", metaBmId: "bm_101", name: "BM Growth Demo", isActive: true, verificationStatus: "verified", adAccountsCount: 2, campaignsCount: 3 }]
          : this.activeData.metaBusinessManagers.map(b => ({
              ...b,
              accessToken: b.accessToken ? `••••${b.accessToken.slice(-4)}` : undefined
            })),
        connectionName: isDemo ? 'Meta Ads (Demonstração)' : (this.activeData.metaBusinessManagers[0]?.name || this.activeData.metaAdAccounts[0]?.bmName || 'Meta Marketing API'),
        lastSyncAt: isDemo ? '02/09/2026 12:42' : this.metaLastSyncAt,
        lastSuccessSyncAt: isDemo ? '02/09/2026 12:42' : this.metaLastSuccessSyncAt,
        accountsCount: this.metaAdAccounts.length,
        campaignsCount: this.campaigns.length,
        error: isDemo ? null : this.metaLastError,
        syncing: this.isMetaSyncing
      },
      cakto: {
        connected: isDemo ? true : (this.realData.caktoTransactions.length > 0 || this.caktoWebhookActive || this.realData.caktoCatalogProducts.length > 0),
        apiConnected: isDemo ? true : (this.realData.caktoCatalogProducts.length > 0 && !this.caktoLastError),
        catalogLastSyncAt: isDemo ? '02/09/2026 12:40' : this.caktoCatalogLastSyncAt,
        productsCount: isDemo ? 1 : this.realData.caktoCatalogProducts.length,
        offersCount: isDemo ? 2 : this.realData.caktoCatalogOffers.length,
        lastEventAt: isDemo ? '02/09/2026 12:40' : this.caktoLastEventAt,
        lastEventType: isDemo ? 'purchase_approved' : this.caktoLastEventType,
        transactionsCount: this.caktoTransactions.length,
        webhookActive: isDemo ? true : this.caktoWebhookActive,
        webhookUrl: '/api/webhooks/cakto',
        error: isDemo ? null : this.caktoLastError,
        syncing: this.isCaktoSyncing
      },
      supabase: {
        connected: isDemo ? true : this.globalSettings.supabaseConfigured,
        url: this.globalSettings.supabaseUrl || null,
        error: isDemo ? null : this.supabaseLastError
      }
    };
  }

  // Tax rate helper
  public getTaxRateForDate(dateStr: string): number {
    const activeRule = this.metaTaxRules.find(r => r.enabled);
    return activeRule ? activeRule.rate : 0.0;
  }

  // Auto-link campaigns to products by [CODE] or CODE in campaign name
  public autoLinkCampaigns(): number {
    let linkedCount = 0;
    for (const camp of this.campaigns) {
      let matchedProd: Product | undefined;

      // 1. Try bracket matching [CODE]
      const bracketMatch = camp.campaignName.match(/\[([A-Za-z0-9_-]+)\]/);
      if (bracketMatch) {
        const code = bracketMatch[1].toUpperCase();
        matchedProd = this.products.find(p => 
          p.campaignCode.toUpperCase() === code || 
          p.internalCode.toUpperCase() === code
        );
      }

      // 2. Try prefix or substring matching
      if (!matchedProd) {
        for (const prod of this.products) {
          const codeUpper = prod.campaignCode.toUpperCase();
          if (camp.campaignName.toUpperCase().includes(codeUpper)) {
            matchedProd = prod;
            break;
          }
        }
      }

      if (matchedProd) {
        camp.linkStatus = 'auto';
        camp.linkedProductId = matchedProd.id;
        camp.linkedProductName = matchedProd.name;
        camp.linkedProductCode = matchedProd.campaignCode;
        linkedCount++;
      } else {
        camp.linkStatus = 'unlinked';
        camp.linkedProductId = undefined;
        camp.linkedProductName = undefined;
        camp.linkedProductCode = undefined;
      }
    }
    return linkedCount;
  }

  // Link campaign manually
  public linkCampaignManually(campaignId: string, productId: string) {
    const camp = this.campaigns.find(c => c.id === campaignId || c.campaignId === campaignId);
    const prod = this.products.find(p => p.id === productId);
    if (!camp || !prod) {
      throw new Error('Campanha ou Produto não encontrado.');
    }

    camp.linkStatus = 'manual';
    camp.linkedProductId = prod.id;
    camp.linkedProductName = prod.name;
    camp.linkedProductCode = prod.campaignCode;

    // Resolve unlinked alert if any
    const alert = this.alerts.find(a => a.type === 'unlinked_campaign' && a.message.includes(camp.campaignName));
    if (alert) {
      alert.resolved = true;
    }

    this.integrationLogs.unshift({
      id: `log_manual_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Meta',
      event: 'Vinculação Manual',
      status: 'success',
      message: `Campanha "${camp.campaignName}" vinculada manualmente ao produto "${prod.name}".`,
      payload: { campaignId: camp.id, productId: prod.id }
    });

    return camp;
  }

  // --- Business Managers Management (Multi-BM) ---

  public getMetaBusinessManagers(): MetaBusinessManager[] {
    return this.metaBusinessManagers;
  }

  public async addMetaBusinessManager(data: {
    name?: string;
    metaBmId: string;
    accessToken?: string;
    isActive?: boolean;
  }): Promise<MetaBusinessManager> {
    const cleanBmId = (data.metaBmId || '').trim().replace(/^bm_/, '');
    if (!cleanBmId) {
      throw new Error('ID do Business Manager (Meta BM ID) é obrigatório.');
    }

    const cleanName = (data.name || '').trim() || `BM ${cleanBmId}`;
    const token = data.accessToken?.trim() || undefined;

    // Check if BM already exists in active dataset
    const existingIndex = this.metaBusinessManagers.findIndex(
      b => b.metaBmId === cleanBmId || b.id === `bm_${cleanBmId}`
    );

    let bm: MetaBusinessManager;
    if (existingIndex >= 0) {
      bm = {
        ...this.metaBusinessManagers[existingIndex],
        name: cleanName,
        metaBmId: cleanBmId,
        accessToken: token !== undefined ? token : this.metaBusinessManagers[existingIndex].accessToken,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        isManual: true
      };
      this.metaBusinessManagers[existingIndex] = bm;
    } else {
      bm = {
        id: `bm_${cleanBmId}`,
        metaBmId: cleanBmId,
        name: cleanName,
        accessToken: token,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdAt: new Date().toISOString(),
        lastSyncAt: null,
        adAccountsCount: 0,
        campaignsCount: 0,
        isManual: true
      };
      this.metaBusinessManagers.push(bm);
    }

    this.integrationLogs.unshift({
      id: `log_bm_add_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Meta',
      event: 'BM_CONFIGURED',
      status: 'success',
      message: `Business Manager "${bm.name}" (ID: ${bm.metaBmId}) configurado com sucesso (${bm.accessToken ? 'Token Dedicado' : 'Token Global'}).`,
      payload: { id: bm.id, metaBmId: bm.metaBmId, name: bm.name, hasCustomToken: Boolean(bm.accessToken) }
    });

    return bm;
  }

  public updateMetaBusinessManager(id: string, updates: Partial<MetaBusinessManager>): MetaBusinessManager {
    const bm = this.metaBusinessManagers.find(b => b.id === id || b.metaBmId === id);
    if (!bm) {
      throw new Error(`Business Manager com ID "${id}" não encontrado.`);
    }

    if (updates.name !== undefined && updates.name.trim()) bm.name = updates.name.trim();
    if (updates.metaBmId !== undefined && updates.metaBmId.trim()) bm.metaBmId = updates.metaBmId.trim().replace(/^bm_/, '');
    if (updates.accessToken !== undefined) bm.accessToken = updates.accessToken.trim() || undefined;
    if (updates.isActive !== undefined) bm.isActive = Boolean(updates.isActive);
    if (updates.verificationStatus !== undefined) bm.verificationStatus = updates.verificationStatus;

    return bm;
  }

  public deleteMetaBusinessManager(id: string): boolean {
    const idx = this.metaBusinessManagers.findIndex(b => b.id === id || b.metaBmId === id);
    if (idx < 0) return false;

    const removed = this.metaBusinessManagers.splice(idx, 1)[0];

    // Invalidate / remove association with accounts belonging to this BM
    const removedBmId = removed.metaBmId || removed.id;
    this.activeData.metaAdAccounts = this.activeData.metaAdAccounts.filter(
      a => a.bmId !== removedBmId && a.bmId !== removed.id
    );

    // Unlink campaigns of accounts that belonged to this BM
    for (const c of this.activeData.campaigns) {
      if (!this.activeData.metaAdAccounts.some(a => a.id === c.accountId)) {
        c.linkStatus = 'unlinked';
      }
    }

    // Historical financial transactions and metrics are STRICTLY preserved
    this.integrationLogs.unshift({
      id: `log_bm_del_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Meta',
      event: 'BM_REMOVED',
      status: 'warning',
      message: `Business Manager "${removed.name}" (ID: ${removed.metaBmId}) removida. Token invalidado e contas desvinculadas. Histórico financeiro preservado.`,
      payload: { id: removed.id, metaBmId: removed.metaBmId }
    });
    return true;
  }

  public deleteAdAccount(id: string): boolean {
    const cleanId = String(id).trim();
    const idx = this.activeData.metaAdAccounts.findIndex(a => a.id === cleanId || a.externalId === cleanId);
    if (idx < 0) return false;

    const removed = this.activeData.metaAdAccounts.splice(idx, 1)[0];

    // Mark campaigns of this account as unlinked
    for (const c of this.activeData.campaigns) {
      if (c.accountId === removed.id) {
        c.linkStatus = 'unlinked';
      }
    }

    this.integrationLogs.unshift({
      id: `log_acc_del_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Meta',
      event: 'CONTA_DESCONECTADA',
      status: 'warning',
      message: `Conta de anúncios "${removed.accountName}" (ID: ${removed.id}) foi desconectada com sucesso. Histórico de vendas preservado.`,
      payload: { accountId: removed.id, accountName: removed.accountName }
    });
    return true;
  }

  public async syncSingleAdAccount(accountId: string): Promise<{ success: boolean; account?: MetaAdAccount; campaignsCount: number; error?: string }> {
    const acc = this.activeData.metaAdAccounts.find(a => a.id === accountId || a.externalId === accountId);
    if (!acc) {
      return { success: false, campaignsCount: 0, error: "Conta de anúncios não encontrada." };
    }

    // Resolve token: dedicated BM token or global token
    let token = this.globalSettings.metaAccessToken?.trim() || process.env.META_ACCESS_TOKEN;
    if (acc.bmId) {
      const bm = this.metaBusinessManagers.find(b => b.metaBmId === acc.bmId || b.id === acc.bmId);
      if (bm?.accessToken?.trim()) {
        token = bm.accessToken.trim();
      }
    }

    if (!token) {
      return { success: false, campaignsCount: 0, error: "Nenhum token da Meta configurado para sincronizar esta conta." };
    }

    try {
      const campRes = await metaApi.fetchCampaigns(acc.id, token);
      const insightRes = await metaApi.fetchInsights(acc.id, token, 'last_30d');
      const dailyRes = await metaApi.fetchDailyInsights(acc.id, token, 'last_30d');

      const insightsMap = new Map<string, any>();
      if (insightRes.success && Array.isArray(insightRes.insights)) {
        for (const ins of insightRes.insights) {
          insightsMap.set(ins.campaign_id, ins);
        }
      }

      const newCampaigns: Campaign[] = [];
      if (campRes.success && Array.isArray(campRes.campaigns)) {
        for (const c of campRes.campaigns) {
          const ins = insightsMap.get(c.id);
          const spend = ins && ins.spend ? Number(ins.spend) : 0;
          const impressions = ins && ins.impressions ? Number(ins.impressions) : 0;
          const reach = ins && ins.reach ? Number(ins.reach) : 0;
          const clicks = ins && ins.clicks ? Number(ins.clicks) : 0;
          const cpm = ins && ins.cpm ? Number(ins.cpm) : 0;
          const cpc = ins && ins.cpc ? Number(ins.cpc) : 0;
          const ctr = ins && ins.ctr ? Number(ins.ctr) : 0;
          const frequency = ins && ins.frequency ? Number(ins.frequency) : 0;

          let results = 0;
          let conversionValue = 0;
          if (ins && Array.isArray(ins.actions)) {
            const purchaseAction = ins.actions.find((a: any) => 
              a.action_type === 'purchase' || 
              a.action_type === 'omni_purchase' || 
              a.action_type === 'offsite_conversion.fb_pixel_purchase'
            );
            if (purchaseAction) results = Number(purchaseAction.value || 0);
          }
          if (ins && Array.isArray(ins.action_values)) {
            const purchaseValue = ins.action_values.find((a: any) => 
              a.action_type === 'purchase' || 
              a.action_type === 'omni_purchase' || 
              a.action_type === 'offsite_conversion.fb_pixel_purchase'
            );
            if (purchaseValue) conversionValue = Number(purchaseValue.value || 0);
          }

          const costPerResult = results > 0 ? spend / results : 0;
          const metaRoas = spend > 0 ? conversionValue / spend : 0;

          newCampaigns.push({
            id: c.id,
            accountId: acc.id,
            accountName: acc.accountName,
            campaignId: c.id,
            campaignName: c.name,
            status: c.status,
            dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
            linkStatus: 'unlinked',
            spend,
            impressions,
            reach,
            frequency,
            cpm,
            clicks,
            cpc,
            ctr,
            results,
            costPerResult,
            conversionValue,
            metaRoas,
            source: 'meta_api',
            externalId: c.id,
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update in activeData
      const otherCampaigns = this.activeData.campaigns.filter(c => c.accountId !== acc.id);
      this.activeData.campaigns = [...otherCampaigns, ...newCampaigns];

      if (dailyRes.success && Array.isArray(dailyRes.dailyInsights)) {
        const otherDaily = this.activeData.campaignDailyMetrics.filter(m => m.accountId !== acc.id);
        const parsedDaily: CampaignDailyMetric[] = dailyRes.dailyInsights.map((d: any) => {
          let dailyPurchases = 0;
          let dailyConversionVal = 0;
          if (Array.isArray(d.actions)) {
            const p = d.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
            if (p) dailyPurchases = Number(p.value || 0);
          }
          if (Array.isArray(d.action_values)) {
            const pv = d.action_values.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
            if (pv) dailyConversionVal = Number(pv.value || 0);
          }
          let outboundClicks = 0;
          let linkClicks = 0;
          if (Array.isArray(d.actions)) {
            const lc = d.actions.find((a: any) => a.action_type === 'link_click');
            if (lc) linkClicks = Number(lc.value || 0);
          }
          if (Array.isArray(d.outbound_clicks) && d.outbound_clicks[0]) {
            outboundClicks = Number(d.outbound_clicks[0].value || 0);
          }
          const dSpend = Number(d.spend || 0);
          return {
            id: `metric_${acc.id}_${d.campaign_id}_${d.date_start}`,
            accountId: acc.id,
            campaignId: d.campaign_id,
            date: d.date_start || new Date().toISOString().split('T')[0],
            spend: dSpend,
            impressions: Number(d.impressions || 0),
            reach: Number(d.reach || 0),
            frequency: Number(d.frequency || 0),
            clicks: Number(d.clicks || 0),
            outboundClicks,
            linkClicks,
            ctr: Number(d.ctr || 0),
            cpc: Number(d.cpc || 0),
            cpm: Number(d.cpm || 0),
            results: dailyPurchases,
            costPerResult: dailyPurchases > 0 ? dSpend / dailyPurchases : 0,
            conversions: dailyPurchases,
            conversionValue: dailyConversionVal,
            accountCurrency: d.account_currency || acc.currency || 'BRL'
          };
        });
        this.activeData.campaignDailyMetrics = [...otherDaily, ...parsedDaily];
      }

      this.autoLinkCampaigns();
      acc.importedAt = new Date().toISOString();

      this.integrationLogs.unshift({
        id: `log_acc_sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'CONTA_SINCRONIZADA',
        status: 'success',
        message: `Conta "${acc.accountName}" sincronizada individualmente: ${newCampaigns.length} campanhas importadas/atualizadas.`,
        payload: { accountId: acc.id, campaignsCount: newCampaigns.length }
      });

      return { success: true, account: acc, campaignsCount: newCampaigns.length };
    } catch (err: any) {
      return { success: false, campaignsCount: 0, error: err.message || 'Erro ao sincronizar conta de anúncios.' };
    }
  }

  public deleteProduct(productId: string): boolean {
    const cleanId = String(productId).trim();
    const idx = this.products.findIndex(p => p.id === cleanId || p.internalCode === cleanId);
    if (idx < 0) return false;

    const prod = this.products.splice(idx, 1)[0];

    // Unlink linked campaigns without deleting campaign historical data
    for (const c of this.campaigns) {
      if (c.linkedProductId === prod.id) {
        c.linkedProductId = undefined;
        c.linkedProductName = undefined;
        c.linkStatus = 'unlinked';
      }
    }

    // Keep all financial Cakto transactions, just remove productInternalId
    for (const tx of this.caktoTransactions) {
      if (tx.productInternalId === prod.id) {
        tx.productInternalId = undefined;
      }
    }

    // Clear any unresolved alerts for this product
    this.alerts = this.alerts.filter(a => !a.id.includes(prod.id));

    this.integrationLogs.unshift({
      id: `log_prod_del_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'System',
      event: 'PRODUTO_EXCLUIDO',
      status: 'warning',
      message: `Produto "${prod.name}" [${prod.campaignCode}] excluído. Campanhas foram desvinculadas e o histórico financeiro foi preservado.`,
      payload: { productId: prod.id, name: prod.name }
    });

    return true;
  }

  public resetCaktoWebhook(): boolean {
    this.caktoWebhookActive = false;
    this.caktoLastEventAt = null;
    this.caktoLastEventType = null;

    this.integrationLogs.unshift({
      id: `log_wh_reset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Cakto',
      event: 'WEBHOOK_DESCONECTADO',
      status: 'warning',
      message: 'Configuração do webhook da Cakto foi redefinida/excluída da Central Ads.',
      payload: {}
    });

    return true;
  }

  public async testMetaBusinessManager(id: string): Promise<{ success: boolean; business?: any; error?: string }> {
    const bm = this.metaBusinessManagers.find(b => b.id === id || b.metaBmId === id);
    if (!bm) {
      return { success: false, error: "Business Manager não encontrado." };
    }

    const token = bm.accessToken?.trim() || this.globalSettings.metaAccessToken?.trim() || process.env.META_ACCESS_TOKEN;
    if (!token) {
      return { success: false, error: "Nenhum token configurado para este BM nem token global cadastrado." };
    }

    const res = await metaApi.testBusiness(bm.metaBmId, token);
    if (res.success && res.business) {
      bm.verificationStatus = res.business.verification_status;
      bm.lastError = null;
      if (!bm.name || bm.name.startsWith('BM ')) {
        bm.name = res.business.name;
      }
    } else {
      bm.lastError = res.error || "Falha ao validar BM com a Meta API.";
    }
    return res;
  }

  // Sync a single Business Manager specifically
  public async syncSingleBusinessManager(id: string): Promise<{
    success: boolean;
    businessManager?: MetaBusinessManager;
    accountsCount: number;
    campaignsCount: number;
    error?: string;
  }> {
    const bm = this.metaBusinessManagers.find(b => b.id === id || b.metaBmId === id);
    if (!bm) {
      return { success: false, accountsCount: 0, campaignsCount: 0, error: "Business Manager não encontrado." };
    }

    const token = bm.accessToken?.trim() || this.globalSettings.metaAccessToken?.trim() || process.env.META_ACCESS_TOKEN;
    if (!token) {
      const err = `Nenhum token de acesso configurado para a BM "${bm.name}".`;
      bm.lastError = err;
      return { success: false, accountsCount: 0, campaignsCount: 0, error: err };
    }

    this.isMetaSyncing = true;
    try {
      const bmAccs = await metaApi.fetchBusinessAdAccounts(bm.metaBmId, token);
      if (!bmAccs.success) {
        bm.lastError = bmAccs.error || "Erro ao buscar contas desta BM.";
        return { success: false, accountsCount: 0, campaignsCount: 0, error: bm.lastError };
      }

      bm.adAccountsCount = bmAccs.accounts.length;
      bm.lastSyncAt = new Date().toISOString();
      bm.lastError = null;

      // Fetch campaigns & daily metrics for accounts of this BM
      const accountsList = bmAccs.accounts;
      const parsedAccounts: MetaAdAccount[] = accountsList.map(a => ({
        id: a.id,
        connectionId: 'conn_meta_real',
        accountName: a.name || `Conta ${a.account_id}`,
        bmId: bm.metaBmId,
        bmName: bm.name,
        currency: a.currency || 'BRL',
        status: a.account_status === 1 ? 'active' : 'disabled',
        spendCap: a.spend_cap ? Number(a.spend_cap) / 100 : undefined,
        source: 'meta_api',
        externalId: a.account_id,
        importedAt: new Date().toISOString()
      }));

      const newCampaigns: Campaign[] = [];
      const newDailyMetrics: CampaignDailyMetric[] = [];

      for (const acc of accountsList) {
        const campRes = await metaApi.fetchCampaigns(acc.id, token);
        const insightRes = await metaApi.fetchInsights(acc.id, token, 'last_30d');
        const dailyRes = await metaApi.fetchDailyInsights(acc.id, token, 'last_30d');

        const insightsMap = new Map<string, any>();
        if (insightRes.success && Array.isArray(insightRes.insights)) {
          for (const ins of insightRes.insights) {
            insightsMap.set(ins.campaign_id, ins);
          }
        }

        if (dailyRes.success && Array.isArray(dailyRes.dailyInsights)) {
          for (const d of dailyRes.dailyInsights) {
            let dailyPurchases = 0;
            let dailyConversionVal = 0;
            let linkClicks = 0;
            let outboundClicks = 0;

            if (Array.isArray(d.actions)) {
              const pAction = d.actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (pAction) dailyPurchases = Number(pAction.value || 0);

              const lAction = d.actions.find((a: any) => a.action_type === 'link_click');
              if (lAction) linkClicks = Number(lAction.value || 0);
            }

            if (Array.isArray(d.action_values)) {
              const pVal = d.action_values.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (pVal) dailyConversionVal = Number(pVal.value || 0);
            }

            if (Array.isArray(d.outbound_clicks) && d.outbound_clicks[0]) {
              outboundClicks = Number(d.outbound_clicks[0].value || 0);
            }

            const dSpend = Number(d.spend || 0);
            newDailyMetrics.push({
              id: `metric_${d.campaign_id}_${d.date_start}`,
              campaignId: d.campaign_id,
              accountId: acc.id,
              date: d.date_start || new Date().toISOString().split('T')[0],
              spend: dSpend,
              impressions: Number(d.impressions || 0),
              reach: Number(d.reach || 0),
              frequency: Number(d.frequency || 0),
              clicks: Number(d.clicks || 0),
              outboundClicks,
              linkClicks,
              ctr: Number(d.ctr || 0),
              cpc: Number(d.cpc || 0),
              cpm: Number(d.cpm || 0),
              results: dailyPurchases,
              costPerResult: dailyPurchases > 0 ? dSpend / dailyPurchases : 0,
              conversions: dailyPurchases,
              conversionValue: dailyConversionVal,
              accountCurrency: d.account_currency || acc.currency || 'BRL'
            });
          }
        }

        if (campRes.success && Array.isArray(campRes.campaigns)) {
          for (const c of campRes.campaigns) {
            const ins = insightsMap.get(c.id);
            const spend = ins && ins.spend ? Number(ins.spend) : 0;
            const impressions = ins && ins.impressions ? Number(ins.impressions) : 0;
            const reach = ins && ins.reach ? Number(ins.reach) : 0;
            const clicks = ins && ins.clicks ? Number(ins.clicks) : 0;
            const cpm = ins && ins.cpm ? Number(ins.cpm) : 0;
            const cpc = ins && ins.cpc ? Number(ins.cpc) : 0;
            const ctr = ins && ins.ctr ? Number(ins.ctr) : 0;
            const frequency = ins && ins.frequency ? Number(ins.frequency) : 0;

            let results = 0;
            let conversionValue = 0;
            if (ins && Array.isArray(ins.actions)) {
              const purchaseAction = ins.actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseAction) results = Number(purchaseAction.value || 0);
            }
            if (ins && Array.isArray(ins.action_values)) {
              const purchaseValue = ins.action_values.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseValue) conversionValue = Number(purchaseValue.value || 0);
            }

            const costPerResult = results > 0 ? spend / results : 0;
            const metaRoas = spend > 0 ? conversionValue / spend : 0;

            newCampaigns.push({
              id: c.id,
              accountId: acc.id,
              accountName: acc.name,
              campaignId: c.id,
              campaignName: c.name,
              status: c.status,
              dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
              linkStatus: 'unlinked',
              spend,
              impressions,
              reach,
              frequency,
              cpm,
              clicks,
              cpc,
              ctr,
              results,
              costPerResult,
              conversionValue,
              metaRoas,
              source: 'meta_api',
              externalId: c.id,
              importedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      bm.campaignsCount = newCampaigns.length;

      // Merge accounts: replace existing accounts of this BM
      const otherAccounts = this.activeData.metaAdAccounts.filter(a => a.bmId !== bm.metaBmId);
      this.activeData.metaAdAccounts = [...otherAccounts, ...parsedAccounts];

      // Merge campaigns: replace existing campaigns of these accounts
      const thisAccountIds = new Set(parsedAccounts.map(a => a.id));
      const otherCampaigns = this.activeData.campaigns.filter(c => !thisAccountIds.has(c.accountId));
      this.activeData.campaigns = [...otherCampaigns, ...newCampaigns];

      // Merge daily metrics
      const otherDaily = this.activeData.campaignDailyMetrics.filter(m => !thisAccountIds.has(m.accountId));
      this.activeData.campaignDailyMetrics = [...otherDaily, ...newDailyMetrics];

      this.autoLinkCampaigns();
      this.metaLastSyncAt = new Date().toISOString();
      this.metaLastSuccessSyncAt = this.metaLastSyncAt;
      this.metaLastError = null;

      this.integrationLogs.unshift({
        id: `log_bm_sync_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'BM_SYNC_SUCCESS',
        status: 'success',
        message: `BM "${bm.name}" sincronizada com sucesso: ${parsedAccounts.length} conta(s) e ${newCampaigns.length} campanha(s).`,
        payload: { bmId: bm.metaBmId, accountsCount: parsedAccounts.length, campaignsCount: newCampaigns.length }
      });

      return {
        success: true,
        businessManager: bm,
        accountsCount: parsedAccounts.length,
        campaignsCount: newCampaigns.length
      };
    } catch (err: any) {
      const errorMsg = err.message || "Falha ao sincronizar Business Manager.";
      bm.lastError = errorMsg;
      return { success: false, accountsCount: 0, campaignsCount: 0, error: errorMsg };
    } finally {
      this.isMetaSyncing = false;
    }
  }

  // Real Meta Sync Execution (Supports ALL configured BMs + Global Token)
  public async syncMeta(accessToken?: string): Promise<{
    success: boolean;
    user?: any;
    businessManagersCount: number;
    accountsCount: number;
    campaignsCount: number;
    error?: string;
  }> {
    const globalToken = accessToken || this.globalSettings.metaAccessToken || process.env.META_ACCESS_TOKEN;
    const hasAnyBmWithToken = this.metaBusinessManagers.some(b => b.isActive !== false && Boolean(b.accessToken?.trim()));

    if (!globalToken?.trim() && !hasAnyBmWithToken) {
      const err = "Nenhum Token da Meta Marketing API configurado. Adicione o Token Global ou cadastre um Business Manager com seu Token Dedicado.";
      this.metaLastError = err;
      this.integrationLogs.unshift({
        id: `log_sync_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'META_SYNC_ERROR',
        status: 'error',
        message: err
      });
      return { success: false, businessManagersCount: 0, accountsCount: 0, campaignsCount: 0, error: err };
    }

    this.isMetaSyncing = true;
    const startTime = new Date().toISOString();

    this.integrationLogs.unshift({
      id: `log_meta_sync_start_${Date.now()}`,
      timestamp: startTime,
      integration: 'Meta',
      event: 'META_SYNC_STARTED',
      status: 'warning',
      message: 'Iniciando sincronização real com a Meta Marketing API para todas as BMs configuradas.'
    });

    try {
      // 1. Identify User with Global Token if available
      if (globalToken?.trim()) {
        const userRes = await metaApi.testAccessToken(globalToken.trim());
        if (userRes.valid) {
          this.metaConnectedUser = userRes.user;
        }

        // Auto-discover BMs from global token and add any not yet present
        const bmRes = await metaApi.fetchBusinesses(globalToken.trim());
        if (bmRes.success && Array.isArray(bmRes.businesses)) {
          for (const b of bmRes.businesses) {
            const exists = this.metaBusinessManagers.find(existing => existing.metaBmId === b.id || existing.id === `bm_${b.id}`);
            if (!exists) {
              this.metaBusinessManagers.push({
                id: `bm_${b.id}`,
                metaBmId: b.id,
                name: b.name || `BM ${b.id}`,
                isActive: true,
                verificationStatus: b.verification_status,
                createdAt: b.created_time || new Date().toISOString(),
                adAccountsCount: 0,
                campaignsCount: 0,
                isManual: false
              });
            } else if (b.verification_status) {
              exists.verificationStatus = b.verification_status;
            }
          }
        }
      }

      // 2. Fetch Ad Accounts from each ACTIVE Business Manager
      interface AccountJob {
        raw: MetaAdAccountRaw;
        token: string;
        bmId: string;
        bmName: string;
      }

      const allAccountsMap = new Map<string, AccountJob>();
      const activeBms = this.metaBusinessManagers.filter(b => b.isActive !== false);

      for (const bm of activeBms) {
        const bmToken = bm.accessToken?.trim() || globalToken?.trim();
        if (!bmToken) {
          bm.lastError = "Nenhum token associado a este BM.";
          continue;
        }

        const bmAccs = await metaApi.fetchBusinessAdAccounts(bm.metaBmId, bmToken);
        if (bmAccs.success) {
          bm.adAccountsCount = bmAccs.accounts.length;
          bm.lastSyncAt = new Date().toISOString();
          bm.lastError = null;

          for (const a of bmAccs.accounts) {
            allAccountsMap.set(a.id, {
              raw: { ...a, business_id: bm.metaBmId, business_name: bm.name },
              token: bmToken,
              bmId: bm.metaBmId,
              bmName: bm.name
            });
          }
        } else {
          bm.lastError = bmAccs.error || "Falha ao buscar contas da BM";
        }
      }

      // Also discover direct accounts from Global Token (/me/adaccounts) if available
      if (globalToken?.trim()) {
        const directAccs = await metaApi.fetchAdAccounts(globalToken.trim());
        if (directAccs.success) {
          for (const a of directAccs.accounts) {
            if (!allAccountsMap.has(a.id)) {
              const matchedBm = this.metaBusinessManagers.find(b => b.metaBmId === a.business_id);
              allAccountsMap.set(a.id, {
                raw: a,
                token: globalToken.trim(),
                bmId: a.business_id || matchedBm?.metaBmId || 'direct',
                bmName: matchedBm?.name || a.business_name || 'Conta Direta'
              });
            }
          }
        }
      }

      const rawAccountJobs = Array.from(allAccountsMap.values());
      if (rawAccountJobs.length === 0) {
        this.metaLastError = "Nenhuma conta de anúncios encontrada nas BMs configuradas. Verifique permissões dos tokens cadastrados.";
        return {
          success: true,
          user: this.metaConnectedUser,
          businessManagersCount: this.metaBusinessManagers.length,
          accountsCount: 0,
          campaignsCount: 0
        };
      }

      // Convert to MetaAdAccount
      const parsedAccounts: MetaAdAccount[] = rawAccountJobs.map(job => ({
        id: job.raw.id,
        connectionId: 'conn_meta_real',
        accountName: job.raw.name || `Conta ${job.raw.account_id}`,
        bmId: job.bmId,
        bmName: job.bmName,
        currency: job.raw.currency || 'BRL',
        status: job.raw.account_status === 1 ? 'active' : 'disabled',
        spendCap: job.raw.spend_cap ? Number(job.raw.spend_cap) / 100 : undefined,
        source: 'meta_api',
        externalId: job.raw.account_id,
        importedAt: new Date().toISOString()
      }));

      // 3. Fetch campaigns and daily insights for each account using its BM's specific token
      const allCampaigns: Campaign[] = [];
      const allDailyMetrics: CampaignDailyMetric[] = [];
      const bmCampaignCountMap = new Map<string, number>();

      for (const job of rawAccountJobs) {
        const { raw: acc, token: accountToken, bmId } = job;
        const campRes = await metaApi.fetchCampaigns(acc.id, accountToken);
        const insightRes = await metaApi.fetchInsights(acc.id, accountToken, 'last_30d');
        const dailyRes = await metaApi.fetchDailyInsights(acc.id, accountToken, 'last_30d');

        const insightsMap = new Map<string, any>();
        if (insightRes.success && Array.isArray(insightRes.insights)) {
          for (const ins of insightRes.insights) {
            insightsMap.set(ins.campaign_id, ins);
          }
        }

        // Process Daily Insights
        if (dailyRes.success && Array.isArray(dailyRes.dailyInsights)) {
          for (const d of dailyRes.dailyInsights) {
            let dailyPurchases = 0;
            let dailyConversionVal = 0;
            let linkClicks = 0;
            let outboundClicks = 0;

            if (Array.isArray(d.actions)) {
              const pAction = d.actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (pAction) dailyPurchases = Number(pAction.value || 0);

              const lAction = d.actions.find((a: any) => a.action_type === 'link_click');
              if (lAction) linkClicks = Number(lAction.value || 0);
            }

            if (Array.isArray(d.action_values)) {
              const pVal = d.action_values.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (pVal) dailyConversionVal = Number(pVal.value || 0);
            }

            if (Array.isArray(d.outbound_clicks) && d.outbound_clicks[0]) {
              outboundClicks = Number(d.outbound_clicks[0].value || 0);
            }

            const dSpend = Number(d.spend || 0);
            allDailyMetrics.push({
              id: `metric_${d.campaign_id}_${d.date_start}`,
              campaignId: d.campaign_id,
              accountId: acc.id,
              date: d.date_start || new Date().toISOString().split('T')[0],
              spend: dSpend,
              impressions: Number(d.impressions || 0),
              reach: Number(d.reach || 0),
              frequency: Number(d.frequency || 0),
              clicks: Number(d.clicks || 0),
              outboundClicks,
              linkClicks,
              ctr: Number(d.ctr || 0),
              cpc: Number(d.cpc || 0),
              cpm: Number(d.cpm || 0),
              results: dailyPurchases,
              costPerResult: dailyPurchases > 0 ? dSpend / dailyPurchases : 0,
              conversions: dailyPurchases,
              conversionValue: dailyConversionVal,
              accountCurrency: d.account_currency || acc.currency || 'BRL'
            });
          }
        }

        // Process Campaigns
        if (campRes.success && Array.isArray(campRes.campaigns)) {
          for (const c of campRes.campaigns) {
            const ins = insightsMap.get(c.id);

            const spend = ins && ins.spend ? Number(ins.spend) : 0;
            const impressions = ins && ins.impressions ? Number(ins.impressions) : 0;
            const reach = ins && ins.reach ? Number(ins.reach) : 0;
            const clicks = ins && ins.clicks ? Number(ins.clicks) : 0;
            const cpm = ins && ins.cpm ? Number(ins.cpm) : 0;
            const cpc = ins && ins.cpc ? Number(ins.cpc) : 0;
            const ctr = ins && ins.ctr ? Number(ins.ctr) : 0;
            const frequency = ins && ins.frequency ? Number(ins.frequency) : 0;

            let results = 0;
            let conversionValue = 0;
            if (ins && Array.isArray(ins.actions)) {
              const purchaseAction = ins.actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseAction) results = Number(purchaseAction.value || 0);
            }
            if (ins && Array.isArray(ins.action_values)) {
              const purchaseValue = ins.action_values.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseValue) conversionValue = Number(purchaseValue.value || 0);
            }

            const costPerResult = results > 0 ? spend / results : 0;
            const metaRoas = spend > 0 ? conversionValue / spend : 0;

            allCampaigns.push({
              id: c.id,
              accountId: acc.id,
              accountName: acc.name,
              campaignId: c.id,
              campaignName: c.name,
              status: c.status,
              dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
              linkStatus: 'unlinked',
              spend,
              impressions,
              reach,
              frequency,
              cpm,
              clicks,
              cpc,
              ctr,
              results,
              costPerResult,
              conversionValue,
              metaRoas,
              source: 'meta_api',
              externalId: c.id,
              importedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            if (bmId) {
              bmCampaignCountMap.set(bmId, (bmCampaignCountMap.get(bmId) || 0) + 1);
            }
          }
        }
      }

      // Update campaigns count per BM
      for (const bm of this.metaBusinessManagers) {
        bm.campaignsCount = bmCampaignCountMap.get(bm.metaBmId) || 0;
      }

      // Update datasets
      this.realData.metaAdAccounts = parsedAccounts;
      this.realData.campaigns = allCampaigns;
      this.realData.campaignDailyMetrics = allDailyMetrics;

      // Auto-link campaigns to registered products
      const linked = this.autoLinkCampaigns();

      // Check unlinked campaigns and raise alert if any
      const unlinked = allCampaigns.filter(c => c.linkStatus === 'unlinked' && c.spend > 0);
      if (unlinked.length > 0) {
        const existingAlert = this.realData.alerts.find(a => a.type === 'unlinked_campaign');
        if (!existingAlert) {
          this.realData.alerts.unshift({
            id: `alert_unlinked_${Date.now()}`,
            type: 'unlinked_campaign',
            title: `${unlinked.length} Campanha(s) sem Produto Identificado`,
            message: `Identificamos campanhas gastando verba que não possuem código [PROD] correspondente a nenhum produto cadastrado.`,
            severity: 'high',
            timestamp: new Date().toISOString(),
            resolved: false,
            actionUrl: 'unlinked-campaigns',
            actionLabel: 'Vincular Campanhas'
          });
        }
      }

      const connAlert = this.realData.alerts.find(a => a.type === 'meta_disconnected');
      if (connAlert) {
        connAlert.resolved = true;
      }

      this.metaLastSyncAt = new Date().toISOString();
      this.metaLastSuccessSyncAt = this.metaLastSyncAt;
      this.metaLastError = null;

      this.realData.integrationLogs.unshift({
        id: `log_meta_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'META_SYNC_SUCCESS',
        status: 'success',
        message: `Sincronizadas ${this.metaBusinessManagers.length} BM(s), ${parsedAccounts.length} conta(s) e ${allCampaigns.length} campanha(s) reais da Meta Marketing API. ${linked} vinculadas automaticamente.`,
        payload: {
          user: this.metaConnectedUser,
          businessManagersCount: this.metaBusinessManagers.length,
          accountsCount: parsedAccounts.length,
          campaignsCount: allCampaigns.length,
          dailyMetricsCount: allDailyMetrics.length,
          linkedCount: linked,
          startedAt: startTime,
          finishedAt: this.metaLastSyncAt
        }
      });

      // Optional sync to Supabase if configured
      if (this.globalSettings.supabaseConfigured && this.globalSettings.supabaseUrl) {
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'meta_business_managers',
          this.realData.metaBusinessManagers
        );
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'meta_ad_accounts',
          parsedAccounts
        );
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'campaigns',
          allCampaigns
        );
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'campaign_daily_metrics',
          allDailyMetrics
        );
      }

      return {
        success: true,
        user: this.metaConnectedUser,
        businessManagersCount: this.metaBusinessManagers.length,
        accountsCount: parsedAccounts.length,
        campaignsCount: allCampaigns.length
      };
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido na Meta API.";
      this.metaLastError = errMsg;
      this.realData.integrationLogs.unshift({
        id: `log_meta_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'META_SYNC_ERROR',
        status: 'error',
        message: `🔴 Falha na sincronização Meta: ${errMsg}`
      });
      return { success: false, businessManagersCount: 0, accountsCount: 0, campaignsCount: 0, error: errMsg };
    } finally {
      this.isMetaSyncing = false;
    }
  }

  // Real Cakto Catalog Synchronization (Products + Offers with full multi-page pagination)
  public async syncCaktoCatalog(credentials?: { apiToken?: string; clientId?: string; clientSecret?: string; apiUrl?: string }): Promise<{
    success: boolean;
    productsCount: number;
    offersCount: number;
    error?: string;
  }> {
    const token = credentials?.apiToken || this.globalSettings.caktoApiToken || process.env.CAKTO_API_TOKEN;
    if (!token && !credentials?.clientId && !this.globalSettings.caktoClientId) {
      const err = "Token ou credenciais da API Cakto não configurados. Configure o token em Configurações > Cakto.";
      this.caktoLastError = err;
      this.integrationLogs.unshift({
        id: `log_cakto_sync_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'CAKTO_PRODUCTS_SYNC_ERROR',
        status: 'error',
        message: err
      });
      return { success: false, productsCount: 0, offersCount: 0, error: err };
    }

    this.isCaktoSyncing = true;
    this.integrationLogs.unshift({
      id: `log_cakto_sync_start_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Cakto',
      event: 'CAKTO_PRODUCTS_SYNC_STARTED',
      status: 'warning',
      message: 'Iniciando sincronização de catálogo com a API Cakto (percorrendo todas as páginas de produtos e ofertas)...'
    });

    try {
      const fetchRes = await caktoApi.fetchAllProductsAndOffers({
        apiToken: token,
        clientId: credentials?.clientId || this.globalSettings.caktoClientId,
        clientSecret: credentials?.clientSecret || this.globalSettings.caktoClientSecret,
        apiUrl: credentials?.apiUrl || this.globalSettings.caktoApiUrl
      });

      if (!fetchRes.success) {
        throw new Error(fetchRes.error || "Falha ao obter produtos da API Cakto.");
      }

      const { products: catalogProds, offersCount } = fetchRes;
      this.realData.caktoCatalogProducts = catalogProds;

      const allOffers: CaktoCatalogOffer[] = [];
      for (const p of catalogProds) {
        allOffers.push(...p.offers);
      }
      this.realData.caktoCatalogOffers = allOffers;

      // Upsert into this.realData.products without duplicating!
      let updatedCount = 0;
      let insertedCount = 0;

      for (const catProd of catalogProds) {
        const existing = this.realData.products.find(p => 
          p.externalId === catProd.id || 
          p.caktoProductIds.includes(catProd.id)
        );

        const offerIds = catProd.offers.map(o => o.id);
        const offerNames = catProd.offers.map(o => o.name);
        const bumpNames = catProd.offers.filter(o => o.isOrderBump).map(o => o.name);

        if (existing) {
          existing.name = catProd.name;
          existing.category = catProd.category || existing.category;
          existing.caktoProductName = catProd.name;
          existing.caktoOfferIds = Array.from(new Set([...existing.caktoOfferIds, ...offerIds]));
          existing.relatedOffers = Array.from(new Set([...existing.relatedOffers, ...offerNames]));
          existing.orderBumpNames = Array.from(new Set([...existing.orderBumpNames, ...bumpNames]));
          updatedCount++;
        } else {
          const campaignCode = generateProductCode(catProd.name);
          const newProduct: Product = {
            id: `prod_cakto_${catProd.id}`,
            name: catProd.name,
            internalCode: campaignCode,
            campaignCode: campaignCode,
            status: catProd.status === 'active' || catProd.status === 'ativo' ? 'active' : 'paused',
            category: catProd.category || 'Infoproduto / Digital',
            startDate: catProd.createdAt ? catProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: catProd.description || `Importado automaticamente da API Cakto em ${new Date().toLocaleDateString('pt-BR')}`,
            source: 'cakto_api',
            externalId: catProd.id,
            importedAt: new Date().toISOString(),
            caktoProductIds: [catProd.id],
            caktoProductName: catProd.name,
            caktoOfferIds: offerIds,
            caktoOfferName: offerNames[0] || 'Oferta Principal',
            additionalCaktoIds: [],
            relatedOffers: offerNames,
            orderBumpNames: bumpNames,
            targets: {
              targetCpaIdeal: catProd.price > 0 ? Math.round(catProd.price * 0.25) : 25.0,
              targetCpaAcceptable: catProd.price > 0 ? Math.round(catProd.price * 0.35) : 35.0,
              targetCpaMax: catProd.price > 0 ? Math.round(catProd.price * 0.50) : 50.0,
              targetRoasMin: 1.5,
              targetRoasIdeal: 2.5,
              targetMarginMin: 30.0,
              minSpendForAnalysis: 150,
              minSalesForAnalysis: 5,
              primaryWindowDays: 7
            },
            createdAt: catProd.createdAt || new Date().toISOString()
          };

          this.realData.products.push(newProduct);
          insertedCount++;
        }
      }

      // Automatically auto-link campaigns now that products are known!
      const newlyLinked = this.autoLinkCampaigns();

      this.caktoCatalogLastSyncAt = new Date().toISOString();
      this.caktoLastError = null;

      this.integrationLogs.unshift({
        id: `log_cakto_sync_ok_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'CAKTO_PRODUCTS_SYNC_SUCCESS',
        status: 'success',
        message: `Catálogo Cakto sincronizado com sucesso: ${catalogProds.length} produto(s) (${insertedCount} novos, ${updatedCount} atualizados) e ${offersCount} oferta(s). ${newlyLinked} campanha(s) vinculada(s).`,
        payload: {
          productsCount: catalogProds.length,
          offersCount,
          insertedCount,
          updatedCount,
          newlyLinkedCampaigns: newlyLinked,
          syncedAt: this.caktoCatalogLastSyncAt
        }
      });

      // Save to Supabase if configured
      if (this.globalSettings.supabaseConfigured && this.globalSettings.supabaseUrl) {
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'cakto_products',
          catalogProds
        );
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'cakto_offers',
          allOffers
        );
        await supabaseService.upsertRecords(
          { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
          'products',
          this.realData.products
        );
      }

      return {
        success: true,
        productsCount: catalogProds.length,
        offersCount
      };
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido na API Cakto.";
      this.caktoLastError = errMsg;
      this.integrationLogs.unshift({
        id: `log_cakto_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'CAKTO_PRODUCTS_SYNC_ERROR',
        status: 'error',
        message: `🔴 Falha na sincronização de produtos Cakto: ${errMsg}`
      });
      return { success: false, productsCount: 0, offersCount: 0, error: errMsg };
    } finally {
      this.isCaktoSyncing = false;
    }
  }

  // Cakto Webhook Ingestion with Idempotency, Nested Payload Unpacking, and Product Matching
  public processCaktoWebhook(payload: any): { success: boolean; message: string; transaction?: CaktoTransaction } {
    if (!payload || typeof payload !== "object") {
      return { success: true, message: "Webhook ping recebido com sucesso." };
    }

    // Unpack data object if nested (Cakto official format: { event, secret, data: { ... } })
    const data = payload.data && typeof payload.data === "object" ? payload.data : payload;

    const rawEvent = String(payload.event || payload.event_type || payload.type || data.event || data.type || 'purchase_approved');
    const eventType = rawEvent.toLowerCase();

    // Check if this is a test or ping event from Cakto panel
    const isTest = 
      eventType === 'test' || 
      eventType === 'ping' || 
      payload.test === true || 
      data.test === true ||
      (!data.id && !data.transaction_id && !data.refId && Object.keys(data).length <= 2);

    if (isTest) {
      this.caktoLastEventAt = new Date().toISOString();
      this.caktoLastEventType = 'teste_conexao';
      this.caktoWebhookActive = true;

      this.integrationLogs.unshift({
        id: `log_test_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'TESTE DE WEBHOOK RECEBIDO (SUCESSO)',
        status: 'success',
        message: 'Endpoint de Webhook testado e respondendo com 200 OK com sucesso pela Cakto.',
        payload: { raw: payload }
      });

      // Resolve "waiting for first webhook" alert
      const waitAlert = this.alerts.find(a => a.type === 'cakto_webhook_waiting');
      if (waitAlert) {
        waitAlert.resolved = true;
      }

      return {
        success: true,
        message: 'Webhook de teste da Cakto recebido e validado com sucesso! Conexão 100% ativa.'
      };
    }

    const transactionId = String(
      data.id || 
      data.transaction_id || 
      data.transactionId || 
      data.refId || 
      payload.transaction_id || 
      payload.id || 
      `cakto_tx_${Date.now()}`
    );

    const idempotencyKey = `${transactionId}_${eventType}`;

    this.integrationLogs.unshift({
      id: `log_webhook_rec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Cakto',
      event: 'CAKTO_WEBHOOK_RECEIVED',
      status: 'warning',
      message: `Payload de webhook recebido para transação ${transactionId} (evento: ${eventType}).`,
      payload: { transactionId, eventType }
    });

    if (this.processedWebhookKeys.has(idempotencyKey)) {
      this.integrationLogs.unshift({
        id: `log_dup_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'Webhook Duplicado Ignorado (Idempotência)',
        status: 'warning',
        message: `Evento já processado anteriormente para ${idempotencyKey}. Nenhuma alteração financeira duplicada foi gerada.`,
        payload: { idempotencyKey }
      });
      return { success: true, message: 'Evento já registrado (Idempotência).' };
    }

    this.processedWebhookKeys.add(idempotencyKey);
    this.caktoLastEventAt = new Date().toISOString();
    this.caktoLastEventType = eventType;
    this.caktoWebhookActive = true;

    // Identify product and offer across data and root
    const caktoProdId = String(
      data.product?.id || 
      data.product?.short_id || 
      data.product_id || 
      data.productId || 
      payload.product_id || 
      payload.productId || 
      payload.product?.id || 
      ''
    );
    const caktoOfferId = String(
      data.offer?.id || 
      data.offer_id || 
      data.offerId || 
      payload.offer_id || 
      payload.offerId || 
      payload.offer?.id || 
      ''
    );
    const caktoProdName = String(
      data.product?.name || 
      data.product_name || 
      payload.product_name || 
      payload.product?.name || 
      'Produto Cakto'
    );

    // Find or Auto-Create linked system product
    let systemProduct = this.products.find(p => 
      (caktoProdId && p.caktoProductIds.includes(caktoProdId)) || 
      (caktoOfferId && p.caktoOfferIds.includes(caktoOfferId)) ||
      (caktoProdName && p.name.toLowerCase().includes(caktoProdName.toLowerCase())) ||
      (caktoProdName && caktoProdName.toLowerCase().includes(p.name.toLowerCase()))
    );

    const rawGross = data.gross_amount ?? data.amount ?? data.paid_amount ?? data.price ?? payload.gross_amount ?? payload.amount ?? 0;
    const grossAmount = Number(rawGross) > 1000 ? Number(rawGross) / 100 : Number(rawGross);
    const rawNet = data.net_amount ?? data.liquid_amount ?? payload.net_amount ?? (grossAmount * 0.91);
    const netAmount = Number(rawNet) > 1000 ? Number(rawNet) / 100 : Number(rawNet);
    const paidAmount = grossAmount;

    // Auto-create product if not found
    if (!systemProduct && (caktoProdId || caktoProdName)) {
      const cleanCode = (caktoProdName || 'PROD')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) || 'CAKTO';
      
      const autoId = `prod_cakto_${caktoProdId || Date.now()}`;
      systemProduct = {
        id: autoId,
        name: caktoProdName,
        internalCode: cleanCode,
        campaignCode: cleanCode,
        status: 'active',
        category: 'Cakto Infoprodutos',
        startDate: new Date().toISOString().split('T')[0],
        source: 'cakto_webhook',
        externalId: caktoProdId || undefined,
        importedAt: new Date().toISOString(),
        caktoProductIds: caktoProdId ? [caktoProdId] : [],
        caktoProductName: caktoProdName,
        caktoOfferIds: caktoOfferId ? [caktoOfferId] : [],
        caktoOfferName: data.offer?.name || payload.offer_name || 'Oferta Principal',
        additionalCaktoIds: [],
        relatedOffers: caktoOfferId ? [caktoOfferId] : [],
        orderBumpNames: [],
        targets: {
          targetCpaIdeal: Math.max(10, Math.round(grossAmount * 0.35 * 100) / 100),
          targetCpaAcceptable: Math.max(15, Math.round(grossAmount * 0.45 * 100) / 100),
          targetCpaMax: Math.max(20, Math.round(grossAmount * 0.55 * 100) / 100),
          targetRoasMin: 1.6,
          targetRoasIdeal: 2.5,
          targetMarginMin: 35,
          minSpendForAnalysis: 100,
          minSalesForAnalysis: 3,
          primaryWindowDays: 7
        },
        createdAt: new Date().toISOString()
      };
      this.products.unshift(systemProduct);
      this.autoLinkCampaigns();

      this.integrationLogs.unshift({
        id: `log_auto_prod_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'PRODUTO_CRIADO_AUTOMATICAMENTE',
        status: 'success',
        message: `Produto "${caktoProdName}" criado automaticamente via Webhook (ID Cakto: ${caktoProdId || 'N/A'}, Código: [${cleanCode}]).`,
        payload: { product: systemProduct }
      });
    } else if (systemProduct) {
      let updated = false;
      if (caktoProdId && !systemProduct.caktoProductIds.includes(caktoProdId)) {
        systemProduct.caktoProductIds.push(caktoProdId);
        updated = true;
      }
      if (caktoOfferId && !systemProduct.caktoOfferIds.includes(caktoOfferId)) {
        systemProduct.caktoOfferIds.push(caktoOfferId);
        updated = true;
      }
      if (updated) {
        systemProduct.importedAt = new Date().toISOString();
      }
    }

    // Parse items / order bumps
    const items: CaktoTransactionItem[] = [];
    const rawItems = data.items || data.order_items || payload.items || payload.order_items || [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((it: any, idx: number) => {
        const itGross = Number(it.gross_amount || it.amount || 0);
        items.push({
          id: `item_${Date.now()}_${idx}`,
          transactionId: transactionId,
          productId: it.product_id || it.product?.id || caktoProdId,
          productName: it.product_name || it.product?.name || caktoProdName,
          offerId: it.offer_id || it.offer?.id || caktoOfferId,
          offerName: it.offer_name || it.offer?.name || 'Oferta Padrão',
          itemType: it.is_order_bump || it.item_type === 'order_bump' ? 'order_bump' : 'main',
          grossAmount: itGross > 1000 ? itGross / 100 : itGross,
          paidAmount: itGross > 1000 ? itGross / 100 : itGross,
          netAmount: Number(it.net_amount || (itGross * 0.91))
        });
      });
    } else {
      items.push({
        id: `item_${Date.now()}_0`,
        transactionId: transactionId,
        productId: caktoProdId,
        productName: caktoProdName,
        offerId: caktoOfferId,
        offerName: data.offer?.name || payload.offer_name || 'Oferta Principal',
        itemType: 'main',
        grossAmount: grossAmount,
        paidAmount: paidAmount,
        netAmount: netAmount
      });
    }

    const statusMap: Record<string, any> = {
      'purchase_approved': 'approved',
      'approved': 'approved',
      'paid': 'approved',
      'refunded': 'refunded',
      'refund': 'refunded',
      'chargeback': 'chargeback',
      'cancelled': 'cancelled',
      'waiting_payment': 'pending'
    };

    const buyerName = 
      data.customer?.name || 
      data.buyer?.name || 
      data.client?.name || 
      payload.buyer?.name || 
      payload.customer?.name || 
      'Comprador Cakto';

    const buyerEmail = 
      data.customer?.email || 
      data.buyer?.email || 
      data.client?.email || 
      payload.buyer?.email || 
      payload.customer?.email || 
      'comprador@cakto.com';

    const rawMethod = String(data.payment_method || data.paymentMethod || payload.payment_method || 'pix').toLowerCase();
    const paymentMethod: CaktoPaymentMethod = 
      rawMethod.includes('card') || rawMethod.includes('cred') || rawMethod.includes('cart') 
        ? 'credit_card' 
        : (rawMethod.includes('bol') ? 'boleto' : 'pix');

    const newTx: CaktoTransaction = {
      id: `tx_${Date.now()}`,
      transactionId: transactionId,
      orderId: String(data.order_id || data.orderId || data.refId || payload.order_id || `ord_${Date.now()}`),
      productId: caktoProdId || 'cakto_unknown',
      productName: caktoProdName,
      productInternalId: systemProduct?.id,
      offerId: caktoOfferId || 'off_unknown',
      offerName: data.offer?.name || payload.offer_name || 'Oferta Webhook',
      date: data.created_at || data.date || payload.created_at || new Date().toISOString(),
      status: statusMap[eventType] || 'approved',
      grossAmount,
      paidAmount,
      netAmount,
      buyerName,
      buyerEmail,
      paymentMethod,
      installments: Number(data.installments || payload.installments || 1),
      origin: 'cakto_webhook',
      eventType: eventType,
      items: items,
      rawPayload: payload
    };

    // Check if transaction already exists (e.g., status update from pending -> approved, or approved -> refunded)
    const existingTx = this.caktoTransactions.find(
      t => t.transactionId === transactionId || (newTx.orderId && t.orderId === newTx.orderId)
    );

    if (existingTx) {
      const oldStatus = existingTx.status;
      existingTx.status = statusMap[eventType] || existingTx.status;
      existingTx.eventType = eventType;
      existingTx.rawPayload = payload;
      if (systemProduct && !existingTx.productInternalId) {
        existingTx.productInternalId = systemProduct.id;
      }

      this.integrationLogs.unshift({
        id: `log_cakto_upd_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Cakto',
        event: 'STATUS_TRANSACAO_ATUALIZADO',
        status: 'success',
        message: `Transação ${transactionId} atualizada de "${oldStatus}" para "${existingTx.status}" via evento "${eventType}".`,
        payload: { transactionId, oldStatus, newStatus: existingTx.status, eventType }
      });

      return { success: true, message: `Transação ${transactionId} atualizada para o status "${existingTx.status}".`, transaction: existingTx };
    }

    this.caktoTransactions.unshift(newTx);

    // Resolve "waiting for first webhook" alert
    const waitAlert = this.alerts.find(a => a.type === 'cakto_webhook_waiting');
    if (waitAlert) {
      waitAlert.resolved = true;
    }

    this.integrationLogs.unshift({
      id: `log_cakto_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'Cakto',
      event: 'CAKTO_WEBHOOK_PROCESSED',
      status: 'success',
      message: `Transação real ${transactionId} processada com sucesso. ${systemProduct ? `Produto "${systemProduct.name}" identificado.` : 'Produto pendente de associação.'} R$ ${grossAmount.toFixed(2)}.`,
      payload: { transactionId, status: newTx.status, grossAmount, itemsCount: items.length }
    });

    // Sync to Supabase if configured
    if (this.globalSettings.supabaseConfigured && this.globalSettings.supabaseUrl) {
      supabaseService.upsertRecords(
        { url: this.globalSettings.supabaseUrl, key: this.globalSettings.supabaseAnonKey },
        'cakto_transactions',
        [newTx]
      );
    }

    return { success: true, message: 'Transação recebida e registrada com sucesso.', transaction: newTx };
  }

  // Dynamic Financial Summary Calculation from Real Data (Zero hardcoded numbers)
  public calculateFinancialSummary(period: PeriodFilter = '7d', productId?: string): FinancialSummary {
    let activeCampaigns = this.campaigns;
    let activeTransactions = this.caktoTransactions;

    if (productId) {
      activeCampaigns = activeCampaigns.filter(c => c.linkedProductId === productId);
      activeTransactions = activeTransactions.filter(t => t.productInternalId === productId);
    }

    const taxRate = this.getTaxRateForDate(new Date().toISOString().split('T')[0]);

    // Sum Meta spend
    const metaSpend = Math.round(activeCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0) * 100) / 100;
    const metaTaxes = Math.round((metaSpend * (taxRate / 100)) * 100) / 100;
    const realCost = Math.round((metaSpend + metaTaxes) * 100) / 100;

    // Filter transactions by status
    const approvedTx = activeTransactions.filter(t => t.status === 'approved');
    const refundsTx = activeTransactions.filter(t => t.status === 'refunded');
    const chargebackTx = activeTransactions.filter(t => t.status === 'chargeback');

    const totalOrders = activeTransactions.length;
    const approvedSales = approvedTx.length;

    let itemsSold = 0;
    let mainProductRevenue = 0;
    let orderBumpRevenue = 0;

    for (const tx of approvedTx) {
      for (const it of tx.items) {
        itemsSold++;
        if (it.itemType === 'order_bump') {
          orderBumpRevenue += (it.grossAmount || 0);
        } else {
          mainProductRevenue += (it.grossAmount || 0);
        }
      }
    }

    const grossRevenue = Math.round(approvedTx.reduce((sum, t) => sum + (t.grossAmount || 0), 0) * 100) / 100;
    const netRevenue = Math.round(approvedTx.reduce((sum, t) => sum + (t.netAmount || 0), 0) * 100) / 100;

    const effectiveRevenue = this.globalSettings.roasCalculationBase === 'net' ? netRevenue : grossRevenue;

    const realCpa = approvedSales > 0 ? Math.round((realCost / approvedSales) * 100) / 100 : 0;
    const realRoas = realCost > 0 ? Math.round((effectiveRevenue / realCost) * 100) / 100 : 0;
    const profit = Math.round((effectiveRevenue - realCost) * 100) / 100;
    const margin = effectiveRevenue > 0 ? Math.round((profit / effectiveRevenue) * 1000) / 10 : 0;

    const averageTicket = approvedSales > 0 ? Math.round((effectiveRevenue / approvedSales) * 100) / 100 : 0;
    const breakEvenCpa = averageTicket;

    const refundsCount = refundsTx.length;
    const refundsAmount = Math.round(refundsTx.reduce((sum, t) => sum + t.grossAmount, 0) * 100) / 100;

    const chargebacksCount = chargebackTx.length;
    const chargebacksAmount = Math.round(chargebackTx.reduce((sum, t) => sum + t.grossAmount, 0) * 100) / 100;

    const refundRate = totalOrders > 0 ? Math.round(((refundsCount + chargebacksCount) / totalOrders) * 1000) / 10 : 0;

    return {
      metaSpend,
      metaTaxes,
      realCost,
      totalOrders,
      approvedSales,
      itemsSold,
      mainProductRevenue: Math.round(mainProductRevenue * 100) / 100,
      orderBumpRevenue: Math.round(orderBumpRevenue * 100) / 100,
      grossRevenue,
      netRevenue,
      effectiveRevenue,
      realCpa,
      realRoas,
      profit,
      margin,
      breakEvenCpa,
      averageTicket,
      refundsCount,
      refundsAmount,
      chargebacksCount,
      chargebacksAmount,
      refundRate
    };
  }

  // Get Product Summaries dynamically
  public getProductMetricSummaries(period: PeriodFilter = '7d'): ProductMetricSummary[] {
    return this.products.map(prod => {
      const summary = this.calculateFinancialSummary(period, prod.id);
      const linkedCampaigns = this.campaigns.filter(c => c.linkedProductId === prod.id);
      const activeCampaigns = linkedCampaigns.filter(c => c.status === 'ACTIVE');

      let healthStatus: HealthStatus = 'healthy';
      let healthScore = 80;

      // If no spend and no sales yet:
      if (summary.realCost === 0 && summary.approvedSales === 0) {
        healthStatus = 'healthy';
        healthScore = 50;
      } else if (summary.realRoas >= prod.targets.targetRoasIdeal && summary.realCpa <= prod.targets.targetCpaIdeal) {
        healthStatus = 'excellent';
        healthScore = 95;
      } else if (summary.realCpa > prod.targets.targetCpaMax || (summary.realCost > prod.targets.minSpendForAnalysis && summary.approvedSales === 0)) {
        healthStatus = 'critical';
        healthScore = 30;
      } else if (summary.realCpa > prod.targets.targetCpaAcceptable || summary.realRoas < prod.targets.targetRoasMin) {
        healthStatus = 'warning';
        healthScore = 55;
      }

      return {
        ...summary,
        productId: prod.id,
        productName: prod.name,
        productCode: prod.campaignCode,
        campaignCount: linkedCampaigns.length,
        activeCampaignCount: activeCampaigns.length,
        healthScore,
        healthStatus
      };
    });
  }

  // Seed Isolated Demo Data for previewing UI ONLY when explicitly toggled to "demo"
  private seedDemoData() {
    this.demoData.products = [
      {
        id: 'prod-foto-01',
        name: 'Curso de Fotografia Criativa',
        internalCode: 'FOTO01',
        campaignCode: 'FOTO01',
        status: 'active',
        category: 'Infoproduto / Audiovisual',
        startDate: '2026-01-10',
        caktoProductIds: ['cakto_prod_101'],
        caktoProductName: 'Curso Completo de Fotografia Criativa',
        caktoOfferIds: ['off_foto_standard_97'],
        caktoOfferName: 'Oferta Principal',
        additionalCaktoIds: [],
        relatedOffers: [],
        orderBumpNames: ['Pack 120 Presets Criativos'],
        targets: {
          targetCpaIdeal: 12.0,
          targetCpaAcceptable: 15.0,
          targetCpaMax: 18.0,
          targetRoasMin: 1.6,
          targetRoasIdeal: 2.5,
          targetMarginMin: 35.0,
          minSpendForAnalysis: 200,
          minSalesForAnalysis: 15,
          primaryWindowDays: 7
        },
        createdAt: '2026-01-10T12:00:00.000Z'
      }
    ];

    this.demoData.metaAdAccounts = [
      {
        id: 'act_demo_101',
        connectionId: 'conn_demo',
        accountName: 'Meta Ads Demo — Escala Brasil',
        bmName: 'BM Growth Demo',
        currency: 'BRL',
        status: 'active'
      }
    ];

    this.demoData.campaigns = [
      {
        id: 'camp_demo_01',
        accountId: 'act_demo_101',
        accountName: 'Meta Ads Demo — Escala Brasil',
        campaignId: 'camp_demo_01',
        campaignName: '[FOTO01] CBO - Escala de Públicos Frios',
        status: 'ACTIVE',
        dailyBudget: 250.0,
        linkStatus: 'auto',
        linkedProductId: 'prod-foto-01',
        linkedProductName: 'Curso de Fotografia Criativa',
        linkedProductCode: 'FOTO01',
        spend: 1750.0,
        impressions: 89400,
        reach: 52100,
        frequency: 1.72,
        cpm: 19.57,
        clicks: 1420,
        cpc: 1.23,
        ctr: 1.59,
        results: 125,
        costPerResult: 14.0,
        conversionValue: 3875.0,
        metaRoas: 2.21,
        updatedAt: new Date().toISOString()
      }
    ];

    this.demoData.caktoTransactions = [
      {
        id: 'tx_demo_01',
        transactionId: 'cakto_demo_tx_101',
        orderId: 'cakto_ord_demo_101',
        productId: 'cakto_prod_101',
        productName: 'Curso Completo de Fotografia Criativa',
        productInternalId: 'prod-foto-01',
        offerId: 'off_foto_standard_97',
        offerName: 'Oferta Principal',
        date: new Date().toISOString(),
        status: 'approved',
        grossAmount: 97.0,
        paidAmount: 97.0,
        netAmount: 88.27,
        buyerName: 'Aluno Teste Demonstração',
        buyerEmail: 'aluno.demo@email.com',
        paymentMethod: 'pix',
        installments: 1,
        origin: 'demo_data',
        eventType: 'purchase_approved',
        items: [
          {
            id: 'it_demo_01',
            transactionId: 'cakto_demo_tx_101',
            productId: 'cakto_prod_101',
            productName: 'Curso Completo de Fotografia Criativa',
            offerId: 'off_foto_standard_97',
            offerName: 'Oferta Principal',
            itemType: 'main',
            grossAmount: 97.0,
            paidAmount: 97.0,
            netAmount: 88.27
          }
        ]
      }
    ];
  }
}

export const store = new CentralAdsStore();
