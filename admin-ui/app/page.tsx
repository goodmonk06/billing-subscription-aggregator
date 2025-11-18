import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Billing & Subscription Aggregator
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unified billing management for Stripe, PayPal, and more
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Link
            href="/tenants"
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tenants</h2>
            <p className="text-gray-600">Manage your tenants and their configurations</p>
          </Link>

          <div className="block p-6 bg-white rounded-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Plans</h2>
            <p className="text-gray-600">View and manage billing plans</p>
            <p className="text-sm text-gray-500 mt-2">Select a tenant first</p>
          </div>

          <div className="block p-6 bg-white rounded-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Subscriptions</h2>
            <p className="text-gray-600">Monitor active subscriptions</p>
            <p className="text-sm text-gray-500 mt-2">Select a tenant first</p>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">API Endpoints</h3>
          <div className="space-y-2 text-sm font-mono text-gray-700">
            <div>POST /tenants/:id/customers</div>
            <div>POST /tenants/:id/subscriptions</div>
            <div>GET /tenants/:id/subscriptions</div>
            <div>DELETE /tenants/:id/subscriptions/:subscriptionId</div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Backend API: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</p>
        </div>
      </div>
    </div>
  );
}
