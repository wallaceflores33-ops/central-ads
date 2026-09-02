import React, { useState } from "react";
import { AIDailySummary, AIActionItem, ProductMetricSummary } from "../types/index.ts";
import { formatCurrency, formatPercent } from "../lib/utils.ts";
import { 
  Sparkles, 
  Brain, 
  ShieldCheck, 
  Send, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  RefreshCw, 
  FileText,
  Lock
} from "lucide-react";

interface AIIntelligenceViewProps {
  dailySummary: AIDailySummary | null;
  actionItems: AIActionItem[];
  products: ProductMetricSummary[];
  onRefreshAnalysis: () => void;
  isLoading?: boolean;
}

export const AIIntelligenceView: React.FC<AIIntelligenceViewProps> = ({
  dailySummary,
  actionItems,
  products,
  onRefreshAnalysis,
  isLoading = false,
}) => {
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string; time: string }>>([
    {
      role: "ai",
      text: "Olá! Sou o motor analítico da Central Ads. Cruzo o investimento real do Meta Ads (com impostos) com as vendas líquidas da Cakto. Como posso orientar sua estratégia de escala hoje?",
      time: "Agora",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { role: "user", text: userText, time: nowTime }]);
    setInputMessage("");
    setChatLoading(true);

    // Context-aware intelligent strategic response respecting all user principles
    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();

      if (products.length === 0) {
        reply = "No momento não há produtos cadastrados ou dados de tráfego ativos para analisar. Cadastre seus produtos e integre a Meta e a Cakto para que eu possa orientar sua escala com base exclusivamente em números reais.";
      } else if (lower.includes("escala") || lower.includes("aumentar") || lower.includes("orçamento")) {
        const bestProd = [...products].sort((a, b) => b.realRoas - a.realRoas)[0];
        if (bestProd && bestProd.realCost > 0) {
          reply = `Para escala segura, nossa regra fundamental é nunca subir orçamentos acima de 15% a 20% ao dia para não reiniciar a fase de aprendizado. No momento, o produto com maior oportunidade é o "${bestProd.productName}" com ROAS Real de ${bestProd.realRoas.toFixed(2)}x e CPA de ${formatCurrency(bestProd.realCpa)}. Recomendo aumentar o CBO gradualmente em 15% e monitorar a estabilidade do CTR nas próximas 48h.`;
        } else {
          reply = `Não existem dados suficientes de investimento e conversão para validar uma escala segura neste momento. Aguarde pelo menos 3 a 7 dias de dados reais antes de aumentar orçamentos.`;
        }
      } else if (lower.includes("pausar") || lower.includes("cortar") || lower.includes("ruim")) {
        const worstProd = [...products].sort((a, b) => b.realCpa - a.realCpa)[0];
        if (worstProd && worstProd.realCost > 0) {
          reply = `Atenção à regra de amostragem mínima: antes de pausar qualquer campanha, certifique-se de que o gasto atingiu pelo menos 2x o CPA Máximo e que o produto como um todo não está vendendo na Cakto. O produto com métricas mais pressionadas hoje é o "${worstProd.productName}" (CPA ${formatCurrency(worstProd.realCpa)}). Verifique se não houve aumento súbito de CPM ou fadiga de criativo antes de pausar.`;
        } else {
          reply = `Não existem dados suficientes para confirmar necessidade de pausa ou saturação de anúncios.`;
        }
      } else if (lower.includes("order bump") || lower.includes("bump")) {
        reply = `A análise de Order Bumps na Cakto mostra que ofertas complementares aumentam substancialmente o ticket médio. Isso eleva diretamente seu break-even CPA no Meta Ads, permitindo pagar mais no leilão sem perder margem líquida.`;
      } else {
        reply = `Com base nos dados consolidados das suas contas Meta Ads e vendas Cakto, você possui ${products.length} produto(s) monitorado(s). Toda análise é calculada com base no custo real com impostos e faturamento auditado.`;
      }

      setChatMessages((prev) => [...prev, { role: "ai", text: reply, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }]);
      setChatLoading(false);
    }, 900);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Inteligência Artificial — Central Ads
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnóstico analítico avançado calibrado com regras estritas de media buying e análise de dados.
          </p>
        </div>

        <button
          onClick={onRefreshAnalysis}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Processando..." : "Executar Nova Análise"}</span>
        </button>
      </div>

      {/* Strict Guidelines Box */}
      <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Pilares de Decisão e Regras de Proteção da IA
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 space-y-1">
            <span className="font-bold text-white block">1. Cautela e Amostragem Mínima</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              A IA nunca recomenda mudanças precipitadas baseadas em poucas horas. Toda decisão exige validação de volume de gasto e amostra mínima de conversões.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 space-y-1">
            <span className="font-bold text-white block">2. Visão Holística do Produto</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              O que define a saúde é o Custo Real Meta (com impostos) cruzado com o Faturamento Cakto. O ruído de atribuição do pixel é desconsiderado.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Sem Ações Automáticas</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              A IA nunca altera orçamentos ou pausa anúncios diretamente. Toda recomendação é orientativa para avaliação humana do gestor.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: AI Daily Summary + Strategic Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Summary & Diagnoses */}
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              Síntese Executiva Gerada pela IA
            </h3>

            {dailySummary ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                  {dailySummary.summaryText}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">ROAS Médio Operação</span>
                    <strong className="text-emerald-400 text-base font-bold">{dailySummary.totalRoas.toFixed(2)}x</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">CPA Médio Cakto</span>
                    <strong className="text-white text-base font-bold">{formatCurrency(dailySummary.averageCpa)}</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Ações Prioritárias em Aberto:
                  </span>
                  <div className="space-y-1.5">
                    {actionItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-2"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">{item.title}</strong>
                          <span className="text-slate-400 text-[11px]">{item.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum resumo diário gerado ainda.
              </div>
            )}
          </div>
        </div>

        {/* Right: Strategic Decision Assistant Chat */}
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Assistente Estratégico de Tráfego</h3>
            </div>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">Gemini 3.8</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Analisando dados da operação...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Ex: Devo aumentar o orçamento de Fotografia? Ou pausar o Planner?"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
