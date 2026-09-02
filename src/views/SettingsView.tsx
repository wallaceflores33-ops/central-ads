import React, { useEffect, useState } from "react";
import { MetaTaxRule, GlobalSettings, IntegrationStatus, AppMode } from "../types/index.ts";
import { 
  Settings, 
  Layers, 
  Receipt, 
  ShoppingBag, 
  Sparkles, 
  DollarSign, 
  Database, 
  Plus, 
  Check, 
  Copy, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Key,
  Radio,
  Server
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"mode" | "meta" | "cakto" | "supabase" | "taxes" | "ai" | "financial">("mode");
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [taxRules, setTaxRules] = useState<MetaTaxRule[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Meta connection form
  const [metaToken, setMetaToken] = useState("");
  const [isTestingMeta, setIsTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);

  // Supabase connection form
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Tax Rule Form
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("10.0");
  const [newTaxStartDate, setNewTaxStartDate] = useState("2026-01-01");
  const [newTaxEndDate, setNewTaxEndDate] = useState("2026-12-31");

  // Supabase DDL state
  const [ddlSql, setDdlSql] = useState<string>("");
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.globalSettings);
        setTaxRules(data.taxRules || []);
        setIntegrationStatus(data.integrationStatus || null);
        if (data.globalSettings) {
          setMetaToken(data.globalSettings.metaAccessToken || "");
          setSupabaseUrl(data.globalSettings.supabaseUrl || "");
          setSupabaseKey(data.globalSettings.supabaseAnonKey || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSettings();
    fetch("/api/supabase/ddl")
      .then((res) => res.text())
      .then((sql) => setDdlSql(sql))
      .catch((err) => console.error(err));
  }, []);

  const handleModeSwitch = async (newMode: AppMode) => {
    try {
      const res = await fetch("/api/settings/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        setSaveSuccessMsg(`Modo alterado com sucesso para ${newMode === 'production' ? 'PRODUÇÃO (DADOS REAIS)' : 'DEMONSTRAÇÃO'}`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        loadSettings();
      }
    } catch (err: any) {
      alert("Erro ao alterar modo: " + err.message);
    }
  };

  const handleSaveMetaConfig = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaAccessToken: metaToken }),
      });
      if (res.ok) {
        setSaveSuccessMsg("Credenciais da Meta salvas com sucesso!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        loadSettings();
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const handleTestMetaConnection = async () => {
    setIsTestingMeta(true);
    setMetaTestResult(null);
    try {
      const res = await fetch("/api/meta/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: metaToken }),
      });
      const data = await res.json();
      if (data.success) {
        setMetaTestResult({
          success: true,
          message: `Conexão bem-sucedida! Usuário Meta: ${data.name || 'OK'} (ID: ${data.id})`
        });
      } else {
        setMetaTestResult({
          success: false,
          message: data.error || "Token inválido ou expirado da Meta Marketing API."
        });
      }
    } catch (err: any) {
      setMetaTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingMeta(false);
    }
  };

  const handleSyncMetaNow = async () => {
    setIsSyncingMeta(true);
    try {
      const res = await fetch("/api/sync/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: metaToken }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`Sincronização concluída! ${data.accountsCount} conta(s) e ${data.campaignsCount} campanha(s) reais importadas.`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        loadSettings();
      } else {
        alert("Erro na sincronização Meta: " + (data.error || "Verifique o token de acesso."));
      }
    } catch (err: any) {
      alert("Erro de conexão: " + err.message);
    } finally {
      setIsSyncingMeta(false);
    }
  };

  const handleSaveSupabaseConfig = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseAnonKey: supabaseKey,
          supabaseConfigured: Boolean(supabaseUrl && supabaseKey)
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg("Configurações do Supabase salvas!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        loadSettings();
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const res = await fetch("/api/supabase/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supabaseUrl, key: supabaseKey }),
      });
      const data = await res.json();
      if (data.success) {
        setSupabaseTestResult({ success: true, message: "Conexão com Supabase estabelecida com sucesso!" });
      } else {
        setSupabaseTestResult({ success: false, message: data.error || "Falha ao conectar no Supabase." });
      }
    } catch (err: any) {
      setSupabaseTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleCreateTaxRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName) return;

    try {
      const res = await fetch("/api/tax-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTaxName,
          rate: parseFloat(newTaxRate) || 10,
          type: "percentage",
          startDate: newTaxStartDate,
          endDate: newTaxEndDate,
          enabled: true,
        }),
      });

      if (res.ok) {
        setIsNewTaxModalOpen(false);
        setNewTaxName("");
        loadSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/cakto` : "/api/webhooks/cakto";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Configurações &amp; Integrações Reais
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Conecte APIs reais, configure webhooks, gerencie banco Supabase e regras financeiras da Central Ads.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: "mode", label: "Modo de Operação", icon: SlidersHorizontal },
          { id: "meta", label: "Meta Marketing API", icon: Layers },
          { id: "cakto", label: "Cakto Webhook", icon: ShoppingBag },
          { id: "supabase", label: "Banco Supabase (SQL)", icon: Database },
          { id: "taxes", label: "Impostos & Taxas Meta", icon: Receipt },
          { id: "ai", label: "Inteligência Artificial", icon: Sparkles },
          { id: "financial", label: "Regras Financeiras", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0b0f1a] text-indigo-400 border-t-2 border-indigo-500 border-x border-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 0. Modo de Operação (Mandatory Rule for Distinction) */}
      {activeTab === "mode" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              Modo da Aplicação (Produção vs Demonstração)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Conforme as diretrizes da Central Ads, dados fictícios NUNCA se misturam com dados reais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Produção Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              settings?.appMode === 'production'
                ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Modo Produção (Recomendado)
                  </span>
                  {settings?.appMode === 'production' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Ativo Agora
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trabalha exclusivamente com dados reais recebidos da Meta Marketing API, Webhooks da Cakto ou cadastrados manualmente por você. Sem dados inventados ou simulações.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  disabled={settings?.appMode === 'production'}
                  onClick={() => handleModeSwitch('production')}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {settings?.appMode === 'production' ? 'Ativo em Produção' : 'Ativar Modo Produção'}
                </button>
              </div>
            </div>

            {/* Demonstração Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
              settings?.appMode === 'demo'
                ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Modo Demonstração (Teste de UI)
                  </span>
                  {settings?.appMode === 'demo' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Ativo Agora
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Carrega um dataset isolado de exemplo para demonstração das telas e gráficos. Não afeta nem substitui seu banco de dados real.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  disabled={settings?.appMode === 'demo'}
                  onClick={() => handleModeSwitch('demo')}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {settings?.appMode === 'demo' ? 'Ativo em Demonstração' : 'Ativar Modo Demonstração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 1. Meta Ads Real API Config */}
      {activeTab === "meta" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Conexão com Meta Marketing API
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Utilize um Token de Acesso de Sistema (System User Token) com permissões <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">ads_read</code> e <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">read_insights</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                integrationStatus?.meta?.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${integrationStatus?.meta?.connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span>{integrationStatus?.meta?.connected ? 'Conectado à Meta' : '🔴 Não conectado'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Token de Acesso da Meta Marketing API (User ou System Token)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  placeholder="EAA..."
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={handleSaveMetaConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer shrink-0"
                >
                  Salvar Token
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Dica: O token também pode ser injetado via variável de ambiente <code className="text-slate-400">META_ACCESS_TOKEN</code>.
              </p>
            </div>

            {/* Test & Sync Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                disabled={isTestingMeta}
                onClick={handleTestMetaConnection}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTestingMeta ? "Testando..." : "Testar Token na Meta API"}</span>
              </button>

              <button
                disabled={isSyncingMeta}
                onClick={handleSyncMetaNow}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeta ? 'animate-spin' : ''}`} />
                <span>{isSyncingMeta ? "Sincronizando..." : "Sincronizar Campanhas Agora"}</span>
              </button>
            </div>

            {metaTestResult && (
              <div className={`p-3 rounded-md text-xs border ${
                metaTestResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {metaTestResult.message}
              </div>
            )}

            {/* Live Meta Accounts Discovered */}
            <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-white block mb-1">Status Operacional</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300 mt-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Contas Encontradas</span>
                  <span className="font-bold text-white text-sm">{integrationStatus?.meta?.accountsCount ?? 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Campanhas Importadas</span>
                  <span className="font-bold text-white text-sm">{integrationStatus?.meta?.campaignsCount ?? 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Última Sincronização</span>
                  <span className="font-medium text-slate-400">{integrationStatus?.meta?.lastSyncAt || 'Nunca'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Origem dos Dados</span>
                  <span className="font-medium text-indigo-400">Meta Graph API v20.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. Cakto Webhook Config */}
      {activeTab === "cakto" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                Webhook Real da Cakto
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Receba compras aprovadas, boletos pagos, Pix e order bumps instantaneamente.
              </p>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              integrationStatus?.cakto?.connected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${integrationStatus?.cakto?.connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>{integrationStatus?.cakto?.connected ? 'Cakto Ativa' : '🔴 Sem Eventos Ainda'}</span>
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL de Endpoint de Webhook (Copie e cole no painel Cakto)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-indigo-400 font-mono select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? "Copiado!" : "Copiar URL"}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2 text-xs">
              <strong className="text-white block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Mecanismos de Segurança e Rastreabilidade Ativos:
              </strong>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li><strong className="text-slate-300">Idempotência:</strong> Chave única por transação + evento previne contabilidade duplicada em caso de retentativas da Cakto.</li>
                <li><strong className="text-slate-300">Detecção de Order Bumps:</strong> Itens adicionais da mesma compra são contabilizados e somados ao produto principal correspondente.</li>
                <li><strong className="text-slate-300">Transações Registradas:</strong> {integrationStatus?.cakto?.transactionsCount ?? 0} transações salvas.</li>
                <li><strong className="text-slate-300">Último Evento:</strong> {integrationStatus?.cakto?.lastEventAt || 'Aguardando primeiro payload real'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. Supabase Integration & DDL */}
      {activeTab === "supabase" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                Banco de Dados Supabase (PostgreSQL)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Armazene produtos, campanhas reais, transações da Cakto e logs de auditoria com Row Level Security.
              </p>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              integrationStatus?.supabase?.connected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700/40 text-slate-300 border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${integrationStatus?.supabase?.connected ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              <span>{integrationStatus?.supabase?.connected ? 'Supabase Conectado' : 'Local / Opcional'}</span>
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  SUPABASE_URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  SUPABASE_ANON_KEY / SERVICE_ROLE_KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOi..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleSaveSupabaseConfig}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Salvar Credenciais
              </button>
              <button
                disabled={isTestingSupabase}
                onClick={handleTestSupabaseConnection}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTestingSupabase ? "Testando..." : "Testar Conexão Supabase"}</span>
              </button>
            </div>

            {supabaseTestResult && (
              <div className={`p-3 rounded-md text-xs border ${
                supabaseTestResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {supabaseTestResult.message}
              </div>
            )}

            {/* SQL DDL Box */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">Script SQL de Criação de Tabelas (DDL)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ddlSql);
                    setCopiedDdl(true);
                    setTimeout(() => setCopiedDdl(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedDdl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDdl ? "Copiado!" : "Copiar SQL"}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={7}
                value={ddlSql}
                className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 font-mono text-[11px] text-indigo-300 select-all focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. Impostos e Taxas Meta */}
      {activeTab === "taxes" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Histórico de Regras de Impostos e Taxas Meta Ads
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                A alíquota é aplicada sobre o gasto real do Meta Ads com base na data da veiculação.
              </p>
            </div>

            <button
              onClick={() => setIsNewTaxModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Regra de Imposto</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Nome da Regra</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Taxa / Alíquota</th>
                  <th className="py-2.5 px-3">Início Vigência</th>
                  <th className="py-2.5 px-3">Fim Vigência</th>
                  <th className="py-2.5 px-3">País</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {taxRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white">{rule.name}</td>
                    <td className="py-2.5 px-3 text-slate-300 capitalize">{rule.type}</td>
                    <td className="py-2.5 px-3 text-indigo-400 font-bold text-xs">
                      {rule.rate.toFixed(1).replace(".", ",")}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{rule.startDate}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{rule.endDate}</td>
                    <td className="py-2.5 px-3 text-slate-300">{rule.country}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        {rule.enabled ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New Rule Modal */}
          {isNewTaxModalOpen && (
            <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
                <h3 className="font-bold text-white text-base">Nova Alíquota de Imposto Meta</h3>
                <form onSubmit={handleCreateTaxRule} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome da Regra
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Reforma Tributária / IOF 2026"
                      value={newTaxName}
                      onChange={(e) => setNewTaxName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Alíquota (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newTaxRate}
                      onChange={(e) => setNewTaxRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        required
                        value={newTaxStartDate}
                        onChange={(e) => setNewTaxStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        required
                        value={newTaxEndDate}
                        onChange={(e) => setNewTaxEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsNewTaxModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded cursor-pointer"
                    >
                      Salvar Regra
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. Inteligência Artificial */}
      {activeTab === "ai" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Parâmetros do Motor de Inteligência Artificial
          </h3>
          <p className="text-xs text-slate-400">
            A IA da Central Ads analisa rigorosamente os números reais consolidados e nunca inventa diagnósticos de saturação sem dados concretos.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-white text-xs block">Modelo Ativo</strong>
                <span className="text-[11px] text-slate-400">Google Gemini 3.8 Flash (Server-Side)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Ativo
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-white text-xs block">Regra de Cautela Absoluta</strong>
                <span className="text-[11px] text-slate-400">Quando os dados forem insuficientes, declarar expressamente em vez de inventar conclusões.</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">Habilitada</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. Regras Financeiras */}
      {activeTab === "financial" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            Fórmulas e Bases de Cálculo
          </h3>
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
            <div>
              <span className="font-semibold text-white block">Custo Real:</span>
              <p className="text-slate-400 text-[11px]">Investimento Total Meta + Alíquota de Impostos do Período.</p>
            </div>
            <div>
              <span className="font-semibold text-white block">CPA Real:</span>
              <p className="text-slate-400 text-[11px]">Custo Real Total ÷ Vendas Aprovadas da Cakto.</p>
            </div>
            <div>
              <span className="font-semibold text-white block">ROAS Real:</span>
              <p className="text-slate-400 text-[11px]">Faturamento Cakto (Bruto ou Líquido conforme toggle) ÷ Custo Real Total.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
