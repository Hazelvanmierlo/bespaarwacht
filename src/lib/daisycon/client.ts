import type {
  IDaisyconClient,
  DaisyconPublisher,
  DaisyconProgram,
  DaisyconMaterial,
  DaisyconTransaction,
  DaisyconTokenResponse,
} from './types';

const SANDBOX_BASE = 'https://services.daisycon.com/sandbox';
const PRODUCTION_BASE = 'https://services.daisycon.com';
const TOKEN_URL = 'https://login.daisycon.com/oauth/token';

const MAX_REQUESTS_PER_MINUTE = 15;
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / MAX_REQUESTS_PER_MINUTE);

export class DaisyconClient implements IDaisyconClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private lastRequestAt = 0;

  constructor() {
    this.clientId = process.env.DAISYCON_CLIENT_ID!;
    this.clientSecret = process.env.DAISYCON_CLIENT_SECRET!;
    const useSandbox = process.env.DAISYCON_USE_SANDBOX !== 'false';
    this.baseUrl = useSandbox ? SANDBOX_BASE : PRODUCTION_BASE;
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.accessToken;
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`Daisycon token error: ${res.status} ${await res.text()}`);
    }

    const data: DaisyconTokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < REQUEST_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async request<T>(path: string): Promise<T> {
    await this.rateLimit();
    const token = await this.ensureToken();

    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Daisycon API error: ${res.status} ${path}`);
    }

    return res.json();
  }

  async getPublishers(): Promise<DaisyconPublisher[]> {
    return this.request('/publishers');
  }

  async getPrograms(publisherId: number): Promise<DaisyconProgram[]> {
    return this.request(`/publishers/${publisherId}/programs`);
  }

  async getMaterials(publisherId: number, programId: number): Promise<DaisyconMaterial[]> {
    return this.request(`/publishers/${publisherId}/programs/${programId}/materials`);
  }

  async getTransactions(
    publisherId: number,
    params?: { startDate?: string; endDate?: string },
  ): Promise<DaisyconTransaction[]> {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('start', params.startDate);
    if (params?.endDate) qs.set('end', params.endDate);
    const query = qs.toString() ? `?${qs}` : '';
    return this.request(`/publishers/${publisherId}/transactions${query}`);
  }
}
