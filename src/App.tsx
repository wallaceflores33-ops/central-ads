import React, { useState, useEffect, useCallback } from "react";
import { Sidebar, NavView } from "./components/Sidebar.tsx";
import { Header } from "./components/Header.tsx";
import { OverviewView } from "./views/OverviewView.tsx";
import { ActionCenterView } from "./views/ActionCenterView.tsx";
import { ProductsView } from "./views/ProductsView.tsx";
import { ProductDetailView } from "./views/ProductDetailView.tsx";
import { MetaAccountsView } from "./views/MetaAccountsView.tsx";
import { CampaignsView } from "./views/CampaignsView.tsx";
import { UnidentifiedCampaignsView } from "./views/UnidentifiedCampaignsView.tsx";
import { CaktoSalesView } from "./views/CaktoSalesView.tsx";
import { AIIntelligenceView } from "./views/AIIntelligenceView.tsx";
import { AlertsView } from "./views/AlertsView.tsx";
import { LogsView } from "./views/LogsView.tsx";
import { SettingsView } from "./views/SettingsView.tsx";
import { 
  FinancialSummary, 
  ProductMetricSummary, 
  AIActionItem, 
  AIDailySummary, 
  PeriodFilter, 
  ROASCalculationBase,
  IntegrationStatus,
  AppMode
} from "./types/index.ts";
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>("overview");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [roasBase, setRoasBase] = useState<ROASCalculationBase>("gross");

  // App mode & integration state
  const [appMode, setAppMode] = useState<AppMode>("production");
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // App data state
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [productSummaries, setProductSummaries] = useState<ProductMetricSummary[]>([]);
  const [topActions, setTopActions] = useState<AIActionItem[]>([]);
  const [dailySummary, setDailySummary] = useState<AIDailySummary | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [healthCounts, setHealthCounts] = useState({
    healthy: 0,
    warning: 0,
    critical: 0,
    opportunities: 0,
  });
  const [unlinkedCount, setUnlinkedCount] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch overview & products metrics
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Overview API
      const resOverview = await fetch(`/api/overview?period=${period}`);
      if (resOverview.ok) {
        const data = await resOverview.json();
        setSummary(data.summary);
        setProductSummaries(data.productSummaries || []);
        setTopActions(data.topActionItems || []);
        setHealthCounts(data.healthCounts || { healthy: 0, warning: 0, critical: 0, opportunities: 0 });
        setChartData(data.chartData || []);
        setUnlinkedCount(data.unlinkedCampaignsCount || 0);
        setAlertsCount(data.activeAlertsCount || 0);
        if (data.integrationStatus) {
          setIntegrationStatus(data.integrationStatus);
        }
        if (data.appMode) {
          setAppMode(data.appMode);
        }
      }

      // 2. Action Center & AI daily summary
      const resActions = await fetch(`/api/action-center?period=${period}`);
      if (resActions.ok) {
        const actionData = await resActions.json();
        setDailySummary(actionData.dailySummary);
        if (actionData.actionItems) {
          setTopActions(actionData.actionItems);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigate to product dossier
  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentView("product-detail");
  };

  // Toggle ROAS calculation base
  const handleRoasBaseToggle = async () => {
    const nextBase = roasBase === "gross" ? "net" : "gross";
    setRoasBase(nextBase);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roasCalculationBase: nextBase }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle App Mode (production vs demo)
  const handleModeToggle = async () => {
    const nextMode: AppMode = appMode === "production" ? "demo" : "production";
    try {
      const res = await fetch("/api/settings/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (res.ok) {
        setAppMode(nextMode);
        setSyncFeedback({
          type: nextMode === 'production' ? 'success' : 'warning',
          message: nextMode === 'production' 
            ? 'Modo Produção ativo: operando com dados 100% reais.' 
            : 'Modo Demonstração ativo: visualizando dados de teste isolados.'
        });
        setTimeout(() => setSyncFeedback(null), 4000);
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Erro ao alternar modo:", err);
    }
  };

  // Real sync trigger
  const handleSyncAll = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Sincronização concluída com sucesso! ${data.metaResult?.campaignsCount ?? 0} campanhas reais atualizadas.`
        });
      } else {
        setSyncFeedback({
          type: 'warning',
          message: data.error || data.metaResult?.error || 'Não foi possível sincronizar Meta Ads. Verifique o token nas configurações.'
        });
      }
      setTimeout(() => setSyncFeedback(null), 5000);
      fetchDashboardData();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: 'Falha de rede na sincronização: ' + err.message
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mark action reviewed
  const handleMarkActionAnalyzed = async (id: string) => {
    try {
      const res = await fetch(`/api/action-center/items/${id}/mark-analyzed`, { method: "POST" });
      if (res.ok) {
        setTopActions((prev) =>
          prev.map((item) => (item.id === id ? { ...item, analyzed: true } : item))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new product
  const handleCreateProduct = async (productData: any) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDashboardData();
        if (selectedProductId === productId) {
          setSelectedProductId(null);
          setCurrentView("products");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-200 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          if (view !== "product-detail") setSelectedProductId(null);
        }}
        unlinkedCount={unlinkedCount}
        alertsCount={alertsCount}
        actionsCount={topActions.filter((a) => !a.analyzed).length}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Mode Notice Banner if active */}
        {appMode === "demo" && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                <strong>Modo Demonstração Ativo:</strong> Exibindo dados de teste isolados para visualização do design. Nenhum dado real é alterado.
              </span>
            </div>
            <button
              onClick={handleModeToggle}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors cursor-pointer"
            >
              Voltar para Modo Produção (Dados Reais)
            </button>
          </div>
        )}

        {/* Sync notification banner if triggered */}
        {syncFeedback && (
          <div className={`px-6 py-2 border-b flex items-center justify-between text-xs font-medium transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : syncFeedback.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            {syncFeedback.type !== 'success' && (
              <button
                onClick={() => setCurrentView('settings')}
                className="underline hover:text-white text-[11px] cursor-pointer"
              >
                Abrir Configurações
              </button>
            )}
          </div>
        )}

        {/* Sticky Header with Filter and Status */}
        <Header
          currentPeriod={period}
          onPeriodChange={setPeriod}
          roasBase={roasBase}
          onRoasBaseToggle={handleRoasBaseToggle}
          unlinkedCount={unlinkedCount}
          onNavigate={(view) => setCurrentView(view)}
          onRefresh={handleSyncAll}
          isRefreshing={isRefreshing}
          integrationStatus={integrationStatus}
          appMode={appMode}
          onModeToggle={handleModeToggle}
        />

        {/* Dynamic View Display */}
        <main className="flex-1 pb-10">
          {currentView === "overview" && (
            <OverviewView
              summary={summary}
              productSummaries={productSummaries}
              topActions={topActions}
              healthCounts={healthCounts}
              chartData={chartData}
              integrationStatus={integrationStatus}
              appMode={appMode}
              onNavigate={(view) => setCurrentView(view)}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {currentView === "action-center" && (
            <ActionCenterView
              dailySummary={dailySummary}
              actionItems={topActions}
              onMarkAnalyzed={handleMarkActionAnalyzed}
              onSelectProduct={handleSelectProduct}
              onNavigate={(view) => setCurrentView(view)}
              onRefreshAnalysis={fetchDashboardData}
              isLoading={isRefreshing}
            />
          )}

          {currentView === "products" && (
            <ProductsView
              products={productSummaries}
              onSelectProduct={handleSelectProduct}
              onCreateProduct={handleCreateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {currentView === "product-detail" && selectedProductId && (
            <ProductDetailView
              productId={selectedProductId}
              onBack={() => {
                setSelectedProductId(null);
                setCurrentView("products");
              }}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === "meta-accounts" && (
            <MetaAccountsView onNavigate={(view) => setCurrentView(view)} />
          )}

          {currentView === "campaigns" && (
            <CampaignsView
              products={productSummaries}
              onRefresh={fetchDashboardData}
            />
          )}

          {currentView === "unlinked-campaigns" && (
            <UnidentifiedCampaignsView
              products={productSummaries}
              onRefresh={fetchDashboardData}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === "cakto-sales" && (
            <CaktoSalesView
              products={productSummaries}
              onRefresh={fetchDashboardData}
            />
          )}

          {currentView === "ai-intelligence" && (
            <AIIntelligenceView
              dailySummary={dailySummary}
              actionItems={topActions}
              products={productSummaries}
              onRefreshAnalysis={fetchDashboardData}
              isLoading={isRefreshing}
            />
          )}

          {currentView === "alerts" && (
            <AlertsView
              onNavigate={(view) => setCurrentView(view)}
              onRefresh={fetchDashboardData}
            />
          )}

          {currentView === "logs" && <LogsView />}

          {currentView === "settings" && <SettingsView />}
        </main>

        {/* Sleek Status Footer Bar */}
        <footer className="flex h-10 items-center justify-between border-t border-slate-800 bg-[#0b0f1a] px-6 text-[10px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${integrationStatus?.cakto?.webhookActive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span>IDEMPOTÊNCIA CAKTO: Ativa (Proteção de Duplicatas 100%)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Origem: {appMode === 'production' ? 'APIs Reais Meta & Cakto' : 'Dataset Isolado Demo'}</span>
            <span>Taxa Meta Ativa: 10% (Brasil IOF)</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
