import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { store } from "./server/store.ts";
import { generateAIAnalysis } from "./server/gemini.ts";
import { metaApi } from "./server/metaApi.ts";
import { caktoApi } from "./server/caktoApi.ts";
import { supabaseService } from "./server/supabase.ts";
import { PeriodFilter } from "./src/types/index.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Parse JSON bodies with limit for raw webhook payloads
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Central Ads", timestamp: new Date().toISOString() });
  });

  // Integration Status API
  app.get("/api/sync/status", (req, res) => {
    res.json(store.getIntegrationStatus());
  });

  // Mode switcher API (production vs demo)
  app.post("/api/settings/mode", (req, res) => {
    const { mode } = req.body;
    if (mode === 'production' || mode === 'demo') {
      store.globalSettings.appMode = mode;
      store.integrationLogs.unshift({
        id: `log_mode_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'System',
        event: `Alteração de Modo: ${mode === 'production' ? 'PRODUÇÃO (DADOS REAIS)' : 'DEMONSTRAÇÃO (DADOS DE TESTE)'}`,
        status: 'warning',
        message: mode === 'production' 
          ? 'Modo Produção ativado. Visualizando exclusivamente dados reais provenientes das integrações ou cadastrados manualmente.'
          : 'Modo Demonstração ativado temporariamente com dados de teste isolados.'
      });
      res.json({ success: true, mode, status: store.getIntegrationStatus() });
    } else {
      res.status(400).json({ error: "Modo inválido. Escolha 'production' ou 'demo'." });
    }
  });

  // Real Meta connection test
  app.post("/api/meta/test-connection", async (req, res) => {
    const token = req.body?.accessToken || store.globalSettings.metaAccessToken || process.env.META_ACCESS_TOKEN;
    const result = await metaApi.testAccessToken(token || "");
    // Normaliza para "success" (o front espera esse campo, o serviço retorna "valid")
    res.json({
      ...result,
      success: result.valid,
      name: result.user?.name,
      id: result.user?.id
    });
  });

  // Real Meta sync (Business Managers -> Ad Accounts -> Campaigns -> Daily Insights)
  app.post("/api/sync/meta", async (req, res) => {
    const token = req.body?.accessToken;
    const result = await store.syncMeta(token);
    res.json({ ...result, status: store.getIntegrationStatus() });
  });

  // Meta Diagnostics Endpoint
  app.get("/api/meta/diagnostics", (req, res) => {
    const status = store.getIntegrationStatus();
    res.json({
      connected: status.meta.connected,
      user: status.meta.user,
      businessManagers: status.meta.businessManagers,
      accounts: store.metaAdAccounts,
      campaignsCount: store.campaigns.length,
      dailyMetricsCount: store.campaignDailyMetrics.length,
      lastSyncAt: status.meta.lastSyncAt,
      lastSuccessSyncAt: status.meta.lastSuccessSyncAt,
      error: status.meta.error,
      syncing: status.meta.syncing
    });
  });

  // Meta Business Managers Management (Multi-BM API)
  app.get("/api/meta/bms", (req, res) => {
    res.json(store.getMetaBusinessManagers());
  });

  app.post("/api/meta/bms", async (req, res) => {
    try {
      const { name, metaBmId, accessToken, isActive } = req.body;
      if (!metaBmId || !String(metaBmId).trim()) {
        return res.status(400).json({ error: "O ID da Business Manager (Meta BM ID) é obrigatório." });
      }
      const bm = await store.addMetaBusinessManager({ name, metaBmId, accessToken, isActive });
      res.json({ success: true, businessManager: bm, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Erro ao adicionar Business Manager." });
    }
  });

  app.put("/api/meta/bms/:id", (req, res) => {
    try {
      const updated = store.updateMetaBusinessManager(req.params.id, req.body);
      res.json({ success: true, businessManager: updated, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Erro ao atualizar Business Manager." });
    }
  });

  app.delete("/api/meta/bms/:id", (req, res) => {
    try {
      const deleted = store.deleteMetaBusinessManager(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Business Manager não encontrada." });
      }
      res.json({ success: true, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Erro ao excluir Business Manager." });
    }
  });

  app.post("/api/meta/bms/:id/test", async (req, res) => {
    try {
      const testResult = await store.testMetaBusinessManager(req.params.id);
      res.json({ ...testResult, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/meta/bms/:id/sync", async (req, res) => {
    try {
      const syncResult = await store.syncSingleBusinessManager(req.params.id);
      res.json({ ...syncResult, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Real Cakto connection test
  app.post("/api/cakto/test-connection", async (req, res) => {
    const credentials = {
      apiToken: req.body?.apiToken || store.globalSettings.caktoApiToken,
      clientId: req.body?.clientId || store.globalSettings.caktoClientId,
      clientSecret: req.body?.clientSecret || store.globalSettings.caktoClientSecret,
      apiUrl: req.body?.apiUrl || store.globalSettings.caktoApiUrl
    };
    const result = await caktoApi.testConnection(credentials);
    // Normaliza para "success" (o front espera esse campo, o serviço retorna "valid")
    res.json({
      ...result,
      success: result.valid,
      error: result.error || (!result.valid ? result.message : undefined)
    });
  });

  // Real Cakto Catalog sync (All pages)
  app.post("/api/sync/cakto", async (req, res) => {
    const credentials = req.body?.credentials;
    const result = await store.syncCaktoCatalog(credentials);
    res.json({ ...result, status: store.getIntegrationStatus() });
  });

  // Cakto Catalog list
  app.get("/api/cakto/catalog", (req, res) => {
    res.json({
      products: store.caktoCatalogProducts,
      offers: store.caktoCatalogOffers,
      lastSyncAt: store.caktoCatalogLastSyncAt,
      error: store.caktoLastError
    });
  });

  // Cakto Diagnostics Endpoint
  app.get("/api/cakto/diagnostics", (req, res) => {
    const status = store.getIntegrationStatus();
    res.json({
      apiConnected: status.cakto.apiConnected,
      catalogLastSyncAt: status.cakto.catalogLastSyncAt,
      catalogProductsCount: store.caktoCatalogProducts.length,
      catalogOffersCount: store.caktoCatalogOffers.length,
      webhookActive: status.cakto.webhookActive,
      webhookUrl: "/api/webhooks/cakto",
      lastEventAt: status.cakto.lastEventAt,
      lastEventType: status.cakto.lastEventType,
      transactionsCount: store.caktoTransactions.length,
      error: status.cakto.error,
      syncing: status.cakto.syncing
    });
  });

  // Automatically install webhook on user's Cakto account via Public API
  app.post("/api/cakto/install-webhook", async (req, res) => {
    try {
      const webhookUrl = req.body?.webhookUrl;
      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: "URL do webhook não informada." });
      }

      const credentials = {
        apiToken: req.body?.apiToken || store.globalSettings.caktoApiToken,
        clientId: req.body?.clientId || store.globalSettings.caktoClientId,
        clientSecret: req.body?.clientSecret || store.globalSettings.caktoClientSecret,
        apiUrl: req.body?.apiUrl || store.globalSettings.caktoApiUrl
      };

      const result = await caktoApi.createWebhook(
        webhookUrl,
        "Central Ads - Monitoramento & ROI",
        [
          "purchase_approved",
          "pix_gerado",
          "boleto_gerado",
          "refund",
          "chargeback",
          "subscription_canceled",
          "subscription_renewed",
          "checkout_abandonment"
        ],
        credentials
      );

      if (result.success) {
        store.caktoWebhookActive = true;
        store.caktoLastEventAt = new Date().toISOString();
        store.caktoLastEventType = "webhook_instalado_api";

        store.integrationLogs.unshift({
          id: `log_wh_install_${Date.now()}`,
          timestamp: new Date().toISOString(),
          integration: "Cakto",
          event: "WEBHOOK INSTALADO VIA API CAKTO",
          status: "success",
          message: `Webhook criado e ativado com sucesso na plataforma Cakto para a URL: ${webhookUrl}`,
          payload: result.webhook
        });
      }

      res.json({ ...result, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // List webhooks from Cakto account
  app.get("/api/cakto/remote-webhooks", async (req, res) => {
    try {
      const credentials = {
        apiToken: store.globalSettings.caktoApiToken,
        clientId: store.globalSettings.caktoClientId,
        clientSecret: store.globalSettings.caktoClientSecret,
        apiUrl: store.globalSettings.caktoApiUrl
      };
      const result = await caktoApi.listWebhooks(credentials);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Trigger simulated/test webhook event to verify reception
  app.post("/api/cakto/test-webhook", (req, res) => {
    try {
      const samplePayload = {
        event: "purchase_approved",
        secret: store.globalSettings.caktoWebhookSecret || "test_secret",
        data: {
          id: `test_tx_${Date.now()}`,
          refId: `cakto_test_${Math.floor(Math.random() * 10000)}`,
          status: "approved",
          customer: {
            name: "Cliente Teste Cakto",
            email: "cliente.teste@exemplo.com.br",
            phone: "11999999999"
          },
          product: {
            id: store.caktoCatalogProducts[0]?.id || "cakto_prod_teste",
            name: store.caktoCatalogProducts[0]?.name || "Produto Teste Central Ads",
            short_id: "prod_tst"
          },
          offer: {
            id: store.caktoCatalogOffers[0]?.id || "off_teste",
            name: store.caktoCatalogOffers[0]?.name || "Oferta Principal Teste"
          },
          amount: 197.00,
          net_amount: 179.27,
          payment_method: "pix",
          installments: 1,
          created_at: new Date().toISOString()
        }
      };

      const result = store.processCaktoWebhook(samplePayload);
      res.json({ success: true, message: "Evento de teste processado com sucesso!", result, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete / reset Cakto Webhook configuration
  app.delete("/api/cakto/webhook", (req, res) => {
    try {
      store.resetCaktoWebhook();
      res.json({ success: true, message: "Webhook desconectado com sucesso.", status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete remote webhook from Cakto account
  app.delete("/api/cakto/remote-webhooks/:id", async (req, res) => {
    try {
      const credentials = {
        apiToken: store.globalSettings.caktoApiToken,
        clientId: store.globalSettings.caktoClientId,
        clientSecret: store.globalSettings.caktoClientSecret,
        apiUrl: store.globalSettings.caktoApiUrl
      };
      const result = await caktoApi.deleteWebhook(req.params.id, credentials);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Disconnect / reset integration
  app.delete("/api/integrations/:name", (req, res) => {
    try {
      const name = req.params.name.toLowerCase();
      if (name === "meta") {
        store.globalSettings.metaAccessToken = "";
        store.metaBusinessManagers = [];
        store.metaAdAccounts = [];
        store.integrationLogs.unshift({
          id: `log_meta_disc_${Date.now()}`,
          timestamp: new Date().toISOString(),
          integration: "Meta",
          event: "INTEGRACAO_DESCONECTADA",
          status: "warning",
          message: "Integração Meta Ads e conexões foram desconectadas. Histórico financeiro preservado.",
          payload: {}
        });
      } else if (name === "cakto") {
        store.globalSettings.caktoApiToken = "";
        store.globalSettings.caktoClientId = "";
        store.globalSettings.caktoClientSecret = "";
        store.resetCaktoWebhook();
        store.integrationLogs.unshift({
          id: `log_cakto_disc_${Date.now()}`,
          timestamp: new Date().toISOString(),
          integration: "Cakto",
          event: "INTEGRACAO_DESCONECTADA",
          status: "warning",
          message: "Credenciais da Cakto foram removidas. Histórico financeiro preservado.",
          payload: {}
        });
      } else if (name === "supabase") {
        store.globalSettings.supabaseConfigured = false;
        store.globalSettings.supabaseUrl = "";
        store.globalSettings.supabaseAnonKey = "";
      }
      res.json({ success: true, message: `Integração ${name} desconectada.`, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Daily Campaign Metrics Endpoint
  app.get("/api/campaigns/daily", (req, res) => {
    const { campaignId, accountId } = req.query;
    let list = store.campaignDailyMetrics;
    if (campaignId) {
      list = list.filter(m => m.campaignId === campaignId);
    }
    if (accountId) {
      list = list.filter(m => m.accountId === accountId);
    }
    res.json(list);
  });

  // Real Full Sync (Meta + Cakto + Supabase)
  app.post("/api/sync/all", async (req, res) => {
    try {
      const [metaResult, caktoResult] = await Promise.allSettled([
        store.syncMeta(),
        store.syncCaktoCatalog()
      ]);
      const status = store.getIntegrationStatus();
      res.json({
        success: (metaResult.status === 'fulfilled' && metaResult.value.success) || (caktoResult.status === 'fulfilled' && caktoResult.value.success),
        metaResult: metaResult.status === 'fulfilled' ? metaResult.value : null,
        caktoResult: caktoResult.status === 'fulfilled' ? caktoResult.value : null,
        status
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, status: store.getIntegrationStatus() });
    }
  });

  // Real Supabase connection test
  app.post("/api/supabase/test", async (req, res) => {
    const config = {
      url: req.body?.url || store.globalSettings.supabaseUrl || process.env.SUPABASE_URL || "",
      key: req.body?.key || store.globalSettings.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    };
    const result = await supabaseService.testConnection(config);
    res.json(result);
  });

  // 1. Overview Dashboard API
  app.get("/api/overview", async (req, res) => {
    try {
      const period = (req.query.period as PeriodFilter) || "7d";
      const summary = store.calculateFinancialSummary(period);
      const productSummaries = store.getProductMetricSummaries(period);
      const unlinkedCampaigns = store.campaigns.filter(c => c.linkStatus === "unlinked");
      const activeAlerts = store.alerts.filter(a => !a.resolved);
      const integrationStatus = store.getIntegrationStatus();

      // Group health
      const healthCounts = {
        healthy: productSummaries.filter(p => p.healthStatus === "healthy" || p.healthStatus === "excellent").length,
        warning: productSummaries.filter(p => p.healthStatus === "warning").length,
        critical: productSummaries.filter(p => p.healthStatus === "critical").length,
        opportunities: productSummaries.filter(p => p.realRoas >= 2.0 && p.realCpa <= 13.0).length,
      };

      // Chart series: STRICTLY REAL DATA. If no data exists, chartData is empty!
      let chartData: any[] = [];
      let trends: any = null;

      if (summary.realCost > 0 || summary.approvedSales > 0) {
        // Group cakto transactions by date
        const dateMap = new Map<string, { spend: number; realCost: number; revenue: number; sales: number }>();

        // Populate recent dates from transactions
        for (const tx of store.caktoTransactions) {
          if (tx.status === 'approved') {
            const dayStr = tx.date.split('T')[0];
            const curr = dateMap.get(dayStr) || { spend: 0, realCost: 0, revenue: 0, sales: 0 };
            curr.revenue += tx.grossAmount;
            curr.sales += 1;
            dateMap.set(dayStr, curr);
          }
        }

        // If transactions exist, map to array
        if (dateMap.size > 0) {
          const sortedDays = Array.from(dateMap.keys()).sort();
          chartData = sortedDays.slice(-7).map(day => {
            const d = dateMap.get(day)!;
            const cpa = d.sales > 0 ? Math.round((d.realCost / d.sales) * 100) / 100 : 0;
            const roas = d.realCost > 0 ? Math.round((d.revenue / d.realCost) * 100) / 100 : 0;
            return {
              date: day.split('-').slice(1).join('/'),
              spend: d.spend,
              realCost: d.realCost,
              revenue: d.revenue,
              sales: d.sales,
              cpa,
              roas
            };
          });
        } else {
          // If only campaigns exist with spend
          chartData = [
            {
              date: "Hoje",
              spend: summary.metaSpend,
              realCost: summary.realCost,
              revenue: summary.effectiveRevenue,
              sales: summary.approvedSales,
              cpa: summary.realCpa,
              roas: summary.realRoas
            }
          ];
        }

        trends = {
          spendDiff: 0,
          revenueDiff: 0,
          cpaDiff: 0,
          roasDiff: 0,
          profitDiff: 0,
          salesDiff: 0
        };
      }

      res.json({
        period,
        appMode: store.globalSettings.appMode,
        integrationStatus,
        summary,
        trends,
        healthCounts,
        productSummaries,
        unlinkedCampaignsCount: unlinkedCampaigns.length,
        unlinkedSpend: unlinkedCampaigns.reduce((a, b) => a + (b.spend || 0), 0),
        activeAlertsCount: activeAlerts.length,
        chartData,
        topActionItems: store.aiActionItems.slice(0, 3)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Action Center API
  app.get("/api/action-center", async (req, res) => {
    try {
      const period = (req.query.period as PeriodFilter) || "7d";
      const analysis = await generateAIAnalysis(period);
      res.json({
        ...analysis,
        appMode: store.globalSettings.appMode,
        integrationStatus: store.getIntegrationStatus()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/action-center/items/:id/mark-analyzed", (req, res) => {
    const item = store.aiActionItems.find(i => i.id === req.params.id);
    if (item) {
      item.analyzed = true;
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: "Item não encontrado" });
    }
  });

  // 3. Products API
  app.get("/api/products", (req, res) => {
    const period = (req.query.period as PeriodFilter) || "7d";
    const summaries = store.getProductMetricSummaries(period);
    res.json(summaries);
  });

  app.get("/api/products/:id", (req, res) => {
    const period = (req.query.period as PeriodFilter) || "7d";
    const prod = store.products.find(p => p.id === req.params.id || p.internalCode === req.params.id);
    if (!prod) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const summary = store.calculateFinancialSummary(period, prod.id);
    const linkedCampaigns = store.campaigns.filter(c => c.linkedProductId === prod.id);
    
    // Cakto sales breakdown
    const prodTx = store.caktoTransactions.filter(t => t.productInternalId === prod.id);
    const approvedTx = prodTx.filter(t => t.status === "approved");

    const orderBumpCount = approvedTx.filter(t => t.items.some(i => i.itemType === "order_bump")).length;
    const bumpTakeRate = approvedTx.length > 0 ? Math.round((orderBumpCount / approvedTx.length) * 1000) / 10 : 0;

    // AI diagnosis specific to this product
    const relevantAiInsight = store.aiActionItems.find(i => i.productId === prod.id || i.productName === prod.name);

    res.json({
      product: prod,
      summary,
      campaigns: linkedCampaigns,
      bumpTakeRate,
      orderBumpCount,
      totalSalesCount: approvedTx.length,
      aiInsight: relevantAiInsight,
      taxRule: store.metaTaxRules.find(r => r.enabled)
    });
  });

  app.post("/api/products", async (req, res) => {
    try {
      const body = req.body;
      const cleanCode = (body.campaignCode || body.internalCode || 'PROD').replace(/\[|\]/g, '').trim().toUpperCase();
      
      const newProduct = {
        id: body.id || `prod_${Date.now()}`,
        name: body.name,
        internalCode: cleanCode,
        campaignCode: cleanCode,
        status: body.status || 'active',
        category: body.category || 'Geral',
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        notes: body.notes || '',
        source: body.source || 'manual',
        caktoProductIds: Array.isArray(body.caktoProductIds) ? body.caktoProductIds : (body.caktoProductId ? [body.caktoProductId] : []),
        caktoProductName: body.caktoProductName || '',
        caktoOfferIds: Array.isArray(body.caktoOfferIds) ? body.caktoOfferIds : (body.caktoOfferId ? [body.caktoOfferId] : []),
        caktoOfferName: body.caktoOfferName || '',
        additionalCaktoIds: body.additionalCaktoIds || [],
        relatedOffers: body.relatedOffers || [],
        orderBumpNames: body.orderBumpNames || [],
        targets: body.targets || {
          targetCpaIdeal: Number(body.targetCpaIdeal || 12),
          targetCpaAcceptable: Number(body.targetCpaAcceptable || 15),
          targetCpaMax: Number(body.targetCpaMax || 18),
          targetRoasMin: Number(body.targetRoasMin || 1.6),
          targetRoasIdeal: Number(body.targetRoasIdeal || 2.5),
          targetMarginMin: Number(body.targetMarginMin || 35),
          minSpendForAnalysis: Number(body.minSpendForAnalysis || 150),
          minSalesForAnalysis: Number(body.minSalesForAnalysis || 10),
          primaryWindowDays: 7
        },
        createdAt: new Date().toISOString()
      };

      const existingIndex = store.products.findIndex(p => p.id === newProduct.id || p.internalCode === newProduct.internalCode);
      if (existingIndex >= 0) {
        store.products[existingIndex] = newProduct;
      } else {
        store.products.push(newProduct);
      }

      // Re-run automatic campaign linking for this code
      store.autoLinkCampaigns();

      // Check if any Cakto transactions match this newly registered product ID
      for (const tx of store.caktoTransactions) {
        if (!tx.productInternalId && newProduct.caktoProductIds.includes(tx.productId)) {
          tx.productInternalId = newProduct.id;
        }
      }

      // Log registration
      store.integrationLogs.unshift({
        id: `log_prod_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: 'System',
        event: 'Cadastro de Produto',
        status: 'success',
        message: `Produto "${newProduct.name}" cadastrado com código de campanha [${newProduct.campaignCode}].`,
        payload: { product: newProduct }
      });

      // Save to Supabase if configured
      if (store.globalSettings.supabaseConfigured && store.globalSettings.supabaseUrl) {
        await supabaseService.upsertRecords(
          { url: store.globalSettings.supabaseUrl, key: store.globalSettings.supabaseAnonKey },
          'products',
          [newProduct]
        );
      }

      res.json({ success: true, product: newProduct });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      const deleted = store.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }
      res.json({ success: true, message: "Produto excluído com sucesso. Histórico de vendas preservado." });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao excluir produto." });
    }
  });

  // 4. Meta Ads API
  app.get("/api/meta-accounts", (req, res) => {
    const accounts = store.metaAdAccounts.map(acc => {
      const accCampaigns = store.campaigns.filter(c => c.accountId === acc.id);
      const spend = accCampaigns.reduce((a, b) => a + (b.spend || 0), 0);
      const activeCount = accCampaigns.filter(c => c.status === "ACTIVE").length;

      // Distribution per product
      const distribution: { productName: string; productCode: string; spend: number }[] = [];
      const prodMap = new Map<string, number>();

      for (const c of accCampaigns) {
        const key = c.linkedProductName || "Sem Produto Identificado";
        prodMap.set(key, (prodMap.get(key) || 0) + (c.spend || 0));
      }

      prodMap.forEach((amt, name) => {
        distribution.push({
          productName: name,
          productCode: name.includes("[") ? name : "",
          spend: Math.round(amt * 100) / 100
        });
      });

      return {
        ...acc,
        name: acc.accountName || (acc as any).name || acc.id,
        accountName: acc.accountName || (acc as any).name || acc.id,
        bmId: acc.bmId,
        bmName: acc.bmName || 'BM Conectada',
        spend: Math.round(spend * 100) / 100,
        activeCampaigns: activeCount,
        totalCampaigns: accCampaigns.length,
        lastSyncAt: (acc as any).lastSyncAt || store.metaLastSyncAt,
        status: acc.status || 'active',
        productDistribution: distribution
      };
    });

    res.json(accounts);
  });

  app.delete("/api/meta-accounts/:id", (req, res) => {
    try {
      const deleted = store.deleteAdAccount(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conta de anúncios não encontrada." });
      }
      res.json({ success: true, message: "Conta de anúncios desconectada com sucesso." });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao desconectar conta." });
    }
  });

  app.post("/api/meta-accounts/:id/sync", async (req, res) => {
    try {
      const syncResult = await store.syncSingleAdAccount(req.params.id);
      res.json({ ...syncResult, status: store.getIntegrationStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Erro ao sincronizar conta." });
    }
  });

  app.get("/api/campaigns", (req, res) => {
    const accountFilter = req.query.accountId as string;
    const linkStatusFilter = req.query.linkStatus as string;
    const taxRate = store.getTaxRateForDate(new Date().toISOString().split('T')[0]);

    let results = store.campaigns;
    if (accountFilter) {
      results = results.filter(c => c.accountId === accountFilter);
    }
    if (linkStatusFilter) {
      results = results.filter(c => c.linkStatus === linkStatusFilter);
    }

    const decorated = results.map(c => {
      const tax = Math.round(((c.spend || 0) * (taxRate / 100)) * 100) / 100;
      const realCost = Math.round(((c.spend || 0) + tax) * 100) / 100;
      return {
        ...c,
        tax,
        realCost,
        taxRate
      };
    });

    res.json(decorated);
  });

  app.get("/api/campaigns/unlinked", (req, res) => {
    const unlinked = store.campaigns.filter(c => c.linkStatus === "unlinked");
    const taxRate = store.getTaxRateForDate(new Date().toISOString().split('T')[0]);
    
    const decorated = unlinked.map(c => {
      const tax = Math.round(((c.spend || 0) * (taxRate / 100)) * 100) / 100;
      return {
        ...c,
        tax,
        realCost: Math.round(((c.spend || 0) + tax) * 100) / 100
      };
    });

    res.json(decorated);
  });

  app.post("/api/campaigns/link", (req, res) => {
    try {
      const { campaignId, productId } = req.body;
      if (!campaignId || !productId) {
        return res.status(400).json({ error: "campaignId e productId são obrigatórios." });
      }
      const updatedCampaign = store.linkCampaignManually(campaignId, productId);
      res.json({ success: true, campaign: updatedCampaign });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Cakto Sales API
  app.get("/api/cakto-sales", (req, res) => {
    const { productId, status, paymentMethod, itemType, search } = req.query;

    let list = store.caktoTransactions;

    if (productId) {
      list = list.filter(t => t.productInternalId === productId);
    }
    if (status) {
      list = list.filter(t => t.status === status);
    }
    if (paymentMethod) {
      list = list.filter(t => t.paymentMethod === paymentMethod);
    }
    if (itemType) {
      list = list.filter(t => t.items.some(i => i.itemType === itemType));
    }
    if (search) {
      const term = String(search).toLowerCase();
      list = list.filter(t => 
        t.transactionId.toLowerCase().includes(term) ||
        t.productName.toLowerCase().includes(term) ||
        (t.buyerName && t.buyerName.toLowerCase().includes(term)) ||
        (t.buyerEmail && t.buyerEmail.toLowerCase().includes(term))
      );
    }

    res.json(list);
  });

  // 6. CAKTO WEBHOOK REAL ENDPOINT: /api/webhooks/cakto
  // Support GET & HEAD for endpoint validation & URL health checks
  app.get("/api/webhooks/cakto", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      status: "ok",
      active: true,
      service: "Central Ads - Cakto Webhook Receiver",
      endpoint: "/api/webhooks/cakto",
      message: "Endpoint operacional e pronto para receber notificações da Cakto.",
      webhookActive: store.caktoWebhookActive,
      lastEventAt: store.caktoLastEventAt,
      supportedEvents: [
        "purchase_approved",
        "pix_gerado",
        "boleto_gerado",
        "refund",
        "chargeback",
        "subscription_canceled",
        "subscription_renewed",
        "checkout_abandonment"
      ]
    });
  });

  app.head("/api/webhooks/cakto", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).end();
  });

  app.options("/api/webhooks/cakto", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cakto-signature, x-webhook-secret");
    res.status(200).end();
  });

  app.post("/api/webhooks/cakto", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const secret = 
        req.headers["x-cakto-signature"] || 
        req.headers["x-webhook-secret"] || 
        req.query.secret || 
        req.body?.secret || 
        req.body?.data?.secret;
      
      // If configured secret does not match received secret
      if (store.globalSettings.caktoWebhookSecret && secret && secret !== store.globalSettings.caktoWebhookSecret) {
        store.integrationLogs.unshift({
          id: `log_err_${Date.now()}`,
          timestamp: new Date().toISOString(),
          integration: "Cakto",
          event: "Webhook Falha Autenticação",
          status: "error",
          message: "Tentativa de envio de webhook com assinatura inválida.",
          payload: { headers: req.headers }
        });
        return res.status(401).json({ error: "Assinatura de webhook inválida." });
      }

      // Handle raw or parsed body
      let payload = req.body;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (_) {}
      }

      const result = store.processCaktoWebhook(payload);
      res.status(200).json({ ...result, receivedAt: new Date().toISOString() });
    } catch (err: any) {
      store.integrationLogs.unshift({
        id: `log_crit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        integration: "Cakto",
        event: "Webhook Erro Interno",
        status: "error",
        message: `Falha ao processar payload: ${err.message}`,
        payload: { error: err.message, body: req.body }
      });
      // Even on error, respond with 200 with error message to avoid Cakto disabling the webhook
      res.status(200).json({ success: false, error: err.message });
    }
  });

  // 8. Alerts API
  app.get("/api/alerts", (req, res) => {
    res.json(store.alerts);
  });

  app.post("/api/alerts/:id/resolve", (req, res) => {
    const alert = store.alerts.find(a => a.id === req.params.id);
    if (alert) {
      alert.resolved = true;
      res.json({ success: true, alert });
    } else {
      res.status(404).json({ error: "Alerta não encontrado" });
    }
  });

  // 9. Integration Logs API
  app.get("/api/logs", (req, res) => {
    const integrationFilter = req.query.integration as string;
    let list = store.integrationLogs;
    if (integrationFilter && integrationFilter !== "all") {
      list = list.filter(l => l.integration.toLowerCase() === integrationFilter.toLowerCase());
    }
    res.json(list);
  });

  // 10. Settings & Tax Rules API
  app.get("/api/settings", (req, res) => {
    const status = store.getIntegrationStatus();
    const metaConnections = status.meta.connected ? [
      { 
        id: "conn_meta_live", 
        name: status.meta.connectionName || "Meta Marketing API", 
        status: "connected",
        accountsCount: status.meta.accountsCount,
        campaignsCount: status.meta.campaignsCount,
        lastSyncAt: status.meta.lastSyncAt
      }
    ] : [];

    res.json({
      globalSettings: store.globalSettings,
      taxRules: store.metaTaxRules,
      metaConnections,
      integrationStatus: status
    });
  });

  app.post("/api/settings", (req, res) => {
    store.globalSettings = { ...store.globalSettings, ...req.body };
    // If Supabase credentials were updated:
    if (req.body.supabaseUrl || req.body.supabaseAnonKey) {
      store.globalSettings.supabaseConfigured = Boolean(store.globalSettings.supabaseUrl && store.globalSettings.supabaseAnonKey);
    }
    res.json({ success: true, settings: store.globalSettings, status: store.getIntegrationStatus() });
  });

  app.post("/api/tax-rules", (req, res) => {
    const rule = req.body;
    const newRule = {
      id: rule.id || `tax_${Date.now()}`,
      name: rule.name,
      enabled: rule.enabled ?? true,
      type: rule.type || 'percentage',
      rate: Number(rule.rate || 10.0),
      startDate: rule.startDate || '2026-01-01',
      endDate: rule.endDate || '2026-12-31',
      country: rule.country || 'Brasil',
      notes: rule.notes || '',
      createdAt: new Date().toISOString()
    };

    const existingIdx = store.metaTaxRules.findIndex(r => r.id === newRule.id);
    if (existingIdx >= 0) {
      store.metaTaxRules[existingIdx] = newRule;
    } else {
      store.metaTaxRules.unshift(newRule);
    }

    res.json({ success: true, rule: newRule });
  });

  // 11. Supabase SQL DDL Schema Generator Endpoint
  app.get("/api/supabase/ddl", (req, res) => {
    const sql = `-- ==============================================================================
-- CENTRAL ADS — DDL SCHEMA COMPLETO PARA SUPABASE (POSTGRESQL + RLS)
-- ==============================================================================

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'media_buyer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meta Connections
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Meta Ad Accounts
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id TEXT PRIMARY KEY,
  connection_id UUID REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  bm_name TEXT,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  internal_code TEXT NOT NULL UNIQUE,
  campaign_code TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  category TEXT,
  start_date DATE,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Product Cakto IDs
CREATE TABLE IF NOT EXISTS public.product_cakto_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  cakto_product_id TEXT NOT NULL,
  is_additional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Cakto Transactions (Idempotency Key: transaction_id + event_type)
CREATE TABLE IF NOT EXISTS public.cakto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2) NOT NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  payment_method TEXT,
  installments INT DEFAULT 1,
  origin TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tx_event UNIQUE(transaction_id, event_type)
);

-- 7. Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  daily_budget NUMERIC(10,2) DEFAULT 0,
  link_status TEXT DEFAULT 'unlinked' CHECK (link_status IN ('auto', 'manual', 'unlinked')),
  linked_product_id UUID REFERENCES public.products(id),
  spend NUMERIC(10,2) DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  cpa NUMERIC(10,2) DEFAULT 0,
  roas NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Integration Logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cakto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users read" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all authenticated users read campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow all authenticated users read transactions" ON public.cakto_transactions FOR SELECT USING (true);
`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(sql);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Central Ads Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
