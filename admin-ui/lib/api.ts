const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers: number;
    plans: number;
    subscriptions: number;
  };
}

export interface Plan {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: 'MONTH' | 'YEAR';
  providerPlanIdsJson: Record<string, string>;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt?: string;
  canceledAt?: string;
  providerSubscriptionId: string;
  provider: 'STRIPE' | 'PAYPAL';
  createdAt: string;
  updatedAt: string;
  customer?: any;
  plan?: Plan;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return this.fetch('/tenants');
  }

  async getTenant(id: string): Promise<Tenant> {
    return this.fetch(`/tenants/${id}`);
  }

  async createTenant(name: string): Promise<Tenant> {
    return this.fetch('/tenants', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Plans
  async getPlans(tenantId?: string): Promise<Plan[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return this.fetch(`/plans${query}`);
  }

  async getPlan(id: string): Promise<Plan> {
    return this.fetch(`/plans/${id}`);
  }

  async createPlan(plan: Partial<Plan>): Promise<Plan> {
    return this.fetch('/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  // Subscriptions
  async getSubscriptions(tenantId: string): Promise<Subscription[]> {
    return this.fetch(`/tenants/${tenantId}/subscriptions`);
  }

  async cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    immediate: boolean = false,
  ): Promise<Subscription> {
    return this.fetch(`/tenants/${tenantId}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ cancelImmediately: immediate }),
    });
  }
}

export const api = new ApiClient();
