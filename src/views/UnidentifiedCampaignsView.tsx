import React, { useEffect, useState } from "react";
import { formatCurrency } from "../lib/utils.ts";
import { ProductMetricSummary } from "../types/index.ts";
import { 
  HelpCircle, 
  AlertTriangle, 
  Link2, 
  Plus, 
  CheckCircle2, 
  ExternalLink 
} from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";

interface UnidentifiedCampaignsViewProps {
  products: ProductMetricSummary[];
  onRefresh: () => void;
  onNavigate: (view: NavView) => void;
}

export const UnidentifiedCampaignsView: React.FC<UnidentifiedCampaignsViewProps> = ({
  products,
  onRefresh,
  onNavigate,
}) => {
  const [unlinked, setUnlinked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [targetProductId, setTargetProductId] = useState<string>("");

  const loadUnlinked = () => {
    setLoading(true);
    fetch("/api/campaigns/unlinked")
      .then((res) => res.json())
      .then((data) => {
        setUnlinked(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUnlinked();
  }, []);

  const handleLink = async () => {
    if (!selectedCampaign || !targetProductId) return;
    try {
      const res = await fetch("/api/campaigns/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          productId: targetProductId,
        }),
      });
      if (res.ok) {
        setSelectedCampaign(null);
        setTargetProductId("");
        loadUnlinked();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalUnlinkedSpend = unlinked.reduce((acc, c) => acc + c.spend, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Campanhas sem Identificação de Produto
            </h1>
            <p className="text-xs text-rose-200/80 leading-relaxed max-w-2xl font-medium">
              Estas campanhas estão ativas e gerando gasto no Meta Ads, mas não possuem uma tag de produto reconhecida no nome (ex: <code className="text-white font-mono bg-rose-900/40 px-1 py-0.5 rounded">[FOTO01]</code>).
              <br />
              <strong className="text-white">Regra fundamental:</strong> Nenhum investimento pode desaparecer silenciosamente dos relatórios. Vincule-as abaixo para computar o custo real correto.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between text-xs">
          <span className="text-rose-300 font-medium">
            {unlinked.length} {unlinked.length === 1 ? "campanha pendente" : "campanhas pendentes"}
          </span>
          <span className="text-white font-bold">
            Gasto Desvinculado no Período: {formatCurrency(totalUnlinkedSpend)}
          </span>
        </div>
      </div>

      {/* Unlinked List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : unlinked.length === 0 ? (
        <div className="p-12 text-center bg-[#0b0f1a] border border-slate-800 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-bold text-white">100% das Campanhas Identificadas</h3>
          <p className="text-xs text-slate-400 mt-1">
            Todo o investimento em tráfego está devidamente associado aos seus produtos e faturamento Cakto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unlinked.map((c) => (
            <div
              key={c.id}
              className="bg-[#0b0f1a] border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3.5 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Conta: <strong className="text-slate-200">{c.accountName}</strong>
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 uppercase tracking-wider">
                    Sem Tag [CÓDIGO]
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white leading-snug">
                  {c.name}
                </h3>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  ID: {c.id}
                </span>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Gasto Meta:</span>
                    <strong className="text-white text-xs">{formatCurrency(c.spend)}</strong>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Custo Real (+Taxa):</span>
                    <strong className="text-amber-400 text-xs">{formatCurrency(c.realCost)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedCampaign(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Vincular a Produto</span>
                </button>

                <button
                  onClick={() => onNavigate("products")}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                  title="Criar novo produto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Produto</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              Vincular Campanha a Produto
            </h3>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block mb-0.5">Campanha:</span>
              <strong className="text-white">{selectedCampaign.name}</strong>
              <div className="text-amber-400 mt-1">Gasto: {formatCurrency(selectedCampaign.spend)}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Associar a qual produto:
              </label>
              <select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Selecione o produto...</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} [{p.productCode}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleLink}
                disabled={!targetProductId}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
