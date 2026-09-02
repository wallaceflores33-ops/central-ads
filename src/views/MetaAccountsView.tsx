import React, { useEffect, useState } from "react";
import { formatCurrency, formatNumber } from "../lib/utils.ts";
import { Layers, DollarSign, BarChart2, ShieldCheck, ChevronRight } from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";

interface MetaAccountsViewProps {
  onNavigate: (view: NavView) => void;
}

export const MetaAccountsView: React.FC<MetaAccountsViewProps> = ({ onNavigate }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meta-accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSpend = accounts.reduce((acc, a) => acc + a.spend, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Contas de Anúncios Meta Ads
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie múltiplas contas de anúncios e BMs com rateio automático por produto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#0b0f1a] border border-slate-800 text-xs text-slate-300">
            Total Gasto: <strong className="text-white ml-1">{formatCurrency(totalSpend)}</strong>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm">{acc.name}</h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    BM: {acc.bmName}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {acc.status}
                </span>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-2 gap-3 py-3">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Gasto Meta
                  </span>
                  <strong className="text-base text-white font-bold tracking-tight">
                    {formatCurrency(acc.spend)}
                  </strong>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Campanhas
                  </span>
                  <strong className="text-base text-slate-200 font-bold tracking-tight">
                    {acc.activeCampaigns} <span className="text-xs text-slate-400 font-normal">/ {acc.totalCampaigns}</span>
                  </strong>
                </div>
              </div>

              {/* Product Distribution Breakdown */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Distribuição por Produto:
                </span>
                <div className="space-y-2">
                  {acc.productDistribution?.map((dist: any, idx: number) => {
                    const pct = acc.spend > 0 ? (dist.spend / acc.spend) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span className="truncate max-w-[180px]">{dist.productName}</span>
                          <span className="font-medium text-slate-200">{formatCurrency(dist.spend)}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/60">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[10px]">{acc.id}</span>
              <button
                onClick={() => onNavigate("campaigns")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 text-xs cursor-pointer"
              >
                <span>Ver campanhas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
