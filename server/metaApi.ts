/**
 * Real Meta Marketing API Integration Service
 * Communicates with Meta Graph API (v20.0 / v21.0)
 * Uses official Graph endpoints:
 * - /me/adaccounts
 * - /{ad_account_id}/campaigns
 * - /{ad_account_id}/insights
 */

export interface MetaBusinessRaw {
  id: string; // e.g. "123456789012345"
  name: string;
  verification_status?: string;
  created_time?: string;
}

export interface MetaAdAccountRaw {
  id: string; // e.g. "act_123456789"
  name: string;
  account_id: string;
  business?: { id: string; name: string };
  business_name?: string;
  business_id?: string;
  currency: string;
  account_status: number; // 1 = ACTIVE, 2 = DISABLED, etc.
  spend_cap?: string;
}

export interface MetaCampaignRaw {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  daily_budget?: string;
  budget_remaining?: string;
  objective?: string;
  created_time?: string;
  updated_time?: string;
}

export interface MetaInsightRaw {
  campaign_id: string;
  campaign_name?: string;
  account_id?: string;
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  clicks?: string;
  cpc?: string;
  ctr?: string;
  outbound_clicks?: { action_type: string; value: string }[];
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  conversions?: { action_type: string; value: string }[];
  conversion_values?: { action_type: string; value: string }[];
  account_currency?: string;
}

export class MetaApiService {
  private apiVersion = "v20.0";
  private baseUrl = "https://graph.facebook.com";

  /**
   * Test if the provided access token is valid and returns user identity
   */
  async testAccessToken(accessToken: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    if (!accessToken || !accessToken.trim()) {
      return { valid: false, error: "Token de acesso não informado." };
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/me?fields=id,name&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          valid: false,
          error: `Erro Meta API (${data.error.code || 'OAuth'}): ${data.error.message || 'Token inválido'}`
        };
      }

