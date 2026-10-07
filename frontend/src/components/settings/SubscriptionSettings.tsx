import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CreditCard,
  Crown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionService from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';
import PremiumBadge from '../premium/PremiumBadge';
import type { PaymentTransactionItem } from '../../types/subscription';
import '../premium/Premium.css';

export const SubscriptionSettings: React.FC = () => {
  const { subscription, entitlements, isPremium, refreshSubscription } = useSubscription();
  const toast = useToast();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<PaymentTransactionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoadingHistory(true);
      const history = await SubscriptionService.getPaymentHistory();
      setTransactions(history);
    } catch (err: any) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      const res = await SubscriptionService.cancelSubscription();
      toast.success(
        `Subscription cancelled. You will continue to have full access until ${new Date(
          res.expiresAt
        ).toLocaleDateString()}.`
      );
      setShowCancelModal(false);
      await refreshSubscription();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to cancel subscription.';
      toast.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Subscription &amp; Billing
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Manage your membership tier, benefits, renewal schedule, and transaction history.
        </p>
      </div>

      {/* Plan Summary Card */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1.25rem',
          padding: '1.75rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.85rem',
                background: isPremium
                  ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                  : 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              {entitlements?.badge === 'VIP' ? (
                <Crown size={24} />
              ) : isPremium ? (
                <Sparkles size={24} />
              ) : (
                <CreditCard size={24} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {subscription?.planName || 'Connectly Free'}
                </h3>
                <PremiumBadge badge={entitlements?.badge} size="sm" />
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background:
                      subscription?.status === 'active'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : subscription?.status === 'cancelled'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      subscription?.status === 'active'
                        ? '#10b981'
                        : subscription?.status === 'cancelled'
                        ? '#f59e0b'
                        : '#94a3b8',
                  }}
                >
                  {subscription?.status || 'Active'}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                {isPremium && subscription?.expiresAt
                  ? subscription.status === 'cancelled'
                    ? `Access remains active until ${new Date(
                        subscription.expiresAt
                      ).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.expiresAt).toLocaleDateString()}`
                  : 'Free Forever Tier'}
              </p>
            </div>
          </div>

          <div>
            {!isPremium ? (
              <button
                onClick={() => navigate('/premium')}
                className="plan-cta-btn btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.92rem' }}
              >
                <Sparkles size={16} />
                <span>Upgrade to Premium</span>
              </button>
            ) : subscription?.status === 'active' ? (
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel Subscription
              </button>
            ) : null}
          </div>
        </div>

        {/* Current Entitlements & Usage Counters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.9rem', borderRadius: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
              Daily Likes
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              {entitlements?.limits.dailyLikes === -1 ? (
                <span style={{ color: '#10b981' }}>Unlimited</span>
              ) : (
                `${entitlements?.usage.dailyLikesUsed || 0} / ${entitlements?.limits.dailyLikes || 25}`
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.9rem', borderRadius: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
              Super Likes (Today)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              {entitlements?.usage.dailySuperLikesUsed || 0} / {entitlements?.limits.dailySuperLikes || 3}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.9rem', borderRadius: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
              Profile Boosts (Month)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              {entitlements?.usage.monthlyBoostsUsed || 0} / {entitlements?.limits.monthlyBoosts || 0}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.9rem', borderRadius: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
              AI Requests (Today)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              {entitlements?.usage.dailyAiRequestsUsed || 0} / {entitlements?.limits.dailyAiRequests || 5}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction & Billing History */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Payment &amp; Billing History
          </h3>
          <button
            onClick={loadTransactions}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            Loading billing records...
          </div>
        ) : transactions.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              fontSize: '0.9rem',
            }}
          >
            No billing transactions on file yet.
          </div>
        ) : (
          <div className="comparison-table-wrapper" style={{ borderRadius: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan Tier</th>
                  <th>Amount</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td>
                      <strong>{tx.planName || 'Connectly Premium'}</strong>
                    </td>
                    <td>
                      ₹{tx.amount} {tx.currency}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                        {tx.providerPaymentId}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="upgrade-modal-backdrop">
          <div className="upgrade-modal-card" style={{ maxWidth: '440px' }}>
            <div className="upgrade-modal-header">
              <div
                className="upgrade-modal-sparkle-icon"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
              >
                <AlertCircle size={32} />
              </div>
              <h3>Cancel Subscription?</h3>
              <p>
                Are you sure you want to cancel? You will continue to have full premium access until{' '}
                <strong>
                  {subscription?.expiresAt
                    ? new Date(subscription.expiresAt).toLocaleDateString()
                    : 'the end of your billing cycle'}
                </strong>
                . After that, your account will revert to the Free tier.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                disabled={isCancelling}
                onClick={handleCancelSubscription}
                className="plan-cta-btn"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="plan-cta-btn btn-free"
              >
                Keep My Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSettings;
