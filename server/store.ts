import { 
  Product, 
  Campaign, 
  MetaAdAccount, 
  MetaTaxRule, 
  CaktoTransaction, 
  CaktoTransactionItem, 
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
import { metaApi } from './metaApi.ts';
import { supabaseService } from './supabase.ts';

interface Dataset {
  products: Product[];
  metaAdAccounts: MetaAdAccount[];
  campaigns: Campaign[];
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
    metaAdAccounts: [],
    campaigns: [],
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
    metaAdAccounts: [],
    campaigns: [],
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
    geminiModel: 'gemini-3.8-flash',
    geminiAnalysisIntervalHours: 6,
    minSpendForAiDecision: 150,
    aiStrictCautionMode: true,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };

  // Integration operational state
  public metaLastSyncAt: string | null = null;
  public metaLastError: string | null = null;
  public isMetaSyncing: boolean = false;

  public caktoLastEventAt: string | null = null;
  public caktoLastError: string | null = null;
  public caktoWebhookActive: boolean = false;

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
        message: 'Configure as credenciais da integração Meta Marketing API nas Configurações para iniciar a sincronização de campanhas e métricas reais.',
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
      message: 'Configure a URL de Webhook no painel da Cakto para receber vendas e transações em tempo real.',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      resolved: false,
      actionUrl: 'settings',
      actionLabel: 'Ver URL Webhook'
    });

    this.realData.integrationLogs.push({
      id: `log_init_${Date.now()}`,
      timestamp: new Date().toISOString(),
      integration: 'System',
      event: 'Inicialização Central Ads',
      status: 'success',
      message: 'Modo Produção ativo. Banco de dados inicializado sem dados fictícios. Aguardando dados reais da Meta API e Webhook Cakto.'
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
        connectionName: isDemo ? 'Meta Ads (Demonstração)' : (this.realData.metaAdAccounts[0]?.bmName || 'Meta Marketing API'),
        lastSyncAt: isDemo ? '02/09/2026 12:42' : this.metaLastSyncAt,
        accountsCount: this.metaAdAccounts.length,
        campaignsCount: this.campaigns.length,
        error: isDemo ? null : this.metaLastError,
        syncing: this.isMetaSyncing
      },
      cakto: {
        connected: isDemo ? true : (this.realData.caktoTransactions.length > 0 || this.caktoWebhookActive),
        lastEventAt: isDemo ? '02/09/2026 12:40' : this.caktoLastEventAt,
        transactionsCount: this.caktoTransactions.length,
        webhookActive: isDemo ? true : this.caktoWebhookActive,
        error: isDemo ? null : this.caktoLastError
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

  // Real Meta Sync Execution
  public async syncMeta(accessToken?: string): Promise<{ success: boolean; accountsCount: number; campaignsCount: number; error?: string }> {
    const token = accessToken || this.globalSettings.metaAccessToken || process.env.META_ACCESS_TOKEN;
    if (!token || !token.trim()) {
      const err = "Token de Acesso da Meta Marketing API não configurado. Adicione seu token nas Configurações da Meta Ads.";
      this.metaLastError = err;
      this.integrationLogs.unshift({
        id: `log_sync_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'Falha de Sincronização',
        status: 'error',
        message: err
      });
      return { success: false, accountsCount: 0, campaignsCount: 0, error: err };
    }

    this.isMetaSyncing = true;
    const startTime = new Date().toISOString();

    try {
      // 1. Fetch Ad Accounts
      const accRes = await metaApi.fetchAdAccounts(token.trim());
      if (!accRes.success) {
        throw new Error(accRes.error || "Falha ao consultar contas na Meta API.");
      }

      const rawAccounts = accRes.accounts;
      if (rawAccounts.length === 0) {
        this.metaLastError = "Nenhuma conta de anúncios encontrada para este token da Meta.";
        return { success: true, accountsCount: 0, campaignsCount: 0 };
      }

      // Convert to MetaAdAccount
      const parsedAccounts: MetaAdAccount[] = rawAccounts.map(a => ({
        id: a.id,
        connectionId: 'conn_meta_real',
        accountName: a.name || `Conta ${a.account_id}`,
        bmName: a.business_name || 'Business Manager',
        currency: a.currency || 'BRL',
        status: a.account_status === 1 ? 'active' : 'disabled',
        source: 'meta_api',
        externalId: a.account_id,
        importedAt: new Date().toISOString()
      }));

      // 2. Fetch campaigns for each account
      const allCampaigns: Campaign[] = [];
      const taxRate = this.getTaxRateForDate(new Date().toISOString().split('T')[0]);

      for (const acc of rawAccounts) {
        const campRes = await metaApi.fetchCampaigns(acc.id, token.trim());
        const insightRes = await metaApi.fetchInsights(acc.id, token.trim());

        const insightsMap = new Map<string, any>();
        if (insightRes.success && Array.isArray(insightRes.insights)) {
          for (const ins of insightRes.insights) {
            insightsMap.set(ins.campaign_id, ins);
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

            // Extract purchases and conversion value
            let results = 0;
            let conversionValue = 0;
            if (ins && Array.isArray(ins.actions)) {
              const purchaseAction = ins.actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseAction) {
                results = Number(purchaseAction.value || 0);
              }
            }
            if (ins && Array.isArray(ins.action_values)) {
              const purchaseValue = ins.action_values.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase' || 
                a.action_type === 'offsite_conversion.fb_pixel_purchase'
              );
              if (purchaseValue) {
                conversionValue = Number(purchaseValue.value || 0);
              }
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
          }
        }
      }

      // Update real data store
      this.realData.metaAdAccounts = parsedAccounts;
      this.realData.campaigns = allCampaigns;

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

      // Resolve disconnected alert if present
      const connAlert = this.realData.alerts.find(a => a.type === 'meta_disconnected');
      if (connAlert) {
        connAlert.resolved = true;
      }

      this.metaLastSyncAt = new Date().toISOString();
      this.metaLastError = null;

      this.realData.integrationLogs.unshift({
        id: `log_meta_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'Meta',
        event: 'Sincronização Real Concluída',
        status: 'success',
        message: `Sincronizadas ${parsedAccounts.length} conta(s) e ${allCampaigns.length} campanha(s) reais da Meta Marketing API. ${linked} vinculadas automaticamente.`,
        payload: {
          accountsCount: parsedAccounts.length,
          campaignsCount: allCampaigns.length,
          linkedCount: linked,
          startedAt: startTime,
          finishedAt: this.metaLastSyncAt
        }
      });

      // Optional sync to Supabase if configured
      if (this.globalSettings.supabaseConfigured && this.globalSettings.supabaseUrl) {
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
      }

      return {
        success: true,
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
        event: 'Falha na Sincronização Meta',
        status: 'error',
        message: `🔴 Falha na sincronização Meta: ${errMsg}`
      });
      return { success: false, accountsCount: 0, campaignsCount: 0, error: errMsg };
    } finally {
      this.isMetaSyncing = false;
    }
  }

  // Cakto Webhook Ingestion with Idempotency and Product Matching
  public processCaktoWebhook(payload: any): { success: boolean; message: string; transaction?: CaktoTransaction } {
    const transactionId = String(payload.transaction_id || payload.id || payload.transactionId || `cakto_tx_${Date.now()}`);
    const eventType = String(payload.event || payload.event_type || payload.type || 'purchase_approved');
    const idempotencyKey = `${transactionId}_${eventType}`;

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
    this.caktoWebhookActive = true;

    // Identify product
    const caktoProdId = String(payload.product_id || payload.productId || payload.product?.id || '');
    const caktoOfferId = String(payload.offer_id || payload.offerId || payload.offer?.id || '');
    const caktoProdName = String(payload.product_name || payload.product?.name || 'Produto Cakto');

    // Find linked system product
    let systemProduct = this.products.find(p => 
      (caktoProdId && p.caktoProductIds.includes(caktoProdId)) || 
      (caktoOfferId && p.caktoOfferIds.includes(caktoOfferId)) ||
      (caktoProdName && p.name.toLowerCase().includes(caktoProdName.toLowerCase()))
    );

    // If product was NOT found, trigger an operational alert!
    if (!systemProduct && caktoProdId) {
      const alertId = `alert_unidentified_prod_${caktoProdId}`;
      const exists = this.alerts.find(a => a.id === alertId);
      if (!exists) {
        this.alerts.unshift({
          id: alertId,
          type: 'unidentified_cakto_product',
          title: `Produto Cakto não Identificado`,
          message: `Venda recebida da Cakto com Product ID "${caktoProdId}" (${caktoProdName}), sem produto cadastrado correspondente no Central Ads. Cadastre o produto para vincular as métricas.`,
          severity: 'high',
          timestamp: new Date().toISOString(),
          resolved: false,
          actionUrl: 'products',
          actionLabel: 'Cadastrar Produto'
        });
      }
    }

    const grossAmount = Number(payload.gross_amount || payload.amount || payload.paid_amount || 0);
    const netAmount = Number(payload.net_amount || payload.liquid_amount || (grossAmount * 0.91));
    const paidAmount = Number(payload.paid_amount || grossAmount);

    // Parse items / order bumps
    const items: CaktoTransactionItem[] = [];
    const rawItems = payload.items || payload.order_items || [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((it: any, idx: number) => {
        items.push({
          id: `item_${Date.now()}_${idx}`,
          transactionId: transactionId,
          productId: it.product_id || caktoProdId,
          productName: it.product_name || caktoProdName,
          offerId: it.offer_id || caktoOfferId,
          offerName: it.offer_name || 'Oferta Padrão',
          itemType: it.is_order_bump || it.item_type === 'order_bump' ? 'order_bump' : 'main',
          grossAmount: Number(it.gross_amount || it.amount || 0),
          paidAmount: Number(it.paid_amount || it.amount || 0),
          netAmount: Number(it.net_amount || (Number(it.amount || 0) * 0.91))
        });
      });
    } else {
      items.push({
        id: `item_${Date.now()}_0`,
        transactionId: transactionId,
        productId: caktoProdId,
        productName: caktoProdName,
        offerId: caktoOfferId,
        offerName: payload.offer_name || 'Oferta Principal',
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

    const newTx: CaktoTransaction = {
      id: `tx_${Date.now()}`,
      transactionId: transactionId,
      orderId: String(payload.order_id || payload.orderId || `ord_${Date.now()}`),
      productId: caktoProdId || 'cakto_unknown',
      productName: caktoProdName,
      productInternalId: systemProduct?.id,
      offerId: caktoOfferId || 'off_unknown',
      offerName: payload.offer_name || 'Oferta Webhook',
      date: payload.created_at || payload.date || new Date().toISOString(),
      status: statusMap[eventType.toLowerCase()] || 'approved',
      grossAmount,
      paidAmount,
      netAmount,
      buyerName: payload.buyer?.name || payload.customer?.name || 'Comprador Cakto',
      buyerEmail: payload.buyer?.email || payload.customer?.email || 'comprador@cakto.com',
      paymentMethod: payload.payment_method || 'pix',
      installments: Number(payload.installments || 1),
      origin: 'cakto_webhook',
      eventType: eventType,
      items: items,
      rawPayload: payload
    };

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
      event: `Webhook Evento: ${eventType}`,
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

  // Seed Isolated Demo Data for previewing UI when explicitly toggled to "demo"
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
