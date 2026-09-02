import React, { useEffect, useState } from "react";
import { Product, FinancialSummary, Campaign, AIActionItem } from "../types/index.ts";
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  getCategoryBadge 
} from "../lib/utils.ts";
import { 
  ArrowLeft, 
  Target, 
  ShoppingBag, 
  Layers, 
  Sparkles, 
  DollarSign, 
  Percent, 
  Tag, 
  Receipt,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Trash2
} from "lucide-react";
import { NavView } from "../components/Sidebar.tsx";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";

interface ProductDetailViewProps {
  productId: string;
  onBack: () => void;
  onNavigate: (view: NavView) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId,
  onBack,
  onNavigate,
}) => {
  const [data, setData] = useState<{
    product: Product;
    summary: FinancialSummary;
    campaigns: Campaign[];
    bumpTakeRate: number;
    orderBumpCount: number;
    totalSalesCount: number;
    aiInsight?: AIActionItem;
    taxRule?: any;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProduct = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        onBack();
      }
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar produto:", err);
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando dossiê do produto...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.product) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400 text-sm">Produto não encontrado.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
        >
          Voltar para Produtos
        </button>
      </div>
    );
  }

  const { product, summary, campaigns, bumpTakeRate, orderBumpCount, totalSalesCount, aiInsight } = data;

  // Cakto composition estimation
  const bumpRevenue = orderBumpCount * 47.0; // average bump
  const mainRevenue = Math.max(0, summary.effectiveRevenue - bumpRevenue);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{product.name}</h1>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-xs font-bold">
                [{product.campaignCode}]
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 uppercase">
                {product.status === "active" ? "Ativo em Tráfego" : product.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Categoria: {product.category} • {campaigns.length} campanhas ativas no Meta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Cakto IDs: <strong className="text-slate-200 font-mono">{product.caktoProductIds.join(", ")}</strong>
          </span>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            title="Excluir produto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Produto</span>
          </button>
        </div>
      </div>

      {/* 1. Consolidated Financial Metrics Cards */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          Consolidação Financeira do Produto
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Investimento Real
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {formatCurrency(summary.realCost)}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Meta: {formatCurrency(summary.metaSpend)} + {formatCurrency(summary.metaTaxes)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Faturamento Cakto
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {formatCurrency(summary.effectiveRevenue)}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              {summary.approvedSales} vendas aprovadas
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              CPA Real
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {formatCurrency(summary.realCpa)}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Meta Máx: {formatCurrency(product.targets.targetCpaMax)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              ROAS Real
            </div>
            <div className="mt-1 text-xl font-bold text-indigo-400 tracking-tight">
              {summary.realRoas.toFixed(2)}x
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Meta Ideal: {product.targets.targetRoasIdeal.toFixed(2)}x
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-indigo-900/20 p-4 ring-1 ring-indigo-500/30">
            <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">
              Resultado Líquido
            </div>
            <div className={`mt-1 text-xl font-bold tracking-tight ${summary.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {summary.profit >= 0 ? "+" : ""}{formatCurrency(summary.profit)}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Receita - Custo Real
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Margem Real
            </div>
            <div className="mt-1 text-xl font-bold text-white tracking-tight">
              {formatPercent(summary.margin)}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Meta Mín: {formatPercent(product.targets.targetMarginMin)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Order Bumps & Metas Box (Side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Bumps Composition */}
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              Composição de Vendas e Order Bumps
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Take-Rate: {formatPercent(bumpTakeRate)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5 font-semibold">Produto Principal</span>
              <strong className="text-base text-white">{formatCurrency(mainRevenue)}</strong>
              <div className="text-[10px] text-slate-400 mt-1">{totalSalesCount} pedidos</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5 font-semibold">Order Bumps</span>
              <strong className="text-base text-indigo-400">{formatCurrency(bumpRevenue)}</strong>
              <div className="text-[10px] text-slate-400 mt-1">{orderBumpCount} bumps aceitos</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 pt-1">
            <strong className="text-slate-300">Bumps Vinculados:</strong>{" "}
            {product.orderBumpNames && product.orderBumpNames.length > 0
              ? product.orderBumpNames.join(", ")
              : "Nenhum order bump configurado"}
          </div>
        </div>

        {/* Targets Box */}
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Metas de Performance do Produto
            </h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Parâmetros IA</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">CPA Ideal</span>
              <strong className="text-emerald-400 text-sm">
                {formatCurrency(product.targets.targetCpaIdeal)}
              </strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">CPA Aceitável</span>
              <strong className="text-amber-400 text-sm">
                {formatCurrency(product.targets.targetCpaAcceptable)}
              </strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">CPA Máximo</span>
              <strong className="text-rose-400 text-sm">
                {formatCurrency(product.targets.targetCpaMax)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">ROAS Ideal:</span>
              <strong className="text-indigo-400">{product.targets.targetRoasIdeal.toFixed(2)}x</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Gasto Mín. Análise:</span>
              <strong className="text-slate-200">{formatCurrency(product.targets.minSpendForAnalysis)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Diagnosis Box if available */}
      {aiInsight && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Diagnóstico Atual da IA para {product.name}
          </div>
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white">{aiInsight.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{aiInsight.diagnosis}</p>
            <div className="p-2.5 rounded bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300">
              <strong>Ação Sugerida:</strong> {aiInsight.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* 4. Linked Campaigns Table */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Campanhas Vinculadas no Meta Ads
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Campanhas associadas pelo código de identificação <strong>[{product.campaignCode}]</strong>
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {campaigns.length} campanhas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Campanha</th>
                <th className="py-2.5 px-3">Conta</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Gasto Meta</th>
                <th className="py-2.5 px-3 text-right">+Taxas</th>
                <th className="py-2.5 px-3 text-right">Custo Real</th>
                <th className="py-2.5 px-3 text-right">Vendas Meta</th>
                <th className="py-2.5 px-3 text-right">CPA Meta</th>
                <th className="py-2.5 px-3 text-right">CTR</th>
                <th className="py-2.5 px-3 text-right">CPC</th>
                <th className="py-2.5 px-3 text-right">CPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {campaigns.map((c) => {
                const tax = Math.round(c.spend * 0.1 * 100) / 100;
                const realCost = c.spend + tax;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{c.campaignName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.id}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{c.accountName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-200">
                      {formatCurrency(c.spend)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400">
                      +{formatCurrency(tax)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatCurrency(realCost)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {c.results}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {formatCurrency(c.costPerResult)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {formatPercent(c.ctr)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {formatCurrency(c.cpc)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      {formatCurrency(c.cpm)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Produto */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Tem certeza que deseja excluir este produto?"
        itemName={product ? `${product.name} [${product.campaignCode}]` : undefined}
        description="O produto será removido e desvinculado de suas campanhas do Meta Ads. Todas as transações da Cakto e históricos consolidados continuarão preservados no sistema."
        confirmLabel="Excluir Produto"
        cancelLabel="Cancelar"
        isProcessing={isDeleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
