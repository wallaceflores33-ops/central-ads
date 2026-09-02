import React from "react";
import {
  LayoutDashboard,
  Zap,
  Package,
  Layers,
  BarChart3,
  HelpCircle,
  ShoppingBag,
  Sparkles,
  Bell,
  ScrollText,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sliders,
  DollarSign
} from "lucide-react";

export type NavView =
  | "overview"
  | "action-center"
  | "products"
  | "product-detail"
  | "meta-accounts"
  | "campaigns"
  | "unlinked-campaigns"
  | "cakto-sales"
  | "ai-intelligence"
  | "alerts"
  | "logs"
  | "settings";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  unlinkedCount: number;
  alertsCount: number;
  actionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  unlinkedCount,
  alertsCount,
  actionsCount,
}) => {
  return (
    <aside className="w-60 bg-[#0b0f1a] border-r border-slate-800 flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm text-sm tracking-tight">
            CA
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight tracking-tight flex items-center gap-1.5">
              CENTRAL ADS
              <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Meta Ads + Cakto
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {/* Principal */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Principal
          </div>
          <button
            id="nav-overview"
            onClick={() => onSelectView("overview")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "overview"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Visão Geral</span>
          </button>

          <button
            id="nav-action-center"
            onClick={() => onSelectView("action-center")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "action-center"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Central de Ações</span>
            </div>
            {actionsCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {actionsCount}
              </span>
            )}
          </button>

          <button
            id="nav-products"
            onClick={() => onSelectView("products")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "products" || currentView === "product-detail"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Produtos</span>
          </button>
        </div>

        {/* Tráfego Meta Ads */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Meta Ads
          </div>
          <button
            id="nav-meta-accounts"
            onClick={() => onSelectView("meta-accounts")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "meta-accounts"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Contas de Anúncios</span>
          </button>

          <button
            id="nav-campaigns"
            onClick={() => onSelectView("campaigns")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "campaigns"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Campanhas</span>
          </button>

          <button
            id="nav-unlinked-campaigns"
            onClick={() => onSelectView("unlinked-campaigns")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "unlinked-campaigns"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Sem Identificação</span>
            </div>
            {unlinkedCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                {unlinkedCount}
              </span>
            )}
          </button>
        </div>

        {/* Faturamento Cakto */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Financeiro Cakto
          </div>
          <button
            id="nav-cakto-sales"
            onClick={() => onSelectView("cakto-sales")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "cakto-sales"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Vendas Cakto</span>
          </button>
        </div>

        {/* Inteligência & Monitoramento */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Inteligência & Gestão
          </div>
          <button
            id="nav-ai-intelligence"
            onClick={() => onSelectView("ai-intelligence")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "ai-intelligence"
                ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Inteligência Artificial</span>
          </button>

          <button
            id="nav-alerts"
            onClick={() => onSelectView("alerts")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "alerts"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Alertas</span>
            </div>
            {alertsCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-amber-500/20">
                {alertsCount}
              </span>
            )}
          </button>

          <button
            id="nav-logs"
            onClick={() => onSelectView("logs")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "logs"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <ScrollText className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Logs de Integração</span>
          </button>

          <button
            id="nav-settings"
            onClick={() => onSelectView("settings")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              currentView === "settings"
                ? "bg-slate-800/60 text-white font-semibold ring-1 ring-slate-700/50"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* Footer / Synchronization Status */}
      <div className="border-t border-slate-800 p-4 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Sincronização
        </div>
        <div className="px-3 py-0.5 text-[10px] text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Meta Ads: Ativo</span>
        </div>
        <div className="px-3 py-0.5 text-[10px] text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Cakto: Conectado</span>
        </div>
        <div className="px-3 py-0.5 text-[10px] text-indigo-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>IA Gemini: Pronta</span>
        </div>
      </div>
    </aside>
  );
};
