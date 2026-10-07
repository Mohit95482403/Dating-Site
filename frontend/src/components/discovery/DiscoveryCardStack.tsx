import React, { useState, useRef, useEffect } from 'react';
import type { DiscoveryProfile } from '../../types/discovery';
import DiscoveryCard from './DiscoveryCard';
import './Discovery.css';

interface DiscoveryCardStackProps {
  profiles: DiscoveryProfile[];
  currentIndex: number;
  onSwipeLeft: (profile: DiscoveryProfile) => void;
  onSwipeRight: (profile: DiscoveryProfile) => void;
  onSwipeUp: (profile: DiscoveryProfile) => void;
  onOpenDetails: (profile: DiscoveryProfile) => void;
  animatingAction: 'like' | 'pass' | 'super' | null;
}

export const DiscoveryCardStack: React.FC<DiscoveryCardStackProps> = ({
  profiles,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onOpenDetails,
  animatingAction,
}) => {
  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  // Dragging state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Reset drag position on card change
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [currentIndex]);

  const DRAG_THRESHOLD = 90; // Pixels to trigger like or pass
  const SUPER_THRESHOLD = -80; // Negative y drag to trigger super-like

  // Mouse / Touch handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (animatingAction) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || animatingAction) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging || animatingAction) return;
    setIsDragging(false);

    if (dragOffset.y < SUPER_THRESHOLD && Math.abs(dragOffset.x) < 50) {
      // Swiped UP -> Super Like
      onSwipeUp(currentProfile);
    } else if (dragOffset.x > DRAG_THRESHOLD) {
      // Swiped RIGHT -> Like
      onSwipeRight(currentProfile);
    } else if (dragOffset.x < -DRAG_THRESHOLD) {
      // Swiped LEFT -> Pass
      onSwipeLeft(currentProfile);
    } else {
      // Return to center
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (!currentProfile) return null;

  // Determine feedback stamp
  let swipeFeedback: 'like' | 'pass' | 'super' | null = null;
  let swipeOpacity = 0;

  if (animatingAction) {
    swipeFeedback = animatingAction;
    swipeOpacity = 1;
  } else if (dragOffset.y < -40 && Math.abs(dragOffset.x) < 50) {
    swipeFeedback = 'super';
    swipeOpacity = Math.min(Math.abs(dragOffset.y) / 70, 1);
  } else if (dragOffset.x > 25) {
    swipeFeedback = 'like';
    swipeOpacity = Math.min(dragOffset.x / DRAG_THRESHOLD, 1);
  } else if (dragOffset.x < -25) {
    swipeFeedback = 'pass';
    swipeOpacity = Math.min(Math.abs(dragOffset.x) / DRAG_THRESHOLD, 1);
  }

  // Calculate card style during drag / programmatic animation
  let cardTransform = '';
  let cardTransition = isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  if (animatingAction === 'like') {
    cardTransform = 'translate(120vw, 40px) rotate(25deg)';
    cardTransition = 'transform 0.4s ease-out, opacity 0.3s ease-out';
  } else if (animatingAction === 'pass') {
    cardTransform = 'translate(-120vw, 40px) rotate(-25deg)';
    cardTransition = 'transform 0.4s ease-out, opacity 0.3s ease-out';
  } else if (animatingAction === 'super') {
    cardTransform = 'translate(0, -120vh) scale(1.1)';
    cardTransition = 'transform 0.4s ease-out, opacity 0.3s ease-out';
  } else if (isDragging) {
    const rotation = dragOffset.x * 0.08;
    cardTransform = `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`;
  }

  return (
    <div className="discovery-card-stack-container">
      {/* NEXT CARD (UNDERNEATH) */}
      {nextProfile && (
        <div className="card-stack-layer card-under">
          <DiscoveryCard
            profile={nextProfile}
            onOpenDetails={() => onOpenDetails(nextProfile)}
            isTopCard={false}
          />
        </div>
      )}

      {/* TOP CARD (ACTIVE) */}
      <div
        ref={cardRef}
        className={`card-stack-layer card-top ${isDragging ? 'is-dragging' : ''}`}
        style={{
          transform: cardTransform,
          transition: cardTransition,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <DiscoveryCard
          profile={currentProfile}
          swipeFeedback={swipeFeedback}
          swipeOpacity={swipeOpacity}
          onOpenDetails={() => onOpenDetails(currentProfile)}
          isTopCard={true}
        />
      </div>
    </div>
  );
};

export default DiscoveryCardStack;
