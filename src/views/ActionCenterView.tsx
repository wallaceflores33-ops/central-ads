import React, { useState } from "react";
import { AIDailySummary, AIActionItem } from "../types/index.ts";
import { 
  formatCurrency, 
  formatPercent, 
  formatDecimal, 
  getCategoryBadge 
} from "../lib/utils.ts";
import { 
  Zap, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  ArrowRight, 
  Check, 
  ExternalLink,
  Info,
  Clock,
  RefreshCw,
  Eye
} from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";

interface ActionCenterViewProps {
  dailySummary: AIDailySummary | null;
  actionItems: AIActionItem[];
  onMarkAnalyzed: (id: string) => void;
  onSelectProduct: (productId: string) => void;
  onNavigate: (view: NavView) => void;
  onRefreshAnalysis: () => void;
  isLoading?: boolean;
}

export const ActionCenterView: React.FC<ActionCenterViewProps> = ({
  dailySummary,
  actionItems,
  onMarkAnalyzed,
  onSelectProduct,
  onNavigate,
  onRefreshAnalysis,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyPending, setShowOnlyPending] = useState<boolean>(true);

  // Filter items
  const filteredItems = actionItems.filter((item) => {
    if (showOnlyPending && item.analyzed) return false;
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & AI Summary Card */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Central de Ações
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                Análise Inteligente
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Diagnósticos objetivos baseados na regra: investimento Meta + vendas reais Cakto. Sem decisões precipitadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshAnalysis}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-white" : ""}`} />
              <span>{isLoading ? "Processando IA..." : "Reanalisar Operação"}</span>
            </button>
          </div>
        </div>

        {/* Daily Summary Box */}
        {dailySummary && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Diagnóstico Geral da Operação ({dailySummary.date})
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {dailySummary.summaryText}
              </p>
            </div>

            {dailySummary.topRecommendations && dailySummary.topRecommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Principais Recomendações do Dia:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {dailySummary.topRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2 font-medium"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] leading-snug">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f1a] border border-slate-800 p-2.5 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtrar:
          </span>
          {[
            { id: "all", label: "Todas" },
            { id: "action_required", label: "🔴 Ação Necessária" },
            { id: "warning", label: "🟡 Atenção" },
            { id: "opportunity", label: "🟢 Oportunidades" },
            { id: "info", label: "🔵 Informativas" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-slate-800 text-indigo-400 font-bold border border-slate-700/60"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 pr-1">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span>Apenas pendentes ({actionItems.filter(i => !i.analyzed).length})</span>
          </label>
        </div>
      </div>

      {/* 3. Action Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-[#0b0f1a] border border-slate-800 rounded-xl">
          <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">Tudo em dia!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Nenhuma ação pendente na categoria selecionada. Sua operação está dentro dos parâmetros definidos.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const badge = getCategoryBadge(item.category);
            return (
              <div
                key={item.id}
                className={`bg-[#0b0f1a] border rounded-xl p-4.5 transition-all shadow-sm ${
                  item.analyzed
                    ? "border-slate-800/60 opacity-60"
                    : item.category === "action_required"
                    ? "border-rose-500/40 bg-rose-950/10"
                    : item.category === "warning"
                    ? "border-amber-500/40 bg-amber-950/10"
                    : item.category === "opportunity"
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : "border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Context & Diagnosis */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.badgeClass}`}>
                        {badge.label}
                      </span>
                      {item.productName && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                          {item.productName}
                        </span>
                      )}
                      {item.analyzed && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Analisado
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-white leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Structured Diagnosis Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Diagnóstico Estruturado
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {item.diagnosis}
                        </p>
                        {item.possibleCause && (
                          <p className="text-[11px] text-slate-400 mt-2">
                            <strong className="text-slate-300">Possível causa:</strong> {item.possibleCause}
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30">
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                          Recomendação Acionável
                        </div>
                        <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                          {item.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Mini Metric Snapshot */}
                    {item.metricsSnapshot && (
                      <div className="pt-1.5 flex items-center gap-3.5 text-xs text-slate-400 overflow-x-auto">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Snapshot:</span>
                        <span>CPA: <strong className="text-white">{formatCurrency(item.metricsSnapshot.cpa)}</strong></span>
                        <span>ROAS: <strong className="text-indigo-400">{item.metricsSnapshot.roas.toFixed(2)}x</strong></span>
                        <span>CTR: <strong className="text-white">{formatPercent(item.metricsSnapshot.ctr)}</strong></span>
                        <span>CPC: <strong className="text-white">{formatCurrency(item.metricsSnapshot.cpc)}</strong></span>
                        <span>CPM: <strong className="text-white">{formatCurrency(item.metricsSnapshot.cpm)}</strong></span>
                        <span>Freq: <strong className="text-white">{item.metricsSnapshot.frequency.toFixed(2)}</strong></span>
                        <span>Gasto: <strong className="text-white">{formatCurrency(item.metricsSnapshot.spend)}</strong></span>
                        <span>Vendas: <strong className="text-white">{item.metricsSnapshot.sales}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    {item.productId && (
                      <button
                        onClick={() => onSelectProduct(item.productId!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ver Produto</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate("campaigns")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ver Campanhas</span>
                    </button>

                    {!item.analyzed && (
                      <button
                        onClick={() => onMarkAnalyzed(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Marcar Analisado</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
