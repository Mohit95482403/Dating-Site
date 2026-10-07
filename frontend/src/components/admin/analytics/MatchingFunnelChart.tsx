import React from 'react';
import { Filter, ArrowDown, Heart, MessageSquare, Compass, Sparkles } from 'lucide-react';
import type { MatchingFunnelData } from '../../../types/analytics';

interface MatchingFunnelChartProps {
  data: MatchingFunnelData;
}

export const MatchingFunnelChart: React.FC<MatchingFunnelChartProps> = ({ data }) => {
  const {
    discoveryViews = 0,
    likes = 0,
    matches = 0,
    conversations = 0,
    messages = 0,
    conversionRates = {
      likeToMatch: 'N/A',
      matchToConversation: 'N/A',
      conversationToMessage: 'N/A',
    },
  } = data;

  const baseline = Math.max(1, discoveryViews, likes, matches);

  const stages = [
    {
      id: 'discovery',
      label: 'Profiles Discovered',
      count: discoveryViews,
      pctOfBase: Math.min(100, Math.round((discoveryViews / baseline) * 100)),
      color: '#6366f1',
      icon: <Compass size={16} />,
      conversionText: 'Discovery baseline',
    },
    {
      id: 'likes',
      label: 'Likes Expressed',
      count: likes,
      pctOfBase: Math.min(100, Math.round((likes / baseline) * 100)),
      color: '#ec4899',
      icon: <Heart size={16} />,
      conversionText: discoveryViews > 0 ? `${((likes / discoveryViews) * 100).toFixed(1)}% of discovered` : 'N/A',
    },
    {
      id: 'matches',
      label: 'Mutual Matches Created',
      count: matches,
      pctOfBase: Math.min(100, Math.round((matches / baseline) * 100)),
      color: '#a855f7',
      icon: <Sparkles size={16} />,
      conversionText: `Like → Match: ${conversionRates.likeToMatch}`,
    },
    {
      id: 'conversations',
      label: 'Active Conversations',
      count: conversations,
      pctOfBase: Math.min(100, Math.round((conversations / baseline) * 100)),
      color: '#3b82f6',
      icon: <MessageSquare size={16} />,
      conversionText: `Match → Conv: ${conversionRates.matchToConversation}`,
    },
    {
      id: 'messages',
      label: 'Messages Exchanged',
      count: messages,
      pctOfBase: Math.min(100, Math.round((messages / baseline) * 100)),
      color: '#10b981',
      icon: <MessageSquare size={16} />,
      conversionText: `Conv → Msg: ${conversionRates.conversationToMessage}`,
    },
  ];

  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Filter size={18} className="text-purple-400" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Matching & Conversation Conversion Funnel
            </h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
            Visualizes drop-off from discovery to mutual match and active chat dialogue.
          </p>
        </div>

        {/* Funnel Conversion Ratios Summary */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '0.3rem 0.6rem', borderRadius: '7px', fontSize: '0.78rem' }}>
            <span style={{ color: '#c084fc', fontWeight: 600 }}>Like → Match: </span>
            <strong style={{ color: '#ffffff' }}>{conversionRates.likeToMatch}</strong>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '0.3rem 0.6rem', borderRadius: '7px', fontSize: '0.78rem' }}>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>Match → Conv: </span>
            <strong style={{ color: '#ffffff' }}>{conversionRates.matchToConversation}</strong>
          </div>
        </div>
      </div>

      {/* Funnel Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {stages.map((stage, idx) => (
          <div key={stage.id} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontWeight: 600 }}>
                <span style={{ color: stage.color }}>{stage.icon}</span>
                <span>{stage.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: '#0a0d17', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {stage.conversionText}
                </span>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.92rem' }}>
                  {stage.count.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Horizontal Bar with Gradient */}
            <div
              style={{
                width: '100%',
                height: '14px',
                background: '#090b14',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div
                style={{
                  width: `${Math.max(2, stage.pctOfBase)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color})`,
                  borderRadius: '6px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Connector arrow between stages */}
            {idx < stages.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.2rem 0 -0.4rem', opacity: 0.3 }}>
                <ArrowDown size={12} color="#94a3b8" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchingFunnelChart;
