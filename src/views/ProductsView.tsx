import React, { useState } from "react";
import { ProductMetricSummary, Product } from "../types/index.ts";
import { 
  formatCurrency, 
  formatNumber, 
  formatPercent, 
  getHealthBadge 
} from "../lib/utils.ts";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  ExternalLink,
  Tag,
  Target,
  FileText
} from "lucide-react";

interface ProductsViewProps {
  products: ProductMetricSummary[];
  onSelectProduct: (productId: string) => void;
  onCreateProduct: (productData: any) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onSelectProduct,
  onCreateProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New product form state
  const [newProdName, setNewProdName] = useState("");
  const [newProdCode, setNewProdCode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Cursos Online");
  const [newCaktoIds, setNewCaktoIds] = useState("");
  const [newCaktoOffers, setNewCaktoOffers] = useState("");
  const [newBumps, setNewBumps] = useState("");
  const [newCpaIdeal, setNewCpaIdeal] = useState("12.00");
  const [newCpaMax, setNewCpaMax] = useState("18.00");
  const [newRoasIdeal, setNewRoasIdeal] = useState("2.50");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdCode) return;

    onCreateProduct({
      name: newProdName,
      internalCode: newProdCode.toUpperCase().trim(),
      campaignCode: newProdCode.toUpperCase().trim(),
      category: newProdCategory,
      status: "active",
      caktoProductIds: newCaktoIds.split(",").map((s) => s.trim()).filter(Boolean),
      caktoProductName: newProdName,
      relatedOffers: newCaktoOffers.split(",").map((s) => s.trim()).filter(Boolean),
      orderBumpNames: newBumps.split(",").map((s) => s.trim()).filter(Boolean),
      targets: {
        targetCpaIdeal: parseFloat(newCpaIdeal) || 12,
        targetCpaAcceptable: parseFloat(newCpaIdeal) * 1.25 || 15,
        targetCpaMax: parseFloat(newCpaMax) || 18,
        targetRoasMin: 1.6,
        targetRoasIdeal: parseFloat(newRoasIdeal) || 2.5,
        targetMarginMin: 35,
        minSpendForAnalysis: 150,
        minSalesForAnalysis: 10,
        primaryWindowDays: 7,
      },
    });

    setIsCreateModalOpen(false);
    // Reset form
    setNewProdName("");
    setNewProdCode("");
    setNewCaktoIds("");
    setNewCaktoOffers("");
    setNewBumps("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Produtos Cadastrados
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie seus produtos, códigos de identificação de campanha e metas de CPA/ROAS.
          </p>
        </div>

        <button
          id="btn-open-create-product"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f1a] border border-slate-800 p-2.5 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou código (ex: FOTO01, PLANNER)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium pr-1">
          Exibindo <strong>{filteredProducts.length}</strong> produtos
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Produto</th>
                <th className="py-2.5 px-3">Código Campanha</th>
                <th className="py-2.5 px-3 text-right">Invest. Real</th>
                <th className="py-2.5 px-3 text-right">Vendas Cakto</th>
                <th className="py-2.5 px-3 text-right">Faturamento</th>
                <th className="py-2.5 px-3 text-right">CPA Real</th>
                <th className="py-2.5 px-3 text-right">ROAS Real</th>
                <th className="py-2.5 px-3 text-right">Resultado</th>
                <th className="py-2.5 px-3 text-right">Margem</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredProducts.map((p) => {
                const health = getHealthBadge(p.healthScore);
                return (
                  <tr
                    key={p.productId}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectProduct(p.productId)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {p.productName}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.activeCampaignCount} campanhas vinculadas
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-[11px] font-bold">
                        [{p.productCode}]
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-200">
                      {formatCurrency(p.realCost)}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatNumber(p.approvedSales)}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatCurrency(p.effectiveRevenue)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-white">
                        {formatCurrency(p.realCpa)}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          p.realRoas >= 2.0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.realRoas >= 1.5
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {p.realRoas.toFixed(2)}x
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-bold">
                      <span className={p.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {p.profit >= 0 ? "+" : ""}
                        {formatCurrency(p.profit)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-300">
                      {formatPercent(p.margin)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${health.dotClass}`} />
                        {p.healthScore}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(p.productId);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 group-hover:text-white transition-all mx-auto cursor-pointer"
                      >
                        <span>Abrir Ficha</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastrar Produto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Cadastrar Novo Produto</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vincule os códigos de anúncio e IDs Cakto para cálculo automático
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Curso de Fotografia Mobile"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código de Campanha Meta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FOTO01 (sem colchetes)"
                    value={newProdCode}
                    onChange={(e) => setNewProdCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Campanhas no Meta com <strong>[{newProdCode || "CODIGO"}]</strong> serão associadas automaticamente.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IDs do Produto na Cakto (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: cakto_prod_01, cakto_prod_01_upsell"
                    value={newCaktoIds}
                    onChange={(e) => setNewCaktoIds(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomes de Order Bumps (separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pack Presets 2026, Manual de Edição"
                  value={newBumps}
                  onChange={(e) => setNewBumps(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  Metas para a Inteligência Artificial
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">CPA Ideal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCpaIdeal}
                      onChange={(e) => setNewCpaIdeal(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">CPA Máximo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCpaMax}
                      onChange={(e) => setNewCpaMax(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">ROAS Ideal (x)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRoasIdeal}
                      onChange={(e) => setNewRoasIdeal(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
