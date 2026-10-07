import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Crown,
  ArrowRight,
  CreditCard,
  ChevronDown,
  Zap,
  Lock,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionService from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';
import PremiumBadge from '../../components/premium/PremiumBadge';
import type { SubscriptionPlanItem, PaymentCheckoutResult } from '../../types/subscription';
import '../../components/premium/Premium.css';

const DEFAULT_PLANS: SubscriptionPlanItem[] = [
  {
    id: 1,
    code: 'FREE',
    name: 'Connectly Free',
    tagline: 'Essential tools to find your vibe',
    description: 'Essential tools to find your vibe',
    priceInr: 0,
    durationDays: 0,
    currency: 'INR',
    features: ['25 Daily Likes', '3 Super Likes / day', 'Basic Matching & Chat', '5 AI Requests / day'],
    isActive: true,
  },
  {
    id: 2,
    code: 'PREMIUM',
    name: 'Connectly Premium',
    tagline: 'Supercharge your dating experience',
    description: 'Supercharge your dating experience',
    priceInr: 499,
    durationDays: 30,
    currency: 'INR',
    features: [
      'Unlimited Daily Likes',
      '10 Super Likes / day',
      'See Who Liked You',
      '1 Profile Boost / month',
      'Advanced Search Filters',
      '30 AI Requests / day',
      'PRO Member Badge',
    ],
    isActive: true,
    highlighted: true,
  },
  {
    id: 3,
    code: 'PREMIUM_PLUS',
    name: 'Connectly VIP',
    tagline: 'Maximum priority & unlimited superpower',
    description: 'Maximum priority & unlimited superpower',
    priceInr: 799,
    durationDays: 30,
    currency: 'INR',
    features: [
      'Everything in Premium',
      '25 Super Likes / day',
      '3 Profile Boosts / month',
      '100 AI Requests / day',
      'Top Discovery Priority',
      'VIP Member Badge',
    ],
    isActive: true,
  },
];

