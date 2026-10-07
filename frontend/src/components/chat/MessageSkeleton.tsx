import React from 'react';

export const MessageSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div style={{ alignSelf: 'flex-start', width: '50%' }}>
        <div className="skeleton-pulse skeleton-bubble" style={{ width: '100%', height: '44px' }} />
      </div>
      <div style={{ alignSelf: 'flex-end', width: '45%' }}>
        <div className="skeleton-pulse skeleton-bubble" style={{ width: '100%', height: '52px' }} />
      </div>
      <div style={{ alignSelf: 'flex-start', width: '65%' }}>
        <div className="skeleton-pulse skeleton-bubble" style={{ width: '100%', height: '40px' }} />
      </div>
      <div style={{ alignSelf: 'flex-end', width: '55%' }}>
        <div className="skeleton-pulse skeleton-bubble" style={{ width: '100%', height: '46px' }} />
      </div>
      <div style={{ alignSelf: 'flex-start', width: '40%' }}>
        <div className="skeleton-pulse skeleton-bubble" style={{ width: '100%', height: '42px' }} />
      </div>
    </div>
  );
};

export default MessageSkeleton;
