import React, { useEffect, useState } from "react";
import { Campaign, ProductMetricSummary } from "../types/index.ts";
import { formatCurrency, formatPercent } from "../lib/utils.ts";
import { 
  BarChart3, 
  Search, 
  Filter, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ExternalLink
} from "lucide-react";

interface CampaignsViewProps {
  products: ProductMetricSummary[];
  onRefresh: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ products, onRefresh }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Linking modal state
  const [selectedCampaignForLink, setSelectedCampaignForLink] = useState<any | null>(null);
  const [targetProductId, setTargetProductId] = useState<string>("");

  const loadCampaigns = () => {
    setLoading(true);
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleLinkCampaign = async () => {
    if (!selectedCampaignForLink || !targetProductId) return;
    try {
      const res = await fetch("/api/campaigns/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaignForLink.id,
          productId: targetProductId,
        }),
      });
      if (res.ok) {
        setSelectedCampaignForLink(null);
        setTargetProductId("");
        loadCampaigns();
        onRefresh();
      }
    } catch (err) {
      console.error("Erro ao vincular campanha:", err);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterAccount !== "all" && c.accountId !== filterAccount) return false;
    if (filterStatus !== "all" && c.linkStatus !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.accountName.toLowerCase().includes(term) ||
        (c.linkedProductName && c.linkedProductName.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Campanhas Meta Ads
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Todas as campanhas de todas as contas com cálculo de Custo Real e vínculo por código.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total de campanhas: <strong className="text-white">{campaigns.length}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0b0f1a] border border-slate-800 p-2.5 rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar campanha por nome ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as vinculações</option>
            <option value="auto">Vinculada Automaticamente</option>
            <option value="manual">Vinculada Manualmente</option>
            <option value="unlinked">Sem Identificação</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Campanha</th>
                <th className="py-2.5 px-3">Conta</th>
                <th className="py-2.5 px-3">Produto Vinculado</th>
                <th className="py-2.5 px-3 text-right">Gasto Meta</th>
                <th className="py-2.5 px-3 text-right">+Imposto</th>
                <th className="py-2.5 px-3 text-right">Custo Real</th>
                <th className="py-2.5 px-3 text-right">Vendas Meta</th>
                <th className="py-2.5 px-3 text-right">CPA Meta</th>
                <th className="py-2.5 px-3 text-right">CTR</th>
                <th className="py-2.5 px-3 text-right">CPC</th>
                <th className="py-2.5 px-3 text-center">Vinculação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white max-w-xs truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{c.id}</div>
                  </td>

                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    {c.accountName}
                  </td>

                  <td className="py-3 px-3">
                    {c.linkedProductName ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {c.linkedProductName}
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedCampaignForLink(c)}
                        className="text-rose-400 font-semibold hover:underline flex items-center gap-1 text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Vincular Agora
                      </button>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-slate-200">
                    {formatCurrency(c.spend)}
                  </td>

                  <td className="py-3 px-3 text-right text-amber-400 font-medium">
                    +{formatCurrency(c.tax)}
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-white">
                    {formatCurrency(c.realCost)}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-200">
                    {c.results}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-200">
                    {formatCurrency(c.metaCpa)}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-200">
                    {formatPercent(c.ctr)}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-200">
                    {formatCurrency(c.cpc)}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.linkStatus === "auto"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : c.linkStatus === "manual"
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "bg-rose-500/15 text-rose-400 animate-pulse"
                      }`}
                    >
                      {c.linkStatus === "auto"
                        ? "Auto"
                        : c.linkStatus === "manual"
                        ? "Manual"
                        : "Sem Código"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Link Modal */}
      {selectedCampaignForLink && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              Vincular Campanha a um Produto
            </h3>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 block mb-0.5">Campanha selecionada:</span>
              <strong className="text-white block">{selectedCampaignForLink.name}</strong>
              <span className="text-[11px] text-amber-400 mt-1 block">
                Investimento atual: {formatCurrency(selectedCampaignForLink.spend)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Selecione o Produto Destino:
              </label>
              <select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Escolha um produto cadastrado...</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} [{p.productCode}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedCampaignForLink(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleLinkCampaign}
                disabled={!targetProductId}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded transition-all cursor-pointer"
              >
                Confirmar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
