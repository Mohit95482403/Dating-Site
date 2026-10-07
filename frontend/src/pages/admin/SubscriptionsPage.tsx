import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Edit2,
  Save,
  Sparkles,
} from 'lucide-react';
import SubscriptionService from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';
import type {
  AdminSubscriptionAnalytics,
  AdminSubscribersListResponse,
  AdminTransactionsListResponse,
  SubscriptionPlanItem,
} from '../../types/subscription';
import '../../components/premium/Premium.css';

export const AdminSubscriptionsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'analytics' | 'subscribers' | 'transactions' | 'plans'>(
    'analytics'
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Telemetry data
  const [analytics, setAnalytics] = useState<AdminSubscriptionAnalytics | null>(null);

  // Plans data
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [planEditForm, setPlanEditForm] = useState<{
    name: string;
    tagline: string;
    priceInr: number;
    isActive: boolean;
  }>({ name: '', tagline: '', priceInr: 0, isActive: true });

  // Subscribers directory
  const [subscribersData, setSubscribersData] = useState<AdminSubscribersListResponse>({
    total: 0,
    page: 1,
    limit: 20,
    subscribers: [],
  });
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<string>('all');
  const [subscribersPage, setSubscribersPage] = useState<number>(1);

  // Transactions directory
  const [transactionsData, setTransactionsData] = useState<AdminTransactionsListResponse>({
    total: 0,
    page: 1,
    limit: 20,
    transactions: [],
  });
  const [transactionsPage, setTransactionsPage] = useState<number>(1);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, plansRes, subsRes, txRes] = await Promise.all([
        SubscriptionService.getAdminSubscriptionAnalytics().catch(() => null),
        SubscriptionService.getActivePlans().catch(() => []),
        SubscriptionService.getAdminSubscribers(1, 20).catch(() => ({
          total: 0,
          page: 1,
          limit: 20,
          subscribers: [],
        })),
        SubscriptionService.getAdminTransactions(1, 20).catch(() => ({
          total: 0,
          page: 1,
          limit: 20,
          transactions: [],
        })),
      ]);

      setAnalytics(analyticsRes);
      setPlans(plansRes);
      setSubscribersData(subsRes);
      setTransactionsData(txRes);
    } catch (err: any) {
      console.error('Failed to load admin subscription records:', err);
      toast.error('Failed to load subscription management data.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSubscribersFilterChange = async (status: string) => {
    setSubscriberStatusFilter(status);
    setSubscribersPage(1);
    try {
      const res = await SubscriptionService.getAdminSubscribers(1, 20, status);
      setSubscribersData(res);
    } catch (err) {
      console.error('Failed to filter subscribers:', err);
    }
  };

  const handleSubscribersPageChange = async (newPage: number) => {
    setSubscribersPage(newPage);
    try {
      const res = await SubscriptionService.getAdminSubscribers(newPage, 20, subscriberStatusFilter);
      setSubscribersData(res);
    } catch (err) {
      console.error('Failed to paginate subscribers:', err);
    }
  };

  const handleTransactionsPageChange = async (newPage: number) => {
    setTransactionsPage(newPage);
    try {
      const res = await SubscriptionService.getAdminTransactions(newPage, 20);
      setTransactionsData(res);
    } catch (err) {
      console.error('Failed to paginate transactions:', err);
    }
  };

  const startEditPlan = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setPlanEditForm({
      name: plan.name,
      tagline: plan.tagline || '',
      priceInr: plan.priceInr,
      isActive: plan.isActive,
    });
  };

  const saveEditPlan = async () => {
    if (!editingPlan) return;
    try {
      await SubscriptionService.updateAdminPlan(editingPlan.id, planEditForm);
      toast.success(`Plan "${planEditForm.name}" updated successfully!`);
      setEditingPlan(null);
      const updatedPlans = await SubscriptionService.getActivePlans();
      setPlans(updatedPlans);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update plan.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Loading subscription management &amp; telemetry...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', color: '#f8fafc' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            Subscription &amp; Monetization Control
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '0.25rem' }}>
            Manage pricing tiers, view verified subscribers, monitor revenue, and inspect payment transactions.
          </p>
        </div>
        <button
          onClick={loadAllData}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            padding: '0.55rem 1.1rem',
            borderRadius: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Total Verified Revenue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{analytics?.totalRevenueInr || 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Monthly Recurring (MRR)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{analytics?.monthlyRecurringRevenueInr || 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Active Subscribers</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {analytics?.activeSubscribers || 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Free → Paid Conversion</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {analytics?.conversionRate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem',
        }}
      >
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'analytics' ? '#ec4899' : '#94a3b8',
            borderBottom: activeTab === 'analytics' ? '2px solid #ec4899' : '2px solid transparent',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Plans Management
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'subscribers' ? '#ec4899' : '#94a3b8',
            borderBottom: activeTab === 'subscribers' ? '2px solid #ec4899' : '2px solid transparent',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Subscribers Directory ({subscribersData.total})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'transactions' ? '#ec4899' : '#94a3b8',
            borderBottom: activeTab === 'transactions' ? '2px solid #ec4899' : '2px solid transparent',
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Payment Transactions ({transactionsData.total})
        </button>
      </div>

      {/* Tab 1: Plans Management */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Active Subscription Plans
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              These tiers are rendered on client pricing cards and enforced server-side.
            </p>
          </div>

          <div className="comparison-table-wrapper" style={{ borderRadius: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Plan Code</th>
                  <th>Display Name</th>
                  <th>Monthly Price</th>
                  <th>Billing Cycle</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ color: '#38bdf8', fontWeight: 700 }}>{p.code}</code>
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.tagline}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981' }}>
                        ₹{p.priceInr}
                      </span>
                    </td>
                    <td>{p.durationDays === 0 ? 'Forever' : `${p.durationDays} Days`}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: p.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.isActive ? '#10b981' : '#ef4444',
                        }}
                      >
                        {p.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => startEditPlan(p)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: '#f8fafc',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Subscribers Directory */}
      {activeTab === 'subscribers' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Subscribers Directory
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                All paid user memberships tracked with start, renewal, and cancellation states.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'active', 'cancelled', 'expired'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleSubscribersFilterChange(st)}
                  style={{
                    background: subscriberStatusFilter === st ? '#ec4899' : 'rgba(255, 255, 255, 0.06)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="comparison-table-wrapper" style={{ borderRadius: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan Tier</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Expires / Renews</th>
                  <th>Provider</th>
                </tr>
              </thead>
              <tbody>
                {subscribersData.subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No subscriber records found.
                    </td>
                  </tr>
                ) : (
                  subscribersData.subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <strong>
                          {sub.firstName} {sub.lastName}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sub.email}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{sub.planName}</span>
                        <div style={{ fontSize: '0.78rem', color: '#10b981' }}>₹{sub.priceInr}/mo</div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background:
                              sub.status === 'active'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : sub.status === 'cancelled'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              sub.status === 'active'
                                ? '#10b981'
                                : sub.status === 'cancelled'
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td>{new Date(sub.startedAt).toLocaleDateString()}</td>
                      <td>{new Date(sub.expiresAt).toLocaleDateString()}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sub.provider}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {subscribersData.total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                disabled={subscribersPage <= 1}
                onClick={() => handleSubscribersPageChange(subscribersPage - 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
              <button
                disabled={subscribersPage * 20 >= subscribersData.total}
                onClick={() => handleSubscribersPageChange(subscribersPage + 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transactions Directory */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Payment Transactions Directory
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Immutable record of provider order IDs, payment IDs, and verification statuses.
            </p>
          </div>

          <div className="comparison-table-wrapper" style={{ borderRadius: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Amount</th>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No payment transactions recorded.
                    </td>
                  </tr>
                ) : (
                  transactionsData.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>
                        <strong>
                          {tx.firstName} {tx.lastName}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{tx.email}</div>
                      </td>
                      <td>{tx.planName}</td>
                      <td>
                        <strong style={{ color: '#10b981' }}>
                          ₹{tx.amount} {tx.currency}
                        </strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                          {tx.providerPaymentId}
                        </code>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {tx.providerOrderId}
                        </code>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background:
                              tx.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color: tx.status === 'completed' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {transactionsData.total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                disabled={transactionsPage <= 1}
                onClick={() => handleTransactionsPageChange(transactionsPage - 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
              <button
                disabled={transactionsPage * 20 >= transactionsData.total}
                onClick={() => handleTransactionsPageChange(transactionsPage + 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="upgrade-modal-backdrop">
          <div className="upgrade-modal-card" style={{ maxWidth: '440px' }}>
            <div className="upgrade-modal-header">
              <h3>Edit Plan: {editingPlan.code}</h3>
              <p>Configure pricing and active status for this membership tier.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Plan Name
                </label>
                <input
                  type="text"
                  value={planEditForm.name}
                  onChange={(e) => setPlanEditForm({ ...planEditForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Tagline
                </label>
                <input
                  type="text"
                  value={planEditForm.tagline}
                  onChange={(e) => setPlanEditForm({ ...planEditForm, tagline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Price (INR)
                </label>
                <input
                  type="number"
                  value={planEditForm.priceInr}
                  onChange={(e) =>
                    setPlanEditForm({ ...planEditForm, priceInr: parseInt(e.target.value, 10) || 0 })
                  }
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="plan-active-check"
                  checked={planEditForm.isActive}
                  onChange={(e) => setPlanEditForm({ ...planEditForm, isActive: e.target.checked })}
                />
                <label htmlFor="plan-active-check" style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                  Plan Active &amp; Offered to Users
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={saveEditPlan}
                className="plan-cta-btn btn-primary"
                style={{ flex: 1 }}
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
              <button
                onClick={() => setEditingPlan(null)}
                className="plan-cta-btn btn-free"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptionsPage;
