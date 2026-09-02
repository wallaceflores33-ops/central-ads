import React, { useEffect, useState } from "react";
import { MetaTaxRule, GlobalSettings, IntegrationStatus, AppMode, MetaBusinessManager } from "../types/index.ts";
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
  Server,
  Building2,
  Boxes,
  Package,
  ListOrdered,
  Clock,
  FileText,
  Trash2,
  Edit3,
  PlusCircle,
  Link2,
  Unlink,
  Eye,
  EyeOff
} from "lucide-react";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";

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
  const [metaDiagnostics, setMetaDiagnostics] = useState<any>(null);

  // Multi-BM Management State
  const [bmsList, setBmsList] = useState<MetaBusinessManager[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Reusable Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName?: string;
    description?: string;
    confirmLabel?: string;
    isProcessing?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // BM Modal state
  const [isBmModalOpen, setIsBmModalOpen] = useState(false);
  const [editingBm, setEditingBm] = useState<MetaBusinessManager | null>(null);
  const [bmFormName, setBmFormName] = useState("");
  const [bmFormId, setBmFormId] = useState("");
  const [bmFormToken, setBmFormToken] = useState("");
  const [bmFormAppId, setBmFormAppId] = useState("");
  const [bmFormAppSecret, setBmFormAppSecret] = useState("");
  const [showBmModalToken, setShowBmModalToken] = useState(false);
  const [showBmModalSecret, setShowBmModalSecret] = useState(false);
  const [bmFormActive, setBmFormActive] = useState(true);
  const [isSavingBm, setIsSavingBm] = useState(false);
  const [isTestingBmModal, setIsTestingBmModal] = useState(false);
  const [bmModalTestFeedback, setBmModalTestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testingBmId, setTestingBmId] = useState<string | null>(null);
  const [syncingBmId, setSyncingBmId] = useState<string | null>(null);
  const [bmActionFeedback, setBmActionFeedback] = useState<{ bmId: string; type: 'success' | 'error'; message: string } | null>(null);

  // Cakto connection form
  const [caktoToken, setCaktoToken] = useState("");
  const [caktoClientId, setCaktoClientId] = useState("");
  const [caktoClientSecret, setCaktoClientSecret] = useState("");
  const [caktoWebhookSecret, setCaktoWebhookSecret] = useState("");
  const [isTestingCakto, setIsTestingCakto] = useState(false);
  const [caktoTestResult, setCaktoTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingCakto, setIsSyncingCakto] = useState(false);
  const [caktoDiagnostics, setCaktoDiagnostics] = useState<any>(null);

  // Cakto Webhook Management states
  const [customWebhookUrl, setCustomWebhookUrl] = useState("");
  const [isInstallingWebhook, setIsInstallingWebhook] = useState(false);
  const [webhookInstallResult, setWebhookInstallResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingWebhookPipe, setIsTestingWebhookPipe] = useState(false);
  const [webhookPipeResult, setWebhookPipeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [remoteWebhooks, setRemoteWebhooks] = useState<any[] | null>(null);
  const [isLoadingRemoteWebhooks, setIsLoadingRemoteWebhooks] = useState(false);
  const [showRemoteWebhooksModal, setShowRemoteWebhooksModal] = useState(false);

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
          setCaktoToken(data.globalSettings.caktoApiToken || "");
          setCaktoClientId(data.globalSettings.caktoClientId || "");
          setCaktoClientSecret(data.globalSettings.caktoClientSecret || "");
          setCaktoWebhookSecret(data.globalSettings.caktoWebhookSecret || "");
          setSupabaseUrl(data.globalSettings.supabaseUrl || "");
          setSupabaseKey(data.globalSettings.supabaseAnonKey || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Also fetch diagnostic data
    fetch("/api/meta/diagnostics")
      .then((res) => res.json())
      .then((data) => setMetaDiagnostics(data))
      .catch((err) => console.error(err));

    fetch("/api/meta/bms")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBmsList(data);
      })
      .catch((err) => console.error(err));

    fetch("/api/meta-accounts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMetaAccounts(data);
      })
      .catch((err) => console.error(err));

    fetch("/api/cakto/diagnostics")
      .then((res) => res.json())
      .then((data) => setCaktoDiagnostics(data))
      .catch((err) => console.error(err));
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

  // --- Multi-BM Management Handlers ---
  const handleOpenAddBm = () => {
    setEditingBm(null);
    setBmFormName("");
    setBmFormId("");
    setBmFormToken("");
    setBmFormAppId("");
    setBmFormAppSecret("");
    setShowBmModalToken(false);
    setShowBmModalSecret(false);
    setBmFormActive(true);
    setBmActionFeedback(null);
    setBmModalTestFeedback(null);
    setIsBmModalOpen(true);
  };

  const handleOpenEditBm = (bm: MetaBusinessManager) => {
    setEditingBm(bm);
    setBmFormName(bm.name);
    setBmFormId(bm.metaBmId || bm.id.replace(/^bm_/, ''));
    setBmFormToken(bm.accessToken || "");
    setBmFormAppId("");
    setBmFormAppSecret("");
    setShowBmModalToken(false);
    setShowBmModalSecret(false);
    setBmFormActive(bm.isActive !== false);
    setBmActionFeedback(null);
    setBmModalTestFeedback(null);
    setIsBmModalOpen(true);
  };

  const handleTestBmModal = async () => {
    const tokenToTest = bmFormToken.trim() || metaToken;
    if (!tokenToTest) {
      setBmModalTestFeedback({
        success: false,
        message: "Por favor, informe um Token de Acesso da Meta para testar a conexão."
      });
      return;
    }

    setIsTestingBmModal(true);
    setBmModalTestFeedback(null);
    try {
      const res = await fetch("/api/meta/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tokenToTest }),
      });
      const data = await res.json();
      if (data.success) {
        setBmModalTestFeedback({
          success: true,
          message: `Conexão validada com sucesso! ${data.accountsCount || 0} conta(s) acessível(is) via Meta Graph API.`
        });
      } else {
        setBmModalTestFeedback({
          success: false,
          message: data.error || "Token inválido ou sem permissões de leitura (ads_read)."
        });
      }
    } catch (err: any) {
      setBmModalTestFeedback({
        success: false,
        message: "Erro ao testar conexão: " + err.message
      });
    } finally {
      setIsTestingBmModal(false);
    }
  };

  const handleSaveBm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = bmFormId.trim().replace(/^bm_/, '');
    if (!cleanId) {
      alert("Por favor, informe o ID do Business Manager da Meta.");
      return;
    }

    setIsSavingBm(true);
    try {
      if (editingBm) {
        // Update existing BM
        const res = await fetch(`/api/meta/bms/${editingBm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: bmFormName.trim() || `BM ${cleanId}`,
            metaBmId: cleanId,
            accessToken: bmFormToken.trim() || undefined,
            isActive: bmFormActive
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Falha ao atualizar BM");
        }
      } else {
        // Create new BM
        const res = await fetch("/api/meta/bms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: bmFormName.trim() || `BM ${cleanId}`,
            metaBmId: cleanId,
            accessToken: bmFormToken.trim() || undefined,
            isActive: bmFormActive
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Falha ao adicionar BM");
        }
      }

      setIsBmModalOpen(false);
      setSaveSuccessMsg(editingBm ? "Business Manager atualizado com sucesso!" : "Novo Business Manager adicionado com sucesso!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      loadSettings();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar Business Manager.");
    } finally {
      setIsSavingBm(false);
    }
  };

  const handleDeleteBm = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Tem certeza que deseja excluir esta conexão?",
      itemName: `${name} (ID: ${id})`,
      description: "Esta conexão e seu token serão removidos. As contas de anúncio associadas serão desvinculadas. O histórico financeiro e relatórios já consolidados continuarão preservados no dashboard.",
      confirmLabel: "Excluir Conexão",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/meta/bms/${id}`, { method: "DELETE" });
          if (res.ok) {
            setSaveSuccessMsg(`Conexão "${name}" excluída com sucesso.`);
            setTimeout(() => setSaveSuccessMsg(null), 3500);
            loadSettings();
          } else {
            const data = await res.json();
            alert(data.error || "Erro ao excluir BM.");
          }
        } catch (err: any) {
          alert("Erro ao excluir BM: " + err.message);
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleSyncSingleAccount = async (accountId: string, accountName?: string) => {
    setSyncingAccountId(accountId);
    try {
      const res = await fetch(`/api/meta-accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`Conta "${accountName || accountId}" sincronizada com sucesso! (${data.campaignsCount ?? 0} campanhas atualizadas)`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        loadSettings();
      } else {
        alert(data.error || "Erro ao sincronizar conta.");
      }
    } catch (err: any) {
      alert("Erro ao sincronizar conta: " + err.message);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDeleteAdAccount = (acc: any) => {
    const accName = acc.name || acc.accountName || acc.id;
    setConfirmModal({
      isOpen: true,
      title: "Tem certeza que deseja desconectar esta conta?",
      itemName: `${accName} (ID: ${acc.id})`,
      description: "A conta de anúncios será removida do sistema e suas campanhas serão desvinculadas. O histórico financeiro permanecerá registrado.",
      confirmLabel: "Desconectar Conta",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/meta-accounts/${acc.id}`, { method: "DELETE" });
          if (res.ok) {
            setSaveSuccessMsg(`Conta "${accName}" desconectada.`);
            setTimeout(() => setSaveSuccessMsg(null), 3500);
            loadSettings();
          } else {
            const data = await res.json();
            alert(data.error || "Erro ao desconectar conta.");
          }
        } catch (err: any) {
          alert("Erro ao desconectar conta: " + err.message);
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeleteCaktoWebhook = () => {
    setConfirmModal({
      isOpen: true,
      title: "Tem certeza que deseja excluir o webhook da Cakto?",
      itemName: "Endpoint de Webhook da Cakto",
      description: "O endpoint do webhook será desconectado e o registro redefinido. Todas as transações financeiras anteriores registradas continuarão intactas no sistema.",
      confirmLabel: "Excluir Webhook",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/cakto/webhook", { method: "DELETE" });
          if (res.ok) {
            setSaveSuccessMsg("Webhook da Cakto excluído com sucesso.");
            setTimeout(() => setSaveSuccessMsg(null), 3500);
            loadSettings();
          } else {
            const data = await res.json();
            alert(data.error || "Erro ao excluir webhook.");
          }
        } catch (err: any) {
          alert("Erro ao excluir webhook: " + err.message);
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleTestBm = async (bm: MetaBusinessManager) => {
    setTestingBmId(bm.id);
    setBmActionFeedback(null);
    try {
      const res = await fetch(`/api/meta/bms/${bm.id}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBmActionFeedback({
          bmId: bm.id,
          type: 'success',
          message: `Conexão validada com sucesso! BM: "${data.business?.name || bm.name}" (Status: ${data.business?.verification_status || 'Ativo'}).`
        });
      } else {
        setBmActionFeedback({
          bmId: bm.id,
          type: 'error',
          message: data.error || "Falha ao conectar com esta BM."
        });
      }
      loadSettings();
    } catch (err: any) {
      setBmActionFeedback({
        bmId: bm.id,
        type: 'error',
        message: err.message
      });
    } finally {
      setTestingBmId(null);
    }
  };

  const handleSyncBm = async (bm: MetaBusinessManager) => {
    setSyncingBmId(bm.id);
    setBmActionFeedback(null);
    try {
      const res = await fetch(`/api/meta/bms/${bm.id}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBmActionFeedback({
          bmId: bm.id,
          type: 'success',
          message: `Sincronização concluída! ${data.accountsCount} conta(s) e ${data.campaignsCount} campanha(s) importadas.`
        });
      } else {
        setBmActionFeedback({
          bmId: bm.id,
          type: 'error',
          message: data.error || "Falha ao sincronizar esta BM."
        });
      }
      loadSettings();
    } catch (err: any) {
      setBmActionFeedback({
        bmId: bm.id,
        type: 'error',
        message: err.message
      });
    } finally {
      setSyncingBmId(null);
    }
  };

  const handleToggleBmActive = async (bm: MetaBusinessManager) => {
    const nextState = !(bm.isActive !== false);
    try {
      await fetch(`/api/meta/bms/${bm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState })
      });
      loadSettings();
    } catch (err: any) {
      alert("Erro ao alterar status: " + err.message);
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

  const handleSaveCaktoConfig = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caktoApiToken: caktoToken,
          caktoClientId,
          caktoClientSecret,
          caktoWebhookSecret
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg("Credenciais da Cakto salvas com sucesso!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        loadSettings();
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const handleTestCaktoConnection = async () => {
    setIsTestingCakto(true);
    setCaktoTestResult(null);
    try {
      const res = await fetch("/api/cakto/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: caktoToken,
          clientId: caktoClientId,
          clientSecret: caktoClientSecret
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCaktoTestResult({
          success: true,
          message: `Conexão bem-sucedida! Cakto API conectada (${data.productsCount || 0} produtos encontrados).`
        });
      } else {
        setCaktoTestResult({
          success: false,
          message: data.error || "Falha na autenticação com a API Cakto. Verifique o token ou credenciais."
        });
      }
    } catch (err: any) {
      setCaktoTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingCakto(false);
    }
  };

  const handleSyncCaktoNow = async () => {
    setIsSyncingCakto(true);
    try {
      const res = await fetch("/api/sync/cakto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: {
            apiToken: caktoToken,
            clientId: caktoClientId,
            clientSecret: caktoClientSecret
          }
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`Catálogo Cakto sincronizado! ${data.productsCount} produto(s) e ${data.offersCount} oferta(s) importadas.`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        loadSettings();
      } else {
        alert("Erro na sincronização Cakto: " + (data.error || "Verifique as credenciais da API."));
      }
    } catch (err: any) {
      alert("Erro de conexão: " + err.message);
    } finally {
      setIsSyncingCakto(false);
    }
  };

  const handleInstallWebhookAuto = async (targetUrl: string) => {
    if (!targetUrl) {
      alert("Por favor, informe a URL do Webhook.");
      return;
    }
    setIsInstallingWebhook(true);
    setWebhookInstallResult(null);
    try {
      const res = await fetch("/api/cakto/install-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: targetUrl,
          apiToken: caktoToken,
          clientId: caktoClientId,
          clientSecret: caktoClientSecret
        })
      });
      const data = await res.json();
      if (data.success) {
        setWebhookInstallResult({
          success: true,
          message: data.message || "Webhook instalado com sucesso na sua conta Cakto!"
        });
        loadSettings();
      } else {
        setWebhookInstallResult({
          success: false,
          message: data.error || "Não foi possível registrar o webhook via API da Cakto. Verifique se o Token da API Cakto foi salvo."
        });
      }
    } catch (err: any) {
      setWebhookInstallResult({
        success: false,
        message: `Falha ao tentar instalar webhook: ${err.message}`
      });
    } finally {
      setIsInstallingWebhook(false);
    }
  };

  const handleTestWebhookPipeline = async () => {
    setIsTestingWebhookPipe(true);
    setWebhookPipeResult(null);
    try {
      const res = await fetch("/api/cakto/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setWebhookPipeResult({
          success: true,
          message: "Evento de teste recebido com sucesso! O webhook está respondendo com HTTP 200 OK e as transações estão ativas."
        });
        loadSettings();
      } else {
        setWebhookPipeResult({
          success: false,
          message: data.error || "Falha ao processar teste de webhook."
        });
      }
    } catch (err: any) {
      setWebhookPipeResult({
        success: false,
        message: `Erro no disparo do teste: ${err.message}`
      });
    } finally {
      setIsTestingWebhookPipe(false);
    }
  };

  const handleListRemoteWebhooks = async () => {
    setIsLoadingRemoteWebhooks(true);
    try {
      const res = await fetch("/api/cakto/remote-webhooks");
      const data = await res.json();
      if (data.success && Array.isArray(data.webhooks)) {
        setRemoteWebhooks(data.webhooks);
        setShowRemoteWebhooksModal(true);
      } else {
        alert(data.error || "Não foi possível listar os webhooks da Cakto. Certifique-se de que o Token da API está configurado.");
      }
    } catch (err: any) {
      alert("Erro ao buscar webhooks da Cakto: " + err.message);
    } finally {
      setIsLoadingRemoteWebhooks(false);
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

      {/* TAB CONTENT: 1. Meta Ads Real API Config & Diagnostics */}
      {activeTab === "meta" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Conexão com Meta Marketing API &amp; Diagnóstico
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hierarquia completa: Business Managers &rarr; Contas de Anúncios &rarr; Campanhas &rarr; Métricas Diárias.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                integrationStatus?.meta?.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${integrationStatus?.meta?.connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span>{integrationStatus?.meta?.connected ? '🟢 API Meta Conectada' : '🔴 Não Conectado'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Token de Acesso da Meta Marketing API (System User ou Graph Token)
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
                Permissões necessárias: <code className="text-slate-400">ads_read</code> e <code className="text-slate-400">read_insights</code>. Também configurável via <code className="text-slate-400">META_ACCESS_TOKEN</code> no ambiente.
              </p>
            </div>

            {/* Test & Sync Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                disabled={isTestingMeta}
                onClick={handleTestMetaConnection}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTestingMeta ? "Testando Token..." : "Testar Conexão Meta"}</span>
              </button>

              <button
                disabled={isSyncingMeta}
                onClick={handleSyncMetaNow}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeta ? 'animate-spin' : ''}`} />
                <span>{isSyncingMeta ? "Sincronizando..." : "Sincronizar Meta Ads Agora"}</span>
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

            {/* DIAGNOSTIC INSPECTION SCREEN FOR META */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Diagnóstico Detalhado da Integração Meta Ads
              </h4>

              {/* Status KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Status da API</span>
                  <span className={`font-bold text-sm flex items-center gap-1 mt-0.5 ${integrationStatus?.meta?.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${integrationStatus?.meta?.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {integrationStatus?.meta?.connected ? 'Conectada' : 'Desconectada'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Usuário Autenticado</span>
                  <span className="font-bold text-white text-xs truncate block mt-0.5">
                    {integrationStatus?.meta?.user?.name || (integrationStatus?.meta?.connected ? 'Usuário Conectado' : 'Sem dados')}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Última Sincronização</span>
                  <span className="font-medium text-slate-300 text-xs block mt-0.5">
                    {integrationStatus?.meta?.lastSyncAt ? new Date(integrationStatus.meta.lastSyncAt).toLocaleString('pt-BR') : 'Sem dados'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Métricas Diárias</span>
                  <span className="font-bold text-indigo-400 text-sm block mt-0.5">
                    {metaDiagnostics?.dailyMetricsCount ?? 0} registros
                  </span>
                </div>
              </div>

              {/* Erro Meta (se houver) */}
              {integrationStatus?.meta?.error && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-200">Último erro retornado pela Meta API:</strong>
                    <p className="mt-0.5 font-mono text-[11px]">{integrationStatus.meta.error}</p>
                  </div>
                </div>
              )}

              {/* Business Managers (BMs) Multi-Account Management */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">
                        Conexões de API &amp; Business Managers (BMs)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {bmsList.length} cadastrada(s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Conecte múltiplas APIs e BMs da Meta com credenciais e tokens independentes para consolidar todas as suas contas.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddBm}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Conectar nova API</span>
                  </button>
                </div>

                {bmActionFeedback && (
                  <div className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                    bmActionFeedback.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}>
                    {bmActionFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">{bmActionFeedback.message}</span>
                    <button
                      onClick={() => setBmActionFeedback(null)}
                      className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {bmsList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {bmsList.map((bm) => {
                      const bmCleanId = (bm.metaBmId || bm.id).replace(/^bm_/, '');
                      const bmAccounts = metaAccounts.filter(
                        (acc) => acc.businessId === bmCleanId || acc.businessId === bm.id || acc.businessId === bm.metaBmId
                      );

                      return (
                        <div
                          key={bm.id}
                          className={`p-4 rounded-xl border transition-all ${
                            bm.isActive !== false
                              ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                              : 'bg-slate-950/40 border-slate-800/50 opacity-75'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm">{bm.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                ID: {bm.metaBmId || bm.id}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                bm.isActive === false
                                  ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                                  : bm.lastError
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {bm.isActive === false ? '○ Pausada' : bm.lastError ? '🔴 Erro na Conexão' : '🟢 Conectada'}
                              </span>
                              <button
                                onClick={() => handleToggleBmActive(bm)}
                                className="text-[10px] text-slate-400 hover:text-indigo-300 underline cursor-pointer ml-1"
                                title="Ativar ou desativar esta conexão"
                              >
                                {bm.isActive !== false ? 'Pausar' : 'Ativar'}
                              </button>
                            </div>

                            {/* Action Buttons for BM */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                disabled={testingBmId === bm.id}
                                onClick={() => handleTestBm(bm)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-medium rounded-md border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Testar acesso da Meta nesta conexão"
                              >
                                <Key className="w-3 h-3 text-indigo-400" />
                                <span>{testingBmId === bm.id ? "Testando..." : "Testar Conexão"}</span>
                              </button>

                              <button
                                disabled={syncingBmId === bm.id}
                                onClick={() => handleSyncBm(bm)}
                                className="px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Sincronizar contas e campanhas desta BM"
                              >
                                <RefreshCw className={`w-3 h-3 ${syncingBmId === bm.id ? 'animate-spin' : ''}`} />
                                <span>{syncingBmId === bm.id ? "Sincronizando..." : "Sincronizar BM"}</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditBm(bm)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors cursor-pointer"
                                title="Editar configurações da conexão"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteBm(bm.id, bm.name)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-md border border-rose-800/40 transition-colors cursor-pointer"
                                title="Excluir conexão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* BM Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 pb-2 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block">Token de Acesso</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {bm.accessToken ? (
                                  <>
                                    <Link2 className="w-3 h-3 text-indigo-400 shrink-0" />
                                    <span className="font-mono text-indigo-300 text-[11px]">
                                      {showTokens[bm.id] ? bm.accessToken : `••••${bm.accessToken.slice(-4)}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowTokens(prev => ({ ...prev, [bm.id]: !prev[bm.id] }))}
                                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-0.5"
                                      title={showTokens[bm.id] ? "Ocultar token" : "Exibir token"}
                                    >
                                      {showTokens[bm.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <Unlink className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="text-slate-400 text-[11px] font-mono">
                                      {metaToken ? (showTokens['global'] ? metaToken : `••••${metaToken.slice(-4)} (Global)`) : 'Não configurado'}
                                    </span>
                                    {metaToken && (
                                      <button
                                        type="button"
                                        onClick={() => setShowTokens(prev => ({ ...prev, global: !prev['global'] }))}
                                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-0.5"
                                        title={showTokens['global'] ? "Ocultar token" : "Exibir token"}
                                      >
                                        {showTokens['global'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block">Contas de Anúncios</span>
                              <span className="font-bold text-white text-[11px] block mt-0.5">
                                {bmAccounts.length || (bm.adAccountsCount ?? 0)} conta(s)
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block">Campanhas Ativas</span>
                              <span className="font-bold text-indigo-400 text-[11px] block mt-0.5">
                                {bm.campaignsCount ?? 0} campanha(s)
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block">Última Sincronização</span>
                              <span className="font-medium text-slate-400 text-[11px] block mt-0.5">
                                {bm.lastSyncAt ? new Date(bm.lastSyncAt).toLocaleString('pt-BR') : 'Sem dados'}
                              </span>
                            </div>
                          </div>

                          {/* BM Last Error */}
                          {bm.lastError && (
                            <div className="mt-2 p-2 bg-rose-950/40 border border-rose-500/30 rounded text-[11px] text-rose-300 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="font-mono break-all">{bm.lastError}</span>
                            </div>
                          )}

                          {/* Nested Ad Accounts List for this BM */}
                          <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                                Contas de Anúncio Desta Conexão ({bmAccounts.length})
                              </span>
                            </div>

                            {bmAccounts.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2">
                                {bmAccounts.map((acc) => (
                                  <div
                                    key={acc.id}
                                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-white truncate">
                                          {acc.name || acc.accountName || acc.id}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                          ID: {acc.id}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                          acc.status === 'active' || acc.status === 'ACTIVE'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                          {acc.status === 'active' || acc.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-1">
                                        <span>Campanhas: <strong className="text-slate-200">{acc.activeCampaigns ?? 0} ativas</strong> / {acc.totalCampaigns ?? 0} total</span>
                                        <span>Gasto: <strong className="text-emerald-400">R$ {(acc.spend ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                                        <span>Sync: <span className="text-slate-300">{acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</span></span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                                      <button
                                        disabled={syncingAccountId === acc.id}
                                        onClick={() => handleSyncSingleAccount(acc.id, acc.name || acc.accountName)}
                                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-medium rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Sincronizar esta conta individualmente"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${syncingAccountId === acc.id ? 'animate-spin' : ''}`} />
                                        <span>{syncingAccountId === acc.id ? "Sincronizando..." : "Sincronizar Conta"}</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAdAccount(acc)}
                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                        title="Desconectar conta de anúncios"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 text-center">
                                <span className="text-[11px] text-slate-500">
                                  Nenhuma conta de anúncios associada a este BM no momento. Clique em <strong>"Sincronizar BM"</strong> acima para importar as contas e campanhas da Meta.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">
                      Nenhuma conexão de API ou BM configurada ainda
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Você pode conectar quantas BMs e APIs quiser clicando no botão abaixo com tokens independentes.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={handleOpenAddBm}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Conectar nova API</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contas Diretas / Token Global (se houver contas não vinculadas às BMs cadastradas) */}
              {(() => {
                const directAccounts = metaAccounts.filter((acc) => {
                  const bIds = bmsList.map((b) => (b.metaBmId || b.id).replace(/^bm_/, ''));
                  return !bIds.includes(acc.businessId);
                });

                if (directAccounts.length === 0 && (!metaDiagnostics?.accounts || metaDiagnostics.accounts.length === 0)) {
                  return null;
                }

                const listToRender = directAccounts.length > 0 ? directAccounts : (metaDiagnostics?.accounts || []);

                return (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                          Contas Diretas / Token Global ({listToRender.length})
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Contas importadas diretamente via Token Global da Meta Marketing API.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {listToRender.map((acc: any) => (
                        <div
                          key={acc.id}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white truncate">
                                {acc.name || acc.accountName || acc.id}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                ID: {acc.id}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                acc.status === 'active' || acc.status === 'ACTIVE' || acc.accountStatus === 1
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {acc.status === 'active' || acc.status === 'ACTIVE' || acc.accountStatus === 1 ? 'Ativa' : 'Pausada'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-1">
                              <span>Campanhas: <strong className="text-slate-200">{acc.activeCampaigns ?? acc.campaignsCount ?? 0} ativas</strong> / {acc.totalCampaigns ?? acc.campaignsCount ?? 0} total</span>
                              <span>Gasto: <strong className="text-emerald-400">R$ {(acc.spend ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                              <span>Sync: <span className="text-slate-300">{acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                            <button
                              disabled={syncingAccountId === acc.id}
                              onClick={() => handleSyncSingleAccount(acc.id, acc.name || acc.accountName)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-medium rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Sincronizar esta conta individualmente"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncingAccountId === acc.id ? 'animate-spin' : ''}`} />
                              <span>{syncingAccountId === acc.id ? "Sincronizando..." : "Sincronizar"}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAdAccount(acc)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title="Desconectar conta de anúncios"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. Cakto API REST & Webhook Config & Diagnostics */}
      {activeTab === "cakto" && (
        <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                Integração Cakto: Catálogo Automático &amp; Webhooks Reais
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Importação contínua de produtos e ofertas da Cakto e recepção de vendas em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                integrationStatus?.cakto?.connected || integrationStatus?.cakto?.apiConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${integrationStatus?.cakto?.connected || integrationStatus?.cakto?.apiConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span>
                  {integrationStatus?.cakto?.connected || integrationStatus?.cakto?.apiConnected 
                    ? '🟢 Cakto Conectada' 
                    : '🔴 Aguardando Conexão'}
                </span>
              </span>
            </div>
          </div>

          {/* PARTE A: API REST DA CAKTO (Catálogo de Produtos e Ofertas) */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                1. API REST da Cakto (Sincronização de Produtos &amp; Ofertas)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                A API da Cakto importa automaticamente seus produtos e ofertas com paginação completa para matching financeiro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Token da API Cakto (Bearer Token / Chave de API)
                </label>
                <input
                  type="password"
                  placeholder="cakto_token_..."
                  value={caktoToken}
                  onChange={(e) => setCaktoToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client ID (Opcional se usar Token direto)
                </label>
                <input
                  type="text"
                  placeholder="client_id_cakto"
                  value={caktoClientId}
                  onChange={(e) => setCaktoClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleSaveCaktoConfig}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Salvar Credenciais
              </button>

              <button
                disabled={isTestingCakto}
                onClick={handleTestCaktoConnection}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTestingCakto ? "Testando API..." : "Testar Conexão Cakto"}</span>
              </button>

              <button
                disabled={isSyncingCakto}
                onClick={handleSyncCaktoNow}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCakto ? 'animate-spin' : ''}`} />
                <span>{isSyncingCakto ? "Importando Catálogo..." : "Importar Catálogo Cakto Agora"}</span>
              </button>
            </div>

            {caktoTestResult && (
              <div className={`p-3 rounded-md text-xs border ${
                caktoTestResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {caktoTestResult.message}
              </div>
            )}

            {/* Diagnóstico do Catálogo Cakto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Status da API REST</span>
                <span className={`font-bold text-xs flex items-center gap-1 mt-0.5 ${integrationStatus?.cakto?.apiConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${integrationStatus?.cakto?.apiConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  {integrationStatus?.cakto?.apiConnected ? 'Conectada' : 'Não configurada'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Produtos no Catálogo</span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {caktoDiagnostics?.catalogProductsCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Ofertas Cadastradas</span>
                <span className="font-bold text-white text-sm block mt-0.5">
                  {caktoDiagnostics?.catalogOffersCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Último Sync do Catálogo</span>
                <span className="font-medium text-slate-300 text-xs block mt-0.5">
                  {integrationStatus?.cakto?.catalogLastSyncAt ? new Date(integrationStatus.cakto.catalogLastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
                </span>
              </div>
            </div>

            {integrationStatus?.cakto?.error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-200">Último erro retornado pela Cakto API:</strong>
                  <p className="mt-0.5 font-mono text-[11px]">{integrationStatus.cakto.error}</p>
                </div>
              </div>
            )}
          </div>

          {/* PARTE B: WEBHOOK DA CAKTO (Vendas & Transações em Tempo Real) */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  2. Webhook Oficial da Cakto (Vendas &amp; Transações em Tempo Real)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receba compras aprovadas, boletos gerados, Pix pagos, reembolsos e order bumps instantaneamente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleListRemoteWebhooks}
                  disabled={isLoadingRemoteWebhooks}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-md border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ListOrdered className={`w-3.5 h-3.5 ${isLoadingRemoteWebhooks ? 'animate-spin' : 'text-indigo-400'}`} />
                  <span>{isLoadingRemoteWebhooks ? "Buscando..." : "Webhooks na Cakto"}</span>
                </button>
              </div>
            </div>

            {/* Status Simples da Conexão e Verificação */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Status da Conexão:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border flex items-center gap-1.5 ${
                  integrationStatus?.cakto?.webhookActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${integrationStatus?.cakto?.webhookActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{integrationStatus?.cakto?.webhookActive ? '🟢 Conectado' : '🟡 Aguardando Venda'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Status da Verificação:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border flex items-center gap-1.5 ${
                  integrationStatus?.cakto?.webhookActive || webhookPipeResult?.success
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{integrationStatus?.cakto?.webhookActive || webhookPipeResult?.success ? '🟢 Verificado (HTTP 200)' : 'Aguardando Teste'}</span>
                </span>
              </div>

              <div className="ml-auto text-[11px] text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-800/40 flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>Auto-criação de produtos ativa</span>
              </div>
            </div>

            {/* URL do Webhook & Botões de Ação */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                URL do Webhook (Copie e cole diretamente na Cakto)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customWebhookUrl || webhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  placeholder="https://sua-url.com/api/webhooks/cakto"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 select-all"
                />
                
                <button
                  onClick={() => {
                    const urlToCopy = customWebhookUrl || webhookUrl;
                    navigator.clipboard.writeText(urlToCopy);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? "Copiado!" : "Copiar URL"}</span>
                </button>

                <button
                  disabled={isTestingWebhookPipe}
                  onClick={handleTestWebhookPipeline}
                  className="px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title="Envia um evento de teste para o endpoint para validar o recebimento 200 OK"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isTestingWebhookPipe ? "Testando..." : "Testar Webhook"}</span>
                </button>

                <button
                  disabled={isInstallingWebhook}
                  onClick={() => handleInstallWebhookAuto(customWebhookUrl || webhookUrl)}
                  className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                  title="Cadastra o webhook automaticamente na sua conta Cakto via API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInstallingWebhook ? 'animate-spin' : ''}`} />
                  <span>{isInstallingWebhook ? "Instalando..." : "Instalar via API"}</span>
                </button>

                <button
                  onClick={handleDeleteCaktoWebhook}
                  className="px-3.5 py-2 rounded-md bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title="Excluir configuração do webhook e redefinir endpoint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Webhook</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Cole esta URL nas configurações de Webhooks do painel da Cakto. Suporta validação automática e eventos JSON.</span>
                {customWebhookUrl && (
                  <button 
                    onClick={() => setCustomWebhookUrl("")}
                    className="text-indigo-400 hover:underline cursor-pointer"
                  >
                    Restaurar URL padrão
                  </button>
                )}
              </div>
            </div>

            {/* Feedback da Instalação Automática ou Teste */}
            {webhookInstallResult && (
              <div className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                webhookInstallResult.success 
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {webhookInstallResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block">{webhookInstallResult.success ? "Sucesso na Instalação:" : "Atenção na Instalação:"}</strong>
                  <p className="mt-0.5">{webhookInstallResult.message}</p>
                </div>
              </div>
            )}

            {webhookPipeResult && (
              <div className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                webhookPipeResult.success 
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {webhookPipeResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block">{webhookPipeResult.success ? "Pipeline Testado com Sucesso:" : "Erro no Teste do Pipeline:"}</strong>
                  <p className="mt-0.5">{webhookPipeResult.message}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chave Secreta do Webhook (Opcional - caso configure assinatura na Cakto)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="cakto_webhook_secret_..."
                  value={caktoWebhookSecret}
                  onChange={(e) => setCaktoWebhookSecret(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={handleSaveCaktoConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer shrink-0"
                >
                  Salvar Chave
                </button>
              </div>
            </div>

            {/* Diagnóstico do Webhook */}
            <div className="p-3.5 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2 text-xs">
              <strong className="text-white block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Status e Métricas em Tempo Real do Webhook:
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-300 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Status do Webhook</span>
                  <span className={`font-semibold text-xs flex items-center gap-1 mt-0.5 ${integrationStatus?.cakto?.webhookActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${integrationStatus?.cakto?.webhookActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {integrationStatus?.cakto?.webhookActive ? 'Ativo (Recebendo Eventos)' : 'Aguardando Primeiro Evento'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Transações Registradas</span>
                  <span className="font-bold text-white text-xs block mt-0.5">
                    {integrationStatus?.cakto?.transactionsCount ?? 0} transações
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Último Evento Recebido</span>
                  <span className="font-medium text-slate-300 text-xs block mt-0.5">
                    {integrationStatus?.cakto?.lastEventAt ? new Date(integrationStatus.cakto.lastEventAt).toLocaleString('pt-BR') : 'Sem dados'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Tipo do Último Evento</span>
                  <span className="font-mono text-indigo-300 text-xs block mt-0.5">
                    {integrationStatus?.cakto?.lastEventType || 'Nenhum ainda'}
                  </span>
                </div>
              </div>
            </div>

            {/* Guia Passo a Passo para Instalação Manual na Cakto */}
            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800/80 space-y-2 text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                Como Instalar Manualmente no Painel da Cakto (Caso prefira ou dê erro no painel da Cakto):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300">
                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                  <strong className="text-indigo-300 block mb-1">1. Acesse os Webhooks na Cakto</strong>
                  <p className="text-[11px] text-slate-400">
                    No painel da Cakto, vá em <strong>Configurações</strong> ou <strong>Ferramentas &gt; Webhooks</strong> (ou <strong>Apps</strong>).
                  </p>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                  <strong className="text-indigo-300 block mb-1">2. Crie um Novo Webhook</strong>
                  <p className="text-[11px] text-slate-400">
                    Cole a URL copiada acima e selecione os eventos: <strong>Compra aprovada, Pix gerado, Boleto gerado, Reembolso e Chargeback</strong>.
                  </p>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                  <strong className="text-indigo-300 block mb-1">3. Salve e Valide</strong>
                  <p className="text-[11px] text-slate-400">
                    Clique em <strong>Salvar</strong> na Cakto. Em seguida, clique em <strong>Testar Webhook</strong> acima para confirmar a validação!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Webhooks Cadastrados na Cakto */}
      {showRemoteWebhooksModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                Webhooks Cadastrados na sua Conta Cakto
              </h3>
              <button
                onClick={() => setShowRemoteWebhooksModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {remoteWebhooks && remoteWebhooks.length > 0 ? (
                remoteWebhooks.map((wh: any, idx: number) => (
                  <div key={wh.id || idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{wh.name || `Webhook #${wh.id}`}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded font-mono">
                        ID: {wh.id}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-indigo-400 break-all">{wh.url}</p>
                    {wh.events && (
                      <div className="text-[10px] text-slate-400">
                        Eventos: {Array.isArray(wh.events) ? wh.events.join(", ") : String(wh.events)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum webhook registrado encontrado na conta Cakto ainda. Clique em "Instalar Webhook na Cakto" para cadastrar automaticamente.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRemoteWebhooksModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Fechar
              </button>
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

      {/* MODAL: Conectar Nova API / Business Manager (Multi-BM) */}
      {isBmModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingBm ? "Editar Conexão da API / BM" : "Conectar Nova API / BM da Meta"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBmModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Adicione conexões independentes da Meta Marketing API. Cada BM pode ter suas próprias credenciais (Token de Usuário do Sistema ou App dedicado), permitindo gerenciar contingências sem limitação de um único App.
            </p>

            <form onSubmit={handleSaveBm} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Conexão / Business Manager *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BM Matriz, BM Contingência 01, BM Agência"
                  value={bmFormName}
                  onChange={(e) => setBmFormName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Identificador da Conexão (Meta BM ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 123456789012345"
                  value={bmFormId}
                  onChange={(e) => setBmFormId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ID do Business Manager no Meta Business Suite.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Token de Acesso da Meta (System User Token)
                </label>
                <div className="relative">
                  <input
                    type={showBmModalToken ? "text" : "password"}
                    placeholder="EAAG... (Deixe em branco para usar o Token Global)"
                    value={bmFormToken}
                    onChange={(e) => setBmFormToken(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBmModalToken(!showBmModalToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showBmModalToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tokens nunca são exibidos em texto puro sem autorização.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    App ID da Meta (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 987654321..."
                    value={bmFormAppId}
                    onChange={(e) => setBmFormAppId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    App Secret da Meta (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type={showBmModalSecret ? "text" : "password"}
                      placeholder="••••••••"
                      value={bmFormAppSecret}
                      onChange={(e) => setBmFormAppSecret(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBmModalSecret(!showBmModalSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showBmModalSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="bmActiveCheckbox"
                  checked={bmFormActive}
                  onChange={(e) => setBmFormActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                />
                <label htmlFor="bmActiveCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                  Ativar sincronização automática de contas e campanhas para este BM
                </label>
              </div>

              {bmModalTestFeedback && (
                <div className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                  bmModalTestFeedback.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {bmModalTestFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{bmModalTestFeedback.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isTestingBmModal}
                  onClick={handleTestBmModal}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isTestingBmModal ? "Testando API..." : "Testar Conexão"}</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsBmModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-md transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBm}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSavingBm ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingBm ? "Salvar Alterações" : "Conectar API"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Standard Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          itemName={confirmModal.itemName}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};
