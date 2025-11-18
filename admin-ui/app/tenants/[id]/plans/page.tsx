'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, Plan } from '@/lib/api';

export default function TenantPlansPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [tenantId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await api.getPlans(tenantId);
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/tenants" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Back to Tenants
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Plans</h1>
          <p className="text-gray-600 mt-1">Tenant: {tenantId}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                {plan.isActive ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price, plan.currency)}
                </div>
                <div className="text-sm text-gray-500">per {plan.billingInterval.toLowerCase()}</div>
              </div>

              {plan.description && (
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              )}

              <div className="border-t pt-4">
                <div className="text-xs text-gray-500 mb-2">Provider Plan IDs:</div>
                <div className="space-y-1">
                  {Object.entries(plan.providerPlanIdsJson as Record<string, string>).map(
                    ([provider, planId]) => (
                      <div key={provider} className="text-xs font-mono text-gray-600">
                        <span className="font-semibold">{provider}:</span> {planId}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {plan._count?.subscriptions || 0} active subscription
                  {(plan._count?.subscriptions || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No plans found. Create one using the API.</p>
          </div>
        )}
      </div>
    </div>
  );
}
