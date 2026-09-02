/**
 * Cakto Official API Integration Service
 * Communicates with Cakto REST API (Public API):
 * - Base URL: https://api.cakto.com.br/public_api
 * - Products: /products/ (DRF pagination: count, next, results)
 * - Offers: /offers/
 * - Webhooks: /webhook/ (listing, creation, deletion)
 * - OAuth Token: /token/ (client_id + client_secret)
 */

import { CaktoCatalogProduct, CaktoCatalogOffer } from "../src/types/index.ts";

export interface CaktoCredentials {
  apiToken?: string;
  clientId?: string;
  clientSecret?: string;
  apiUrl?: string;
}

export class CaktoApiService {
  private defaultBaseUrl = "https://api.cakto.com.br/public_api";

  /**
   * Resolve authorization header and endpoint base url.
   * If client_id and client_secret are provided and no bearer token exists,
   * it can exchange them for a fresh token.
   */
  private resolveConfig(credentials?: CaktoCredentials): { baseUrl: string; headers: Record<string, string>; token: string } {
    const rawToken = credentials?.apiToken || process.env.CAKTO_API_TOKEN || "";
    const baseUrl = (credentials?.apiUrl || process.env.CAKTO_API_URL || this.defaultBaseUrl).replace(/\/$/, "");

    let token = rawToken.trim();
    if (token.toLowerCase().startsWith("bearer ")) {
      token = token.slice(7).trim();
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return { baseUrl, headers, token };
  }

  /**
   * Authenticate via /token/ if client_id and client_secret are provided
   */
  async obtainToken(clientId: string, clientSecret: string, baseUrl = this.defaultBaseUrl): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/token/`;
      const body = new URLSearchParams();
      body.append("client_id", clientId.trim());
      body.append("client_secret", clientSecret.trim());

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: body.toString()
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Erro na autenticação Cakto (${res.status}): ${errText}` };
      }

      const data = await res.json();
      const token = data.access_token || data.token || data.access;
      if (!token) {
        return { success: false, error: "Resposta da Cakto não continha access_token." };
      }

      return { success: true, token };
    } catch (err: any) {
      return { success: false, error: `Falha ao conectar com Cakto /token/: ${err.message}` };
    }
  }

  /**
   * Test connection to Cakto API with the provided token or client credentials
   */
  async testConnection(credentials?: CaktoCredentials): Promise<{ valid: boolean; message: string; accountName?: string; error?: string; token?: string }> {
    let { baseUrl, headers, token } = this.resolveConfig(credentials);

    const clientId = credentials?.clientId?.trim();
    const clientSecret = credentials?.clientSecret?.trim() || (!token.includes(".") && token.length > 20 ? token : "");

    // If no direct token, but client credentials provided, attempt exchange
    if (!token && clientId && clientSecret) {
      const tokenResult = await this.obtainToken(clientId, clientSecret, baseUrl);
      if (!tokenResult.success || !tokenResult.token) {
        return {
          valid: false,
          message: `Falha na autenticação Cakto: ${tokenResult.error}`,
          error: tokenResult.error
        };
      }
      token = tokenResult.token;
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!token) {
      return {
        valid: false,
        message: "Token ou credenciais da API Cakto não informados.",
        error: "Credenciais ausentes"
      };
    }

    try {
      // Test endpoints on Cakto Public API
      const testUrls = [
        `${baseUrl}/products/?limit=1`,
        `${baseUrl}/products/`,
        `${baseUrl}/webhook/`,
        `${baseUrl}/offers/?limit=1`
      ];

      let lastError: string | null = null;
      for (const url of testUrls) {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            const totalCount = data.count !== undefined ? data.count : (Array.isArray(data) ? data.length : (data.results ? data.results.length : 0));
            return {
              valid: true,
              message: `Conexão com a API Cakto estabelecida com sucesso! (${totalCount} produtos identificados).`,
              accountName: `Conta Cakto Conectada (${totalCount} itens no catálogo)`,
              token
            };
          } else if (res.status === 401 || res.status === 403) {
            const errJson = await res.json().catch(() => ({}));
            lastError = errJson.detail || errJson.message || `HTTP ${res.status}: Não autorizado`;
            // If direct token failed and we have client credentials, try exchanging
            if (clientId && clientSecret && !url.includes("tried_exchange")) {
              const exchange = await this.obtainToken(clientId, clientSecret, baseUrl);
              if (exchange.success && exchange.token) {
                token = exchange.token;
                headers["Authorization"] = `Bearer ${token}`;
                return this.testConnection({ ...credentials, apiToken: token });
              }
            }
          } else {
            const text = await res.text();
            lastError = `HTTP ${res.status}: ${text.slice(0, 150)}`;
          }
        } catch (fetchErr: any) {
          lastError = fetchErr.message;
        }
      }

      return {
        valid: false,
        message: `Falha ao autenticar na API Cakto: ${lastError || 'Servidor inacessível'}`,
        error: lastError || "Falha de autenticação"
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Erro ao conectar com Cakto: ${err.message}`,
        error: err.message
      };
    }
  }

  /**
   * Fetch all products and offers from Cakto Public API traversing pagination (DRF `next` link)
   */
  async fetchAllProductsAndOffers(credentials?: CaktoCredentials): Promise<{
    success: boolean;
    products: CaktoCatalogProduct[];
    offersCount: number;
    error?: string;
  }> {
    const { baseUrl, headers, token } = this.resolveConfig(credentials);

    if (!token) {
      return {
        success: false,
        products: [],
        offersCount: 0,
        error: "Token da API Cakto não configurado. Configure nas Configurações > Cakto."
      };
    }

    const allProducts: CaktoCatalogProduct[] = [];
    let totalOffers = 0;
    let nextUrl: string | null = `${baseUrl}/products/`;
    let page = 1;
    const maxPages = 40;

    try {
      while (nextUrl && page <= maxPages) {
        const res = await fetch(nextUrl, { headers });

        if (!res.ok) {
          const errBody = await res.text();
          let parsed: any;
          try { parsed = JSON.parse(errBody); } catch (_) {}
          const detail = parsed?.detail || parsed?.message || errBody.slice(0, 200);
          throw new Error(`Erro na API Cakto (${res.status}): ${detail}`);
        }

        const data = await res.json();
        const items = Array.isArray(data.results) 
          ? data.results 
          : (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));

        if (items.length === 0) {
          break;
        }

        const parsedBatch = this.parseProductItems(items);
        allProducts.push(...parsedBatch);
        totalOffers += parsedBatch.reduce((sum, p) => sum + p.offers.length, 0);

        nextUrl = data.next || null;
        page++;
      }

      // Also try fetching /offers/ if available to enrich offers
      try {
        const offersRes = await fetch(`${baseUrl}/offers/`, { headers });
        if (offersRes.ok) {
          const offersData = await offersRes.json();
          const rawOffers = Array.isArray(offersData.results) 
            ? offersData.results 
            : (Array.isArray(offersData.data) ? offersData.data : (Array.isArray(offersData) ? offersData : []));

          for (const off of rawOffers) {
            const prodId = String(off.product_id || off.product || "");
            const parentProd = allProducts.find(p => p.id === prodId || p.id === String(off.product?.id || ""));
            if (parentProd) {
              const offerExists = parentProd.offers.some(o => o.id === String(off.id));
              if (!offerExists) {
                parentProd.offers.push({
                  id: String(off.id),
                  productId: parentProd.id,
                  name: off.name || off.title || "Oferta Cakto",
                  price: Number(off.price || off.amount || 0) / (off.price > 1000 ? 100 : 1),
                  status: String(off.status || "active"),
                  isOrderBump: Boolean(off.is_order_bump || off.type === 'order_bump'),
                  checkoutUrl: off.checkout_url || off.url || ""
                });
                totalOffers++;
              }
            }
          }
        }
      } catch (_) {
        // Enrichment optional
      }

      return {
        success: true,
        products: allProducts,
        offersCount: totalOffers
      };
    } catch (err: any) {
      return {
        success: false,
        products: [],
        offersCount: 0,
        error: `Falha ao importar catálogo da Cakto: ${err.message}`
      };
    }
  }

  /**
   * List remote webhooks registered on the Cakto account
   */
  async listWebhooks(credentials?: CaktoCredentials): Promise<{ success: boolean; webhooks: any[]; error?: string }> {
    const { baseUrl, headers, token } = this.resolveConfig(credentials);
    if (!token) return { success: false, webhooks: [], error: "Token não configurado" };

    try {
      const res = await fetch(`${baseUrl}/webhook/`, { headers });
      if (!res.ok) {
        const txt = await res.text();
        return { success: false, webhooks: [], error: `HTTP ${res.status}: ${txt}` };
      }
      const data = await res.json();
      const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      return { success: true, webhooks: list };
    } catch (err: any) {
      return { success: false, webhooks: [], error: err.message };
    }
  }

  /**
   * Automatically create or register a webhook on Cakto via API
   */
  async createWebhook(
    url: string, 
    name = "Central Ads - Monitoramento em Tempo Real",
    events: string[] = [
      "purchase_approved",
      "pix_gerado",
      "boleto_gerado",
      "refund",
      "chargeback",
      "subscription_canceled",
      "subscription_renewed",
      "checkout_abandonment"
    ],
    credentials?: CaktoCredentials
  ): Promise<{ success: boolean; webhook?: any; error?: string; message?: string }> {
    const { baseUrl, headers, token } = this.resolveConfig(credentials);
    if (!token) {
      return { success: false, error: "Token da API Cakto não configurado." };
    }

    try {
      // First check if a webhook with this URL already exists
      const existing = await this.listWebhooks(credentials);
      if (existing.success && Array.isArray(existing.webhooks)) {
        const found = existing.webhooks.find((w: any) => w.url === url || (w.url && url.includes(w.url)));
        if (found) {
          return {
            success: true,
            webhook: found,
            message: `Webhook já estava cadastrado na sua Cakto com o ID #${found.id}!`
          };
        }
      }

      // Create new webhook
      const res = await fetch(`${baseUrl}/webhook/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          url,
          events
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let parsed: any;
        try { parsed = JSON.parse(errText); } catch (_) {}
        const detail = parsed?.detail || parsed?.message || (parsed?.url ? `URL: ${parsed.url}` : errText);
        return {
          success: false,
          error: `Falha ao cadastrar webhook na Cakto (${res.status}): ${detail}`
        };
      }

      const created = await res.json();
      return {
        success: true,
        webhook: created,
        message: `Webhook cadastrado com sucesso na sua conta Cakto com o ID #${created.id || 'novo'}!`
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Erro ao criar webhook na Cakto: ${err.message}`
      };
    }
  }

  /**
   * Delete a webhook on Cakto Public API
   */
  async deleteWebhook(
    webhookId: string | number,
    credentials?: CaktoCredentials
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const { baseUrl, headers, token } = this.resolveConfig(credentials);
    if (!token) {
      return { success: false, message: "Token da API Cakto não configurado.", error: "Token ausente" };
    }

    try {
      const res = await fetch(`${baseUrl}/webhook/${webhookId}/`, {
        method: "DELETE",
        headers
      });

      if (res.ok || res.status === 204 || res.status === 200) {
        return {
          success: true,
          message: `Webhook #${webhookId} excluído com sucesso da Cakto!`
        };
      }

      // Try alternative endpoint format without trailing slash
      const altRes = await fetch(`${baseUrl}/webhook/${webhookId}`, {
        method: "DELETE",
        headers
      });

      if (altRes.ok || altRes.status === 204 || altRes.status === 200) {
        return {
          success: true,
          message: `Webhook #${webhookId} excluído com sucesso da Cakto!`
        };
      }

      const errText = await res.text();
      return {
        success: false,
        message: `Falha ao excluir webhook da Cakto (HTTP ${res.status}): ${errText.slice(0, 150)}`,
        error: errText
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro na comunicação com a Cakto: ${err.message}`,
        error: err.message
      };
    }
  }

  /**
   * Helper to parse raw API product items into CaktoCatalogProduct
   */
  private parseProductItems(items: any[]): CaktoCatalogProduct[] {
    return items.map((it: any) => {
      const productId = String(it.id || it.product_id || `cakto_${Date.now()}`);
      const offers: CaktoCatalogOffer[] = [];

      // Check for offers in it.offers, it.plans, it.checkouts
      const rawOffers = it.offers || it.plans || it.checkouts || [];
      if (Array.isArray(rawOffers) && rawOffers.length > 0) {
        for (const off of rawOffers) {
          offers.push({
            id: String(off.id || off.offer_id || `${productId}_off_${offers.length + 1}`),
            productId: productId,
            name: off.name || off.title || "Oferta Padrão",
            price: Number(off.price || off.amount || it.price || 0) / (off.price > 1000 ? 100 : 1),
            status: String(off.status || "active"),
            isOrderBump: Boolean(off.is_order_bump || off.type === 'order_bump'),
            checkoutUrl: off.checkout_url || off.url || ""
          });
        }
      } else {
        // Create default offer from product price if none exists
        offers.push({
          id: `off_${productId}_main`,
          productId: productId,
          name: it.offer_name || "Oferta Principal",
          price: Number(it.price || it.amount || 0) / (it.price > 1000 ? 100 : 1),
          status: "active",
          isOrderBump: false
        });
      }

      return {
        id: productId,
        name: it.name || it.title || "Produto Cakto",
        description: it.description || "",
        price: Number(it.price || it.amount || 0) / (it.price > 1000 ? 100 : 1),
        status: String(it.status || "active"),
        category: it.category?.name || it.category || "Geral",
        productType: it.type || it.product_type || "digital",
        imageUrl: it.image_url || it.image || it.cover || "",
        createdAt: it.created_at || new Date().toISOString(),
        offers: offers
      };
    });
  }
}

export const caktoApi = new CaktoApiService();