export const PremiumPage: React.FC = () => {
  const { plans, subscription, entitlements, isPremium, refreshSubscription } = useSubscription();
  const toast = useToast();
  const navigate = useNavigate();

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    checkoutData: PaymentCheckoutResult | null;
  }>({
    isOpen: false,
    checkoutData: null,
  });

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const displayPlans = Array.isArray(plans) && plans.length > 0 ? plans : DEFAULT_PLANS;

  const FAQ_ITEMS = [
    {
      question: 'Can I cancel or switch my subscription at any time?',
      answer:
        'Yes, you can cancel or change your plan at any time from Settings > Subscription. If cancelled, your premium benefits remain active until the end of your billing cycle without any penalty.',
    },
    {
      question: 'How do Profile Boosts work?',
      answer:
        'A Profile Boost moves your profile to the top of candidate feeds for 30 consecutive minutes, increasing profile visibility and instant incoming likes by up to 10x.',
    },
    {
      question: 'Will other users know I have Connectly Premium or VIP?',
      answer:
        'Your profile will showcase an exclusive PRO or VIP badge to highlight your verified status. You can also toggle badge visibility on or off anytime in your profile settings.',
    },
    {
      question: 'Is my payment information secure?',
      answer:
        'All transactions are protected with industry-standard 256-bit SSL encryption through verified, PCI-DSS certified payment providers. We never store raw payment details.',
    },
    {
      question: 'What happens when my plan expires?',
      answer:
        'Your account gracefully reverts to Connectly Free. None of your matches, messages, or conversations will be lost.',
    },
  ];

  const handleSelectPlan = async (plan: SubscriptionPlanItem) => {
    if (!plan || plan.code === 'FREE') return;

    if (subscription?.planCode === plan.code && subscription?.status === 'active') {
      toast.info(`You are currently on the ${plan.name} plan!`);
      return;
    }

    try {
      setIsProcessingCheckout(true);
      const checkoutResult = await SubscriptionService.createCheckoutOrder(plan.id);
      setCheckoutModal({
        isOpen: true,
        checkoutData: {
          ...checkoutResult,
          planName: checkoutResult.planName || plan.name,
          plan,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to initiate checkout.';
      toast.error(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleSimulatedPaymentSuccess = async () => {
    if (!checkoutModal.checkoutData) return;

    try {
      setIsProcessingCheckout(true);
      const { orderId } = checkoutModal.checkoutData;

      // In development / testing simulation mode, generate a verified test transaction
      const paymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      // The backend PaymentProvider supports dev simulated signature verification
      const signature = `simulated_sig_${orderId}_${paymentId}`;

      const result = await SubscriptionService.verifyPayment({
        orderId,
        paymentId,
        signature,
      });

      toast.success(
        `🎉 Congratulations! Your ${result.subscription.planName} subscription is now active!`
      );
      setCheckoutModal({ isOpen: false, checkoutData: null });
      await refreshSubscription();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Payment verification failed.';
      toast.error(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="premium-page-container">
      {/* Hero Section */}
      <div className="premium-hero">
        <div className="premium-hero-badge">
          <Sparkles size={16} />
          <span>Connectly Premium Experience</span>
        </div>
        <h1>Elevate Your Dating Journey</h1>
        <p>
          Unlock exclusive superpowers designed to help you stand out, connect faster, and meet
          people who truly match your vibe.
        </p>
      </div>

      {/* Active Subscription Banner (if user already has active/cancelled plan) */}
      {subscription && subscription.status !== 'expired' && (
        <div className="current-sub-banner">
          <div className="current-sub-info">
            <div className="current-sub-icon">
              {subscription.planCode === 'PREMIUM_PLUS' ? <Crown size={28} /> : <Sparkles size={28} />}
            </div>
            <div className="current-sub-details">
              <div className="current-sub-title-row">
                <h3>{subscription.planName} Active</h3>
                <PremiumBadge badge={entitlements?.badge} size="sm" />
              </div>
              <p>
                {subscription.status === 'cancelled'
                  ? `Subscription cancelled. Benefits remain active until ${new Date(
                      subscription.expiresAt
                    ).toLocaleDateString()} (${entitlements?.daysRemaining} days remaining).`
                  : `Renews on ${new Date(subscription.expiresAt).toLocaleDateString()} (${
                      entitlements?.daysRemaining
                    } days remaining).`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings?tab=subscription')}
            className="plan-cta-btn btn-primary current-sub-manage-btn"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="billing-cycle-selector-wrap">
        <div className="billing-cycle-selector" role="group" aria-label="Billing cycle selector">
          <button
            type="button"
            className={`billing-cycle-btn ${billingInterval === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingInterval('monthly')}
            aria-pressed={billingInterval === 'monthly'}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            className={`billing-cycle-btn ${billingInterval === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingInterval('yearly')}
            aria-pressed={billingInterval === 'yearly'}
          >
            <span>Annual Billing</span>
            <span className="billing-save-pill">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-cards-grid">
        {displayPlans.map((plan) => {
          if (!plan) return null;
          const isFree = plan.code === 'FREE';
          const isPopular = plan.code === 'PREMIUM';
          const isVip = plan.code === 'PREMIUM_PLUS';
          const isCurrent =
            (isFree && !isPremium) ||
            (subscription?.planCode === plan.code && subscription?.status === 'active');

          const effectivePrice =
            billingInterval === 'yearly' && !isFree
              ? Math.round(plan.priceInr * 0.8)
              : plan.priceInr;

          return (
            <div
              key={plan.id || plan.code}
              className={`pricing-card ${isPopular ? 'is-popular' : ''} ${isVip ? 'is-vip' : ''}`}
            >
              {isPopular && <div className="popular-ribbon">Most Popular</div>}
              {isVip && <div className="vip-ribbon">Best Value</div>}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-tagline">{plan.tagline || plan.description || ''}</div>
              </div>

              <div className="plan-price-wrap">
                <span className="plan-currency">₹</span>
                <span className="plan-price">{effectivePrice}</span>
                <span className="plan-duration">
                  {isFree ? 'forever' : billingInterval === 'yearly' ? '/ month (billed yearly)' : '/ month'}
                </span>
              </div>

              <ul className="plan-features-list">
                {Array.isArray(plan.features) &&
                  plan.features.map((feat, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <div className="feature-check-icon">
                        <Check size={12} />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
              </ul>

              <button
                disabled={isCurrent || isProcessingCheckout}
                onClick={() => handleSelectPlan(plan)}
                className={`plan-cta-btn ${
                  isCurrent
                    ? 'btn-free'
                    : isVip
                    ? 'btn-vip'
                    : isPopular
                    ? 'btn-primary'
                    : 'btn-free'
                }`}
              >
                {isCurrent ? (
                  <span>Current Plan</span>
                ) : isFree ? (
                  <span>Included</span>
                ) : (
                  <>
                    <span>Choose {plan.name}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="comparison-section">
        <div className="comparison-header">
          <h2>Detailed Feature Comparison</h2>
          <p>Everything you get with Connectly Free vs. Premium tiers</p>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature Capability</th>
                <th style={{ textAlign: 'center' }}>Free</th>
                <th style={{ textAlign: 'center' }}>Premium</th>
                <th style={{ textAlign: 'center' }}>Premium Plus (VIP)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Daily Likes</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Swipes allowed every 24 hours</div>
                </td>
                <td className="col-center">25 / day</td>
                <td className="col-center" style={{ color: '#10b981', fontWeight: 600 }}>Unlimited</td>
                <td className="col-center" style={{ color: '#10b981', fontWeight: 600 }}>Unlimited</td>
              </tr>
              <tr>
                <td>
                  <strong>Super Likes</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Stand out directly in candidate notifications</div>
                </td>
                <td className="col-center">3 / day</td>
                <td className="col-center">10 / day</td>
                <td className="col-center" style={{ color: '#f59e0b', fontWeight: 600 }}>25 / day</td>
              </tr>
              <tr>
                <td>
                  <strong>See Who Liked You</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>View all incoming likes before matching</div>
                </td>
                <td className="col-center">
                  <div className="feature-cross-icon" style={{ margin: '0 auto' }}>
                    <X size={12} />
                  </div>
                </td>
                <td className="col-center">
                  <div className="feature-check-icon" style={{ margin: '0 auto' }}>
                    <Check size={12} />
                  </div>
                </td>
                <td className="col-center">
                  <div className="feature-check-icon" style={{ margin: '0 auto' }}>
                    <Check size={12} />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Profile Boost</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>30-minute top priority ranking in discovery</div>
                </td>
                <td className="col-center">—</td>
                <td className="col-center">1 boost / month</td>
                <td className="col-center" style={{ color: '#f59e0b', fontWeight: 600 }}>3 boosts / month</td>
              </tr>
              <tr>
                <td>
                  <strong>Advanced Filters</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Filter by verified badges, shared interests & lifestyle</div>
                </td>
                <td className="col-center">
                  <div className="feature-cross-icon" style={{ margin: '0 auto' }}>
                    <X size={12} />
                  </div>
                </td>
                <td className="col-center">
                  <div className="feature-check-icon" style={{ margin: '0 auto' }}>
                    <Check size={12} />
                  </div>
                </td>
                <td className="col-center">
                  <div className="feature-check-icon" style={{ margin: '0 auto' }}>
                    <Check size={12} />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>AI Match & Conversation Assistance</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Smart icebreakers, bio rewrites & insights</div>
                </td>
                <td className="col-center">5 requests / day</td>
                <td className="col-center">30 requests / day</td>
                <td className="col-center" style={{ color: '#f59e0b', fontWeight: 600 }}>100 requests / day</td>
              </tr>
              <tr>
                <td>
                  <strong>Profile Customization Badge</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Distinguished badge on your public profile</div>
                </td>
                <td className="col-center">None</td>
                <td className="col-center">
                  <PremiumBadge badge="PRO" size="sm" />
                </td>
                <td className="col-center">
                  <PremiumBadge badge="VIP" size="sm" />
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Discovery Feed Priority</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Algorithm placement in potential matches' decks</div>
                </td>
                <td className="col-center">Standard</td>
                <td className="col-center">High</td>
                <td className="col-center" style={{ color: '#f59e0b', fontWeight: 600 }}>Priority VIP</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust & Guarantee Badges */}
      <div className="premium-trust-badges-grid">
        <div className="premium-trust-badge-card">
          <div className="premium-trust-icon">
            <Lock size={20} />
          </div>
          <div className="premium-trust-text">
            <h4>256-Bit SSL Encryption</h4>
            <p>Bank-grade secure transaction gateway</p>
          </div>
        </div>
        <div className="premium-trust-badge-card">
          <div className="premium-trust-icon">
            <Zap size={20} />
          </div>
          <div className="premium-trust-text">
            <h4>Instant Activation</h4>
            <p>Superpowers unlock immediately</p>
          </div>
        </div>
        <div className="premium-trust-badge-card">
          <div className="premium-trust-icon">
            <RefreshCw size={20} />
          </div>
          <div className="premium-trust-text">
            <h4>Cancel Anytime</h4>
            <p>No commitments or hidden penalty fees</p>
          </div>
        </div>
        <div className="premium-trust-badge-card">
          <div className="premium-trust-icon">
            <ShieldCheck size={20} />
          </div>
          <div className="premium-trust-text">
            <h4>Verified Matching</h4>
            <p>Priority access to authentic members</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="premium-faq-section">
        <div className="premium-faq-header">
          <div className="premium-faq-pill">
            <HelpCircle size={15} />
            <span>Got Questions?</span>
          </div>
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about Connectly Premium memberships</p>
        </div>

        <div className="premium-faq-list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className={`premium-faq-item ${isOpen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="premium-faq-question-btn"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={18} className="premium-faq-chevron" />
                </button>
                {isOpen && (
                  <div className="premium-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal / Simulation */}
      {checkoutModal.isOpen && checkoutModal.checkoutData && (
        <div className="upgrade-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
          <div className="upgrade-modal-card checkout-modal-card">
            <button
              className="upgrade-modal-close"
              onClick={() => setCheckoutModal({ isOpen: false, checkoutData: null })}
              aria-label="Close checkout modal"
            >
              <X size={18} />
            </button>

            <div className="upgrade-modal-header">
              <div
                className="upgrade-modal-sparkle-icon"
                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
              >
                <CreditCard size={28} />
              </div>
              <h3 id="checkout-modal-title">Secure Checkout</h3>
              <p>Complete your payment via Payment Provider</p>
            </div>

            <div className="checkout-summary-box">
              <div className="checkout-summary-row">
                <span className="checkout-label">Plan:</span>
                <strong className="checkout-value">
                  {checkoutModal.checkoutData.plan?.name ||
                    checkoutModal.checkoutData.planName ||
                    'Connectly Premium'}
                </strong>
              </div>
              <div className="checkout-summary-row">
                <span className="checkout-label">Order ID:</span>
                <code className="checkout-order-code">
                  {checkoutModal.checkoutData.orderId}
                </code>
              </div>
              <div className="checkout-summary-row">
                <span className="checkout-label">Billing Duration:</span>
                <span className="checkout-value">
                  {checkoutModal.checkoutData.plan?.durationDays
                    ? `${checkoutModal.checkoutData.plan.durationDays} Days`
                    : '30 Days'}
                </span>
              </div>
              <div className="checkout-summary-row checkout-total-row">
                <span className="checkout-label">Total Amount:</span>
                <span className="checkout-total-price">
                  ₹{checkoutModal.checkoutData.amount} {checkoutModal.checkoutData.currency}
                </span>
              </div>
            </div>

            <div className="checkout-actions">
              <button
                disabled={isProcessingCheckout}
                onClick={handleSimulatedPaymentSuccess}
                className="plan-cta-btn btn-primary checkout-pay-btn"
              >
                <ShieldCheck size={18} />
                <span>
                  {isProcessingCheckout
                    ? 'Verifying Signature...'
                    : 'Complete Verified Payment (Test Provider)'}
                </span>
              </button>
              <button
                disabled={isProcessingCheckout}
                onClick={() => setCheckoutModal({ isOpen: false, checkoutData: null })}
                className="plan-cta-btn btn-free"
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

export default PremiumPage;
