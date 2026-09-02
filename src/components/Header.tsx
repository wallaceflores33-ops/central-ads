import React from "react";
import { PeriodFilter, ROASCalculationBase, IntegrationStatus, AppMode } from "../types/index.ts";
import { 
  RefreshCw, 
  AlertTriangle, 
  Radio,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Activity
} from "lucide-react";
import { NavView } from "./Sidebar.tsx";

interface HeaderProps {
  currentPeriod: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  roasBase: ROASCalculationBase;
  onRoasBaseToggle: () => void;
  unlinkedCount: number;
  onNavigate: (view: NavView) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  integrationStatus?: IntegrationStatus | null;
  appMode?: AppMode;
  onModeToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPeriod,
  onPeriodChange,
  roasBase,
  onRoasBaseToggle,
  unlinkedCount,
  onNavigate,
  onRefresh,
  isRefreshing = false,
  integrationStatus,
  appMode = 'production',
  onModeToggle
}) => {
  const periods: { id: PeriodFilter; label: string }[] = [
    { id: "today", label: "Hoje" },
    { id: "yesterday", label: "Ontem" },
    { id: "3d", label: "3 dias" },
    { id: "7d", label: "7 dias" },
    { id: "14d", label: "14 dias" },
    { id: "30d", label: "30 dias" },
    { id: "this_month", label: "Este mês" },
    { id: "last_month", label: "Mês ant." },
  ];

  const isMetaConnected = integrationStatus?.meta?.connected;
  const isCaktoConnected = integrationStatus?.cakto?.connected;

  return (
    <header className="sticky top-0 z-30 bg-[#0b0f1a] border-b border-slate-800 px-6 py-2.5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Left: App Mode Badge + Period Filter */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          {/* Mode Toggle Pill */}
          <button
            id="header-app-mode-toggle"
            onClick={onModeToggle}
            title={appMode === 'production' 
              ? "Modo Produção ativo: Visualizando dados reais. Clique para alternar para modo Demonstração." 
              : "Modo Demonstração ativo: Visualizando dados de teste isolados. Clique para voltar para Produção."}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              appMode === 'production'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${appMode === 'production' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{appMode === 'production' ? 'Produção (Dados Reais)' : 'Demonstração (Teste)'}</span>
          </button>

          {/* Integration Mini Status Badges */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => onNavigate('settings')}
              title={isMetaConnected ? "Meta Ads Conectado" : "Meta Ads Não Conectado - Clique para configurar"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                isMetaConnected 
                  ? "bg-slate-900 border-slate-700 text-slate-300"
                  : "bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMetaConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>Meta: {isMetaConnected ? 'Conectado' : 'Não conectado'}</span>
            </button>

            <button
              onClick={() => onNavigate('settings')}
              title={isCaktoConnected ? "Cakto Conectado" : "Cakto Aguardando Webhook - Clique para ver URL"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                isCaktoConnected 
                  ? "bg-slate-900 border-slate-700 text-slate-300"
                  : "bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCaktoConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>Cakto: {isCaktoConnected ? 'Conectado' : 'Não conectado'}</span>
            </button>
          </div>

          {/* Period Filter Selector */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-md border border-slate-800 shrink-0">
            {periods.map((p) => (
              <button
                key={p.id}
                id={`period-btn-${p.id}`}
                onClick={() => onPeriodChange(p.id)}
                className={`px-2.5 py-1 text-xs rounded transition-all font-medium whitespace-nowrap ${
                  currentPeriod === p.id
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions & Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Unlinked campaign warning banner if any */}
          {unlinkedCount > 0 && (
            <button
              id="header-unlinked-alert"
              onClick={() => onNavigate("unlinked-campaigns")}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/25 transition-all animate-pulse"
              title="Campanhas gastando sem produto identificado"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{unlinkedCount} sem código!</span>
            </button>
          )}

          {/* ROAS Calculation Base Toggle */}
          <button
            id="toggle-roas-base"
            onClick={onRoasBaseToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800/80 border border-slate-700/70 text-slate-300 text-xs font-medium hover:text-white hover:bg-slate-700/60 transition-all"
            title="Clique para alternar entre Faturamento Bruto e Faturamento Líquido Cakto no cálculo do ROAS"
          >
            <span className="text-slate-500 text-[11px] uppercase tracking-wider">Base:</span>
            <span className="font-bold text-indigo-400 tracking-wide text-xs">
              {roasBase === "gross" ? "Bruto Cakto" : "Líquido Cakto"}
            </span>
          </button>

          {/* Refresh / Real Sync Button */}
          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title="Sincronizar dados reais da Meta Marketing API e Webhook Cakto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? "animate-spin text-white" : ""
              }`}
            />
            <span>{isRefreshing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
