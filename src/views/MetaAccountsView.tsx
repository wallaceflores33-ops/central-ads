import React, { useEffect, useState } from "react";
import { formatCurrency, formatNumber } from "../lib/utils.ts";
import { 
  Layers, 
  DollarSign, 
  BarChart2, 
  ShieldCheck, 
  ChevronRight, 
  RefreshCw, 
  Trash2, 
  Building2, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Radio,
  ExternalLink
} from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";

interface MetaAccountsViewProps {
  onNavigate: (view: NavView) => void;
}

export const MetaAccountsView: React.FC<MetaAccountsViewProps> = ({ onNavigate }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBmFilter, setSelectedBmFilter] = useState<string>("all");
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal de confirmação para desconexão
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    accountId: string;
    accountName: string;
  }>({
    isOpen: false,
    accountId: "",
    accountName: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = () => {
    setLoading(true);
    fetch("/api/meta-accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar contas Meta:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAccount = async (accountId: string, accountName: string) => {
    setSyncingAccountId(accountId);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/meta-accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({
          type: "success",
          message: `Conta "${accountName}" sincronizada com sucesso! (${data.campaignsCount} campanhas atualizadas).`
        });
        setTimeout(() => setActionFeedback(null), 4000);
        fetchAccounts();
      } else {
        setActionFeedback({
          type: "error",
          message: data.error || `Erro ao sincronizar conta "${accountName}".`
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: `Falha na requisição: ${err.message}`
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleOpenDeleteModal = (acc: any) => {
    setConfirmModal({
      isOpen: true,
      accountId: acc.id,
      accountName: acc.accountName || acc.name || acc.id
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.accountId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meta-accounts/${confirmModal.accountId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: "success",
          message: `Conta "${confirmModal.accountName}" desconectada com sucesso. Histórico financeiro preservado.`
        });
        setTimeout(() => setActionFeedback(null), 4000);
        setConfirmModal({ isOpen: false, accountId: "", accountName: "" });
        fetchAccounts();
      } else {
        alert(data.error || "Erro ao desconectar conta.");
      }
    } catch (err: any) {
      alert("Erro ao desconectar conta: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract unique BMs for the filter
  const uniqueBms = Array.from(
    new Set(accounts.map((a) => a.bmName || "Sem BM Identificada").filter(Boolean))
  );

  const filteredAccounts = selectedBmFilter === "all"
    ? accounts
    : accounts.filter((a) => (a.bmName || "Sem BM Identificada") === selectedBmFilter);

  const totalSpend = filteredAccounts.reduce((acc, a) => acc + (a.spend || 0), 0);
  const totalCampaigns = filteredAccounts.reduce((acc, a) => acc + (a.totalCampaigns || 0), 0);
  const activeCampaigns = filteredAccounts.reduce((acc, a) => acc + (a.activeCampaigns || 0), 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Carregando contas de anúncios...</span>
        </div>
      </div>
    );
  }

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
            Gerencie e monitore individualmente as contas de anúncio agrupadas por Business Manager (BM).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#0b0f1a] border border-slate-800 text-xs text-slate-300">
            Investimento: <strong className="text-white ml-1">{formatCurrency(totalSpend)}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0b0f1a] border border-slate-800 text-xs text-slate-300">
            Campanhas: <strong className="text-indigo-400 ml-1">{activeCampaigns}</strong> / {totalCampaigns}
          </div>
          <button
            onClick={() => onNavigate("settings")}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Gerenciar BMs</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-lg text-xs border flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            actionFeedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs hover:underline cursor-pointer opacity-70 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Filter by BM */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">Filtrar por Business Manager:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedBmFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedBmFilter === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Todas as BMs ({accounts.length})
          </button>

          {uniqueBms.map((bm) => {
            const count = accounts.filter((a) => (a.bmName || "Sem BM Identificada") === bm).length;
            return (
              <button
                key={bm}
                onClick={() => setSelectedBmFilter(bm)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedBmFilter === bm
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>{bm}</span>
                <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-[#0b0f1a] space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhuma conta de anúncios encontrada</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {selectedBmFilter !== "all"
              ? `Nenhuma conta associada ao Business Manager "${selectedBmFilter}".`
              : "Conecte seus Business Managers ou insira o Token de Acesso da Meta na Central de Integrações para sincronizar."}
          </p>
          <button
            onClick={() => onNavigate("settings")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Ir para Configurações</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((acc) => {
            const isSyncing = syncingAccountId === acc.id;
            const displayName = acc.accountName || acc.name || acc.id;
            const bmOrigin = acc.bmName || "Conta Direta";
            const isActive = acc.status === "active" || acc.accountStatus === 1 || acc.accountStatus === "ACTIVE";

            return (
              <div
                key={acc.id}
                className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm truncate max-w-[200px]" title={displayName}>
                          {displayName}
                        </h3>
                      </div>
                      
                      {/* BM de Origem */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-400" />
                          <span>BM: {bmOrigin}</span>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isActive ? "Ativa" : "Pausada"}
                    </span>
                  </div>

                  {/* Account ID & Sync Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                    <span className="font-mono text-slate-300">ID: {acc.id}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Não sincronizada"}</span>
                    </span>
                  </div>

                  {/* Metrics Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Investimento Total
                      </span>
                      <strong className="text-base text-white font-bold tracking-tight">
                        {formatCurrency(acc.spend || 0)}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Campanhas
                      </span>
                      <strong className="text-base text-slate-200 font-bold tracking-tight">
                        {acc.activeCampaigns || 0}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          / {acc.totalCampaigns || 0}
                        </span>
                      </strong>
                    </div>
                  </div>

                  {/* Product Distribution Breakdown (if any) */}
                  {acc.productDistribution && acc.productDistribution.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Rateio por Produto:
                      </span>
                      <div className="space-y-1.5">
                        {acc.productDistribution.slice(0, 3).map((dist: any, idx: number) => {
                          const pct = acc.spend > 0 ? (dist.spend / acc.spend) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs text-slate-300">
                                <span className="truncate max-w-[170px] text-[11px]">{dist.productName}</span>
                                <span className="font-medium text-slate-200 text-[11px]">{formatCurrency(dist.spend)}</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800/60">
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
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Botão Sincronizar Conta Individualmente */}
                    <button
                      disabled={isSyncing}
                      onClick={() => handleSyncAccount(acc.id, displayName)}
                      className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                      title="Sincronizar métricas e campanhas desta conta"
                    >
                      <RefreshCw className={`w-3 h-3 text-indigo-400 ${isSyncing ? "animate-spin" : ""}`} />
                      <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
                    </button>

                    {/* Botão Desconectar Conta */}
                    <button
                      onClick={() => handleOpenDeleteModal(acc)}
                      className="p-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/30 transition-colors cursor-pointer"
                      title="Desconectar conta de anúncios do sistema"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigate("campaigns")}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <span>Campanhas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação para Desconectar Conta de Anúncios */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Tem certeza que deseja excluir/desconectar?"
        itemName={confirmModal.accountName}
        description="Esta conta de anúncios será removida do sistema e suas campanhas serão desvinculadas. O histórico financeiro e de vendas já registrado no dashboard será preservado integralmente."
        confirmLabel="Excluir Conta"
        cancelLabel="Cancelar"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, accountId: "", accountName: "" })}
      />
    </div>
  );
};
