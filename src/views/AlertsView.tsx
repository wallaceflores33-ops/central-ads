import React, { useEffect, useState } from "react";
import { SystemAlert } from "../types/index.ts";
import { formatDate } from "../lib/utils.ts";
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Sliders, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";

interface AlertsViewProps {
  onNavigate: (view: NavView) => void;
  onRefresh: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onNavigate, onRefresh }) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = () => {
    setLoading(true);
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: "POST" });
      if (res.ok) {
        loadAlerts();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Alertas da Operação
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento em tempo real de anomalias financeiras, campanhas desvinculadas e desvios de CPA.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Alertas ativos: <strong className="text-amber-400">{alerts.filter((a) => !a.resolved).length}</strong>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <Sliders className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xs">
            <strong className="text-white block font-semibold">Regras de Monitoramento Ativas</strong>
            <span className="text-slate-400 text-[11px]">
              Campanha sem código • CPA Real &gt; 150% do aceitável • Queda de ROAS &gt; 30% • Discrepâncias de faturamento
            </span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center bg-[#0b0f1a] border border-slate-800 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">Nenhum alerta pendente</h3>
            <p className="text-xs text-slate-400 mt-1">Todos os parâmetros operacionais estão normais.</p>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`bg-[#0b0f1a] border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                a.resolved
                  ? "border-slate-800/40 opacity-50"
                  : a.severity === "high"
                  ? "border-rose-500/40 bg-rose-950/10"
                  : "border-amber-500/30 bg-amber-950/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    a.severity === "high"
                      ? "bg-rose-500/15 text-rose-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-bold text-white">{a.title}</h3>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        a.severity === "high"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {a.severity === "high" ? "Alta Severidade" : "Atenção"}
                    </span>
                    {a.resolved && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Resolvido
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{a.message}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                    {formatDate(a.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {a.type === "unlinked_campaign" && !a.resolved && (
                  <button
                    onClick={() => onNavigate("unlinked-campaigns")}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Vincular</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {!a.resolved && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Resolver</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