      return { valid: true, user: data };
    } catch (err: any) {
      return { valid: false, error: `Falha de rede ao contatar Meta API: ${err.message}` };
    }
  }

  /**
   * Fetch all Business Managers accessible by the user/token
   */
  async fetchBusinesses(accessToken: string): Promise<{ success: boolean; businesses: MetaBusinessRaw[]; error?: string }> {
    if (!accessToken || !accessToken.trim()) {
      return { success: false, businesses: [], error: "Token da Meta Marketing API não configurado." };
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/me/businesses?fields=id,name,verification_status,created_time&limit=50&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        // Not a blocking failure if the user is not in a BM or token lacks business_management
        return {
          success: false,
          businesses: [],
          error: `Erro Meta ao buscar Business Managers: ${data.error.message}`
        };
      }

      const businesses: MetaBusinessRaw[] = Array.isArray(data.data) ? data.data : [];
      return { success: true, businesses };
    } catch (err: any) {
      return { success: false, businesses: [], error: `Falha ao buscar Business Managers: ${err.message}` };
    }
  }

  /**
   * Test connection to a specific Business Manager by ID
   */
  async testBusiness(businessId: string, accessToken: string): Promise<{ success: boolean; business?: MetaBusinessRaw; error?: string }> {
    if (!businessId || !businessId.trim()) {
      return { success: false, error: "ID do Business Manager não informado." };
    }
    if (!accessToken || !accessToken.trim()) {
      return { success: false, error: "Token de acesso não informado para este Business Manager." };
    }

    const cleanBmId = businessId.trim().replace(/^bm_/, '');
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${cleanBmId}?fields=id,name,verification_status,created_time&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          error: `Erro Meta (${data.error.code || 'OAuth'}): ${data.error.message || 'Falha ao acessar Business Manager'}`
        };
      }

      return {
        success: true,
        business: {
          id: data.id,
          name: data.name || `BM ${data.id}`,
          verification_status: data.verification_status,
          created_time: data.created_time
        }
      };
    } catch (err: any) {
      return { success: false, error: `Falha de rede ao verificar Business Manager: ${err.message}` };
    }
  }

  /**
   * Fetch owned and client ad accounts for a given Business Manager
   */
  async fetchBusinessAdAccounts(businessId: string, accessToken: string): Promise<{ success: boolean; accounts: MetaAdAccountRaw[]; error?: string }> {
    try {
      const fields = "id,name,account_id,business_name,currency,account_status,spend_cap";
      const [ownedRes, clientRes] = await Promise.allSettled([
        fetch(`${this.baseUrl}/${this.apiVersion}/${businessId}/owned_ad_accounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(accessToken.trim())}`).then(r => r.json()),
        fetch(`${this.baseUrl}/${this.apiVersion}/${businessId}/client_ad_accounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(accessToken.trim())}`).then(r => r.json())
      ]);

      const allAccounts: MetaAdAccountRaw[] = [];
      const seen = new Set<string>();

      if (ownedRes.status === 'fulfilled' && Array.isArray(ownedRes.value?.data)) {
        for (const a of ownedRes.value.data) {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            allAccounts.push({ ...a, business_id: businessId });
          }
        }
      }

      if (clientRes.status === 'fulfilled' && Array.isArray(clientRes.value?.data)) {
        for (const a of clientRes.value.data) {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            allAccounts.push({ ...a, business_id: businessId });
          }
        }
      }

      return { success: true, accounts: allAccounts };
    } catch (err: any) {
      return { success: false, accounts: [], error: `Falha ao buscar contas do BM ${businessId}: ${err.message}` };
    }
  }

  /**
   * Fetch all Ad Accounts accessible by this Access Token (direct + BM merged)
   */
  async fetchAdAccounts(accessToken: string): Promise<{ success: boolean; accounts: MetaAdAccountRaw[]; error?: string }> {
    if (!accessToken || !accessToken.trim()) {
      return { success: false, accounts: [], error: "Token da Meta Marketing API não configurado." };
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/me/adaccounts?fields=id,name,account_id,business_name,business,currency,account_status,spend_cap&limit=100&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          accounts: [],
          error: `Erro Meta (${data.error.code || 'OAuth'}): ${data.error.message}`
        };
      }

      const directAccounts: MetaAdAccountRaw[] = Array.isArray(data.data) ? data.data.map((a: any) => ({
        ...a,
        business_id: a.business?.id,
        business_name: a.business?.name || a.business_name
      })) : [];

      return { success: true, accounts: directAccounts };
    } catch (err: any) {
      return { success: false, accounts: [], error: `Falha ao buscar contas de anúncios: ${err.message}` };
    }
  }

  /**
   * Fetch all Campaigns for a specific Ad Account
   */
  async fetchCampaigns(adAccountId: string, accessToken: string): Promise<{ success: boolean; campaigns: MetaCampaignRaw[]; error?: string }> {
    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${cleanAccountId}/campaigns?fields=id,name,status,daily_budget,budget_remaining,objective,created_time,updated_time&limit=250&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          campaigns: [],
          error: `Erro Meta ao buscar campanhas de ${cleanAccountId}: ${data.error.message}`
        };
      }

      const campaigns: MetaCampaignRaw[] = Array.isArray(data.data) ? data.data : [];
      return { success: true, campaigns };
    } catch (err: any) {
      return { success: false, campaigns: [], error: `Falha de rede ao buscar campanhas: ${err.message}` };
    }
  }

  /**
   * Fetch Insights (cumulative) for an ad account
   */
  async fetchInsights(adAccountId: string, accessToken: string, datePreset: string = 'last_30d'): Promise<{ success: boolean; insights: MetaInsightRaw[]; error?: string }> {
    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const fields = "campaign_id,campaign_name,account_id,spend,impressions,reach,frequency,cpm,clicks,cpc,ctr,outbound_clicks,actions,action_values,cost_per_action_type,conversions,conversion_values,account_currency,date_start,date_stop";

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${cleanAccountId}/insights?level=campaign&fields=${fields}&date_preset=${datePreset}&limit=500&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          insights: [],
          error: `Erro Meta ao buscar métricas: ${data.error.message}`
        };
      }

      const insights: MetaInsightRaw[] = Array.isArray(data.data) ? data.data : [];
      return { success: true, insights };
    } catch (err: any) {
      return { success: false, insights: [], error: `Falha ao buscar métricas: ${err.message}` };
    }
  }

  /**
   * Fetch Daily Insights (time_increment=1) for campaign daily breakdown
   */
  async fetchDailyInsights(adAccountId: string, accessToken: string, datePreset: string = 'last_30d'): Promise<{ success: boolean; dailyInsights: MetaInsightRaw[]; error?: string }> {
    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const fields = "campaign_id,campaign_name,account_id,spend,impressions,reach,frequency,cpm,clicks,cpc,ctr,outbound_clicks,actions,action_values,cost_per_action_type,conversions,conversion_values,account_currency,date_start,date_stop";

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${cleanAccountId}/insights?level=campaign&fields=${fields}&time_increment=1&date_preset=${datePreset}&limit=1000&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          dailyInsights: [],
          error: `Erro Meta ao buscar métricas diárias: ${data.error.message}`
        };
      }

      const dailyInsights: MetaInsightRaw[] = Array.isArray(data.data) ? data.data : [];
      return { success: true, dailyInsights };
    } catch (err: any) {
      return { success: false, dailyInsights: [], error: `Falha ao buscar métricas diárias: ${err.message}` };
    }
  }
}

export const metaApi = new MetaApiService();
