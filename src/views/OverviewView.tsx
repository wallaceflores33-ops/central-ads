import React, { useState } from "react";
import { 
  FinancialSummary, 
  ProductMetricSummary, 
  AIActionItem, 
  PeriodFilter,
  IntegrationStatus,
  AppMode
} from "../types/index.ts";
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  getHealthBadge, 
  getCategoryBadge 
} from "../lib/utils.ts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Zap, 
  Target, 
  Percent, 
  ShoppingBag, 
  BarChart2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Receipt,
  Sparkles,
  RefreshCw,
  Radio,
  Server,
  Layers,
  Database,
  ExternalLink,
  Plus
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { NavView } from "../components/Sidebar.tsx";

interface OverviewViewProps {
  summary: FinancialSummary | null;
  productSummaries: ProductMetricSummary[];
  topActions: AIActionItem[];
  healthCounts: {
    healthy: number;
    warning: number;
    critical: number;
    opportunities: number;
  };
  chartData: any[];
  integrationStatus?: IntegrationStatus | null;
  appMode?: AppMode;
  onNavigate: (view: NavView) => void;
  onSelectProduct: (productId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  summary,
  productSummaries,
  topActions,
  healthCounts,
  chartData,
  integrationStatus,
  appMode = 'production',
  onNavigate,
  onSelectProduct,
}) => {
  const [chartType, setChartType] = useState<"spend_rev" | "cpa_sales" | "roas_spend">("spend_rev");
  const [rankingSort, setRankingSort] = useState<"roas" | "profit" | "cpa" | "sales" | "revenue" | "spend">("profit");

  if (!summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando métricas da operação...</p>
        </div>
      </div>
    );
  }

  const isMetaConnected = integrationStatus?.meta?.connected ?? false;
  const isCaktoConnected = integrationStatus?.cakto?.connected ?? false;
  const isSupabaseConnected = integrationStatus?.supabase?.connected ?? false;

  const hasRealData = (summary.realCost > 0 || summary.approvedSales > 0 || productSummaries.length > 0);

  // Sort products for ranking
  const sortedProducts = [...productSummaries].sort((a, b) => {
    switch (rankingSort) {
      case "roas": return b.realRoas - a.realRoas;
      case "profit": return b.profit - a.profit;
      case "cpa": return a.realCpa - b.realCpa;
      case "sales": return b.approvedSales - a.approvedSales;
      case "revenue": return b.effectiveRevenue - a.effectiveRevenue;
      case "spend": return b.realCost - a.realCost;
      default: return b.profit - a.profit;
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner with App Mode indicator */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Dashboard Geral
              </h1>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                appMode === 'production'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {appMode === 'production' ? 'Produção (Dados Reais)' : 'Modo Demonstração'}
              </span>
            </div>
            <p className="text-slate-400 text-xs max-w-2xl font-medium leading-relaxed">
              {appMode === 'production'
                ? "Painel alimentado exclusivamente por dados reais da Meta Marketing API e Webhook da Cakto. Sem simulações ou números fictícios."
                : "Ambiente de visualização prévia com dados de teste isolados. Alterne para o Modo Produção para operar com dados reais."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-goto-products"
              onClick={() => onNavigate("products")}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cadastrar Produto</span>
            </button>
            <button
              id="btn-goto-action-center"
              onClick={() => onNavigate("action-center")}
              className="flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Inteligência Artificial</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Status das Integrações (Mandatory Rule 9) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Status das Integrações
            </h2>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Gerenciar Credenciais</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Meta Ads Card */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
            isMetaConnected 
              ? 'bg-slate-900/90 border-slate-800' 
              : 'bg-rose-950/20 border-rose-900/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Meta Ads</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isMetaConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMetaConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isMetaConnected ? 'Conectado' : 'Não conectado'}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Última sincronização:</span>
                <span className="text-slate-300 font-medium">{integrationStatus?.meta?.lastSyncAt || 'Pendente'}</span>
              </div>
              <div className="flex justify-between">
                <span>Contas de anúncio:</span>
                <span className="text-slate-300 font-medium">{integrationStatus?.meta?.accountsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Campanhas rastreadas:</span>
                <span className="text-slate-300 font-medium">{integrationStatus?.meta?.campaignsCount ?? 0}</span>
              </div>
            </div>

            {!isMetaConnected && (
              <div className="mt-3 pt-2.5 border-t border-rose-900/30">
                <button
                  onClick={() => onNavigate('settings')}
                  className="w-full py-1 text-center text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 rounded border border-rose-500/40 transition-colors"
                >
                  Conectar Meta Ads
                </button>
              </div>
            )}
          </div>

          {/* Cakto Card */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
            isCaktoConnected 
              ? 'bg-slate-900/90 border-slate-800' 
              : 'bg-rose-950/20 border-rose-900/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Cakto</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCaktoConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCaktoConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isCaktoConnected ? 'Conectado' : 'Não conectado'}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Último evento recebido:</span>
                <span className="text-slate-300 font-medium">{integrationStatus?.cakto?.lastEventAt || 'Nenhum evento ainda'}</span>
              </div>
              <div className="flex justify-between">
                <span>Transações registradas:</span>
                <span className="text-slate-300 font-medium">{integrationStatus?.cakto?.transactionsCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Status do Webhook:</span>
                <span className={`font-semibold ${integrationStatus?.cakto?.webhookActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {integrationStatus?.cakto?.webhookActive ? 'Ativo' : 'Aguardando 1º envio'}
                </span>
              </div>
            </div>

            {!isCaktoConnected && (
              <div className="mt-3 pt-2.5 border-t border-rose-900/30">
                <button
                  onClick={() => onNavigate('settings')}
                  className="w-full py-1 text-center text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 rounded border border-rose-500/40 transition-colors"
                >
                  Conectar Cakto (Ver Webhook)
                </button>
              </div>
            )}
          </div>

          {/* Supabase Storage Card */}
          <div className="p-3.5 rounded-lg border bg-slate-900/90 border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Supabase / Banco</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSupabaseConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                {isSupabaseConnected ? 'Conectado' : 'Local / Opcional'}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Persistência na Nuvem:</span>
                <span className="text-slate-300 font-medium">{isSupabaseConnected ? 'Ativa (Supabase)' : 'Memória + Local'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tabelas RLS:</span>
                <span className="text-slate-300 font-medium">products, campaigns, cakto_tx</span>
              </div>
              <div className="flex justify-between">
                <span>Idempotência de Webhook:</span>
                <span className="text-emerald-400 font-semibold">Ativa</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <button
                onClick={() => onNavigate('settings')}
                className="w-full py-1 text-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
              >
                {isSupabaseConnected ? 'Configurações Supabase' : 'Conectar Supabase'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Empty State OR Real Metrics Presentation */}
      {!hasRealData && appMode === 'production' ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Database className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">Nenhum dado disponível</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O sistema está pronto para receber os dados da sua operação. Conecte sua conta Meta Ads e aponte o Webhook da Cakto para que as métricas reais apareçam aqui.
            </p>
          </div>

          {/* Setup Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Conectar Meta Ads</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Configurar Webhook Cakto</span>
            </button>
            <button
              onClick={() => onNavigate('products')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          </div>

          {/* 4 Step Onboarding Guide */}
          <div className="mt-8 pt-8 border-t border-slate-800/80 max-w-3xl mx-auto text-left">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Como colocar a Central Ads em operação real:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-indigo-400 mb-1">1. Conectar Meta Marketing API</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Acesse Configurações &gt; Meta Ads e insira seu Token de Acesso permanente. O sistema importará automaticamente suas contas e campanhas.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-indigo-400 mb-1">2. Cadastrar Webhook na Cakto</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  No painel da Cakto, configure a URL <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">/api/webhooks/cakto</code> para receber todas as compras aprovadas instantaneamente.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-indigo-400 mb-1">3. Cadastrar Produtos &amp; [CÓDIGO]</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  No menu Produtos, informe o ID do produto na Cakto e o código de campanha (ex: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">[PROD01]</code>).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="font-semibold text-indigo-400 mb-1">4. Inteligência Sem Ficção</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  A IA só fará recomendações e diagnósticos a partir de dados reais recebidos da sua operação, sem suposições.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Priority Financial Metrics Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                Métricas Financeiras Consolidadas
              </h2>
              <span className="text-[10px] text-slate-500">
                Custo Real = Investimento Meta + Impostos/Taxas
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Investimento Real */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Investimento Real
                  </div>
                  <div className="mt-1 text-xl font-bold text-white tracking-tight">
                    {formatCurrency(summary.realCost)}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Meta: {formatCurrency(summary.metaSpend)}</span>
                  <span className="text-amber-400">+{formatCurrency(summary.metaTaxes)}</span>
                </div>
              </div>

              {/* Faturamento Cakto */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Faturamento Cakto
                  </div>
                  <div className="mt-1 text-xl font-bold text-white tracking-tight">
                    {formatCurrency(summary.effectiveRevenue)}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatNumber(summary.approvedSales)} vendas</span>
                  <span className="text-emerald-400 font-medium">Líq: {formatCurrency(summary.netRevenue)}</span>
                </div>
              </div>

              {/* ROAS Real */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    ROAS Real
                  </div>
                  <div className="mt-1 text-xl font-bold text-indigo-400 tracking-tight flex items-center gap-1.5">
                    {summary.realRoas.toFixed(2)}x
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300">
                      {summary.realRoas >= 2 ? "Saudável" : "Em Atenção"}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                  Receita ÷ Custo Real
                </div>
              </div>

              {/* CPA Real */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    CPA Real
                  </div>
                  <div className="mt-1 text-xl font-bold text-white tracking-tight">
                    {formatCurrency(summary.realCpa)}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
                  <span>Break-even:</span>
                  <span className="text-slate-300 font-medium">{formatCurrency(summary.breakEvenCpa)}</span>
                </div>
              </div>

              {/* Resultado (Lucro) */}
              <div className="rounded-xl border border-slate-800 bg-indigo-900/20 p-4 ring-1 ring-indigo-500/30 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">
                    Lucro Líquido
                  </div>
                  <div className="mt-1 text-xl font-bold text-white tracking-tight">
                    {summary.profit >= 0 ? "+" : ""}{formatCurrency(summary.profit)}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-indigo-500/20 text-[10px] text-indigo-400 font-medium">
                  Margem: {formatPercent(summary.margin)}
                </div>
              </div>

              {/* Vendas Aprovadas */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Vendas Aprovadas
                  </div>
                  <div className="mt-1 text-xl font-bold text-white tracking-tight">
                    {formatNumber(summary.approvedSales)}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
                  <span>Order Bumps:</span>
                  <span className="text-emerald-400 font-medium">+{formatCurrency(summary.orderBumpRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Chart with Toggle */}
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  Evolução do Período
                </h3>
                <p className="text-xs text-slate-400">
                  Cruzamento diário entre investimento real Meta e vendas da Cakto
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start">
                <button
                  onClick={() => setChartType("spend_rev")}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                    chartType === "spend_rev"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Custo vs Receita
                </button>
                <button
                  onClick={() => setChartType("cpa_sales")}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                    chartType === "cpa_sales"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  CPA vs Vendas
                </button>
                <button
                  onClick={() => setChartType("roas_spend")}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                    chartType === "roas_spend"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ROAS vs Custo
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "spend_rev" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(val: any) => formatCurrency(Number(val))}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="realCost" name="Custo Real Meta" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Receita Cakto" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : chartType === "cpa_sales" ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Line type="monotone" dataKey="cpa" name="CPA Real (R$)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="sales" name="Vendas Cakto" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Line type="monotone" dataKey="roas" name="ROAS Real" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="realCost" name="Custo Real (R$)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Gráfico aguardando transações com data no período para gerar curva diária.
                </div>
              )}
            </div>
          </div>

          {/* Ranking de Produtos por Performance */}
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  Ranking de Performance por Produto
                </h3>
                <p className="text-xs text-slate-400">
                  Produtos cadastrados cruzados com campanhas e vendas reais da Cakto
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Ordenar por:</span>
                <select
                  value={rankingSort}
                  onChange={(e) => setRankingSort(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 outline-none"
                >
                  <option value="profit">Maior Lucro</option>
                  <option value="roas">Maior ROAS</option>
                  <option value="revenue">Maior Receita</option>
                  <option value="sales">Mais Vendas</option>
                  <option value="cpa">Menor CPA</option>
                  <option value="spend">Maior Gasto</option>
                </select>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Nenhum produto cadastrado ainda.</p>
                <button
                  onClick={() => onNavigate('products')}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Cadastrar Produto
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Código</th>
                      <th className="p-3 text-right">Custo Real</th>
                      <th className="p-3 text-right">Vendas</th>
                      <th className="p-3 text-right">Faturamento</th>
                      <th className="p-3 text-right">CPA Real</th>
                      <th className="p-3 text-right">ROAS</th>
                      <th className="p-3 text-right">Lucro</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortedProducts.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-medium text-white">{p.productName}</td>
                        <td className="p-3 font-mono text-indigo-400">[{p.productCode}]</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(p.realCost)}</td>
                        <td className="p-3 text-right">{formatNumber(p.approvedSales)}</td>
                        <td className="p-3 text-right font-medium text-emerald-400">{formatCurrency(p.effectiveRevenue)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(p.realCpa)}</td>
                        <td className="p-3 text-right font-bold text-indigo-400">{p.realRoas.toFixed(2)}x</td>
                        <td className="p-3 text-right font-semibold text-white">{formatCurrency(p.profit)}</td>
                        <td className="p-3 text-center">
                          {(() => {
                            const health = getHealthBadge(p.healthScore);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${health.dotClass}`} />
                                {health.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onSelectProduct(p.productId)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-medium transition-colors"
                          >
                            Dossiê
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
