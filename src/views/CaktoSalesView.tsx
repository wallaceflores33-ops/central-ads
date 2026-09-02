import React, { useEffect, useState } from "react";
import { CaktoTransaction, ProductMetricSummary } from "../types/index.ts";
import { formatCurrency, formatDate } from "../lib/utils.ts";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Layers, 
  PlusCircle, 
  DollarSign,
  CreditCard,
  QrCode,
  Zap
} from "lucide-react";

interface CaktoSalesViewProps {
  products: ProductMetricSummary[];
  onRefresh: () => void;
}

export const CaktoSalesView: React.FC<CaktoSalesViewProps> = ({ products, onRefresh }) => {
  const [sales, setSales] = useState<CaktoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedTxDetail, setSelectedTxDetail] = useState<CaktoTransaction | null>(null);

  // Webhook Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simProduct, setSimProduct] = useState(products[0]?.productId || "");
  const [simPrice, setSimPrice] = useState("97.00");
  const [simHasBump, setSimHasBump] = useState(true);
  const [simBumpPrice, setSimBumpPrice] = useState("47.00");
  const [simStatus, setSimStatus] = useState("purchase_approved");
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const loadSales = () => {
    setLoading(true);
    fetch("/api/cakto-sales")
      .then((res) => res.json())
      .then((data) => {
        setSales(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleRunSimulator = async () => {
    setSimLoading(true);
    setSimMessage(null);
    try {
      const res = await fetch("/api/simulate/cakto-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: simStatus,
          productId: simProduct,
          basePrice: parseFloat(simPrice) || 97,
          hasBump: simHasBump,
          bumpPrice: parseFloat(simBumpPrice) || 47,
          bumpName: "Pack Bônus Especial Cakto",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimMessage(`Webhook processado com sucesso! ID: ${data.result?.transactionId}`);
        loadSales();
        onRefresh();
      } else {
        setSimMessage(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setSimMessage(`Erro ao chamar webhook: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  // Compute breakdown metrics
  const approvedTx = sales.filter((s) => s.status === "approved");
  const totalApprovedRevenue = approvedTx.reduce((acc, s) => acc + s.grossAmount, 0);
  const totalNetRevenue = approvedTx.reduce((acc, s) => acc + s.netAmount, 0);

  let mainProductRev = 0;
  let bumpRev = 0;
  let bumpOrdersCount = 0;

  for (const s of approvedTx) {
    let hasBump = false;
    for (const item of s.items) {
      if (item.itemType === "order_bump") {
        bumpRev += item.grossAmount;
        hasBump = true;
      } else {
        mainProductRev += item.grossAmount;
      }
    }
    if (hasBump) bumpOrdersCount++;
  }

  const bumpTakeRate = approvedTx.length > 0 ? (bumpOrdersCount / approvedTx.length) * 100 : 0;

  const filteredSales = sales.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (methodFilter !== "all" && s.paymentMethod !== methodFilter) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (
        s.transactionId.toLowerCase().includes(t) ||
        s.productName.toLowerCase().includes(t) ||
        (s.buyerName && s.buyerName.toLowerCase().includes(t)) ||
        (s.buyerEmail && s.buyerEmail.toLowerCase().includes(t))
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
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            Vendas e Transações Cakto
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados reais recebidos via webhook: pedidos, faturamento e order bumps sem ruído de atribuição.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulador de Webhook Cakto</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Pedidos Aprovados
          </span>
          <strong className="text-xl font-bold text-white tracking-tight">
            {approvedTx.length}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-1">
            Total bruto: {formatCurrency(totalApprovedRevenue)}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Receita Produto Principal
          </span>
          <strong className="text-xl font-bold text-white tracking-tight">
            {formatCurrency(mainProductRev)}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-1">Itens principais</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Receita Order Bumps
          </span>
          <strong className="text-xl font-bold text-indigo-400 tracking-tight">
            {formatCurrency(bumpRev)}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-1">
            {bumpOrdersCount} pedidos com bump
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-indigo-900/20 p-4 ring-1 ring-indigo-500/30">
          <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold block mb-1">
            Take-Rate Bumps
          </span>
          <strong className="text-xl font-bold text-indigo-400 tracking-tight">
            {bumpTakeRate.toFixed(1).replace(".", ",")}%
          </strong>
          <span className="text-[10px] text-slate-400 block mt-1">% conversão do bump</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Receita Líquida Cakto
          </span>
          <strong className="text-xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(totalNetRevenue)}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-1">Após taxas da plataforma</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0b0f1a] border border-slate-800 p-2.5 rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, produto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos os status</option>
            <option value="approved">Aprovada</option>
            <option value="refunded">Reembolsada</option>
            <option value="chargedback">Chargeback</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas formas pagto</option>
            <option value="pix">Pix</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="boleto">Boleto</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Transação / Pedido</th>
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3">Composição</th>
                <th className="py-2.5 px-3">Pagamento</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                <th className="py-2.5 px-3 text-right">Valor Líquido</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredSales.map((t) => {
                const hasBump = t.items.some((i) => i.itemType === "order_bump");
                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{t.transactionId}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Order: {t.orderId}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{t.productName}</div>
                      <div className="text-[10px] text-slate-400">{t.offerName}</div>
                    </td>

                    <td className="py-3 px-3">
                      {hasBump ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                          <PlusCircle className="w-3 h-3" />
                          Com Order Bump
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Item Principal</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300 uppercase text-[11px]">
                      {t.paymentMethod}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : t.status === "refunded"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {t.status === "approved" ? "Aprovada" : t.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatCurrency(t.grossAmount)}
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-emerald-400">
                      {formatCurrency(t.netAmount)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedTxDetail(t)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] cursor-pointer"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Composição do Pedido Cakto
              </h3>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Transação:</span>
                <span className="font-mono font-bold text-white">{selectedTxDetail.transactionId}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Cliente:</span>
                <span>{selectedTxDetail.buyerName || "Cliente"} ({selectedTxDetail.buyerEmail})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedTxDetail.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Itens Adquiridos:
              </span>
              <div className="space-y-1.5">
                {selectedTxDetail.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="font-semibold text-white block">{it.productName}</span>
                      <span className="text-[10px] text-slate-400">
                        {it.itemType === "order_bump" ? "Order Bump Adicional" : "Produto Principal"}
                      </span>
                    </div>
                    <strong className="text-indigo-400 font-bold">{formatCurrency(it.grossAmount)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
              <span className="text-slate-400">Total Pago:</span>
              <strong className="text-white text-base">{formatCurrency(selectedTxDetail.paidAmount)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Webhook Simulator Modal */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Simulador Interativo de Webhook Cakto
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dispare um payload real para testar o processamento, idempotência e cálculo de ROAS.
                </p>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {simMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                {simMessage}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Produto Destino
                </label>
                <select
                  value={simProduct}
                  onChange={(e) => setSimProduct(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} [{p.productCode}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor do Produto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={simPrice}
                    onChange={(e) => setSimPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Evento
                  </label>
                  <select
                    value={simStatus}
                    onChange={(e) => setSimStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="purchase_approved">purchase_approved (Venda Aprovada)</option>
                    <option value="refund">refund (Reembolso)</option>
                    <option value="chargeback">chargeback (Chargeback)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simHasBump}
                    onChange={(e) => setSimHasBump(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Incluir Order Bump neste pedido</span>
                </label>
                {simHasBump && (
                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Valor do Order Bump (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={simBumpPrice}
                      onChange={(e) => setSimBumpPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={handleRunSimulator}
                disabled={simLoading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded transition-all shadow-sm cursor-pointer"
              >
                {simLoading ? "Enviando..." : "Disparar Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
