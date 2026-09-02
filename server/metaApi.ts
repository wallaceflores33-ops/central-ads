/**
 * Real Meta Marketing API Integration Service
 * Communicates with Meta Graph API (v20.0 / v21.0)
 * Uses official Graph endpoints:
 * - /me/adaccounts
 * - /{ad_account_id}/campaigns
 * - /{ad_account_id}/insights
 */

export interface MetaAdAccountRaw {
  id: string; // e.g. "act_123456789"
  name: string;
  account_id: string;
  business_name?: string;
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
  campaign_name: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  clicks?: string;
  cpc?: string;
  ctr?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export class MetaApiService {
  private apiVersion = "v20.0";
  private baseUrl = "https://graph.facebook.com";

  /**
   * Test if the provided access token is valid and returns user/app identity
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
   * Fetch all Ad Accounts accessible by this Access Token
   */
  async fetchAdAccounts(accessToken: string): Promise<{ success: boolean; accounts: MetaAdAccountRaw[]; error?: string }> {
    if (!accessToken || !accessToken.trim()) {
      return { success: false, accounts: [], error: "Token da Meta Marketing API não configurado." };
    }

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/me/adaccounts?fields=id,name,account_id,business_name,currency,account_status,spend_cap&limit=100&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return {
          success: false,
          accounts: [],
          error: `Erro Meta (${data.error.code || 'OAuth'}): ${data.error.message}`
        };
      }

      const accounts: MetaAdAccountRaw[] = Array.isArray(data.data) ? data.data : [];
      return { success: true, accounts };
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
   * Fetch Insights (spend, impressions, clicks, cpc, ctr, purchases) for an ad account
   */
  async fetchInsights(adAccountId: string, accessToken: string, datePreset: string = 'maximum'): Promise<{ success: boolean; insights: MetaInsightRaw[]; error?: string }> {
    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${cleanAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,impressions,reach,frequency,cpm,clicks,cpc,ctr,actions,action_values&date_preset=${datePreset}&limit=250&access_token=${encodeURIComponent(accessToken.trim())}`;
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
}

export const metaApi = new MetaApiService();
