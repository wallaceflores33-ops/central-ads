/**
 * Real Supabase Integration Service
 * Communicates with Supabase REST API (PostgREST)
 * Supports syncing products, campaigns, transactions, and logs directly to Supabase tables.
 */

export interface SupabaseConfig {
  url: string;
  key: string;
}

export class SupabaseService {
  async testConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
    if (!config.url || !config.key) {
      return { success: false, message: "URL ou chave do Supabase não configurados." };
    }

    try {
      const cleanUrl = config.url.replace(/\/$/, "");
      // Query health or schema definition endpoint
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
        },
      });

      if (res.ok || res.status === 200 || res.status === 404) {
        return { success: true, message: "Conexão com Supabase estabelecida com sucesso." };
      }

      return { success: false, message: `Erro ao comunicar com Supabase: Status HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Falha na conexão com Supabase: ${err.message}` };
    }
  }

  async upsertRecords(config: SupabaseConfig, table: string, records: any[]): Promise<{ success: boolean; count?: number; error?: string }> {
    if (!config.url || !config.key) {
      return { success: false, error: "Supabase não configurado." };
    }
    if (!records || records.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const cleanUrl = config.url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(records),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro Supabase (${res.status}): ${errText}` };
      }

      const result = await res.json();
      return { success: true, count: Array.isArray(result) ? result.length : records.length };
    } catch (err: any) {
      return { success: false, error: `Falha ao salvar registros no Supabase: ${err.message}` };
    }
  }
}

export const supabaseService = new SupabaseService();
