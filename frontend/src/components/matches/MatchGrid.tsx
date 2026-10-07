import React from 'react';
import type { MatchItem } from '../../types/match';
import MatchCard from './MatchCard';
import './Matches.css';

interface MatchGridProps {
  matches: MatchItem[];
  onUnmatchClick?: (match: MatchItem) => void;
}

export const MatchGrid: React.FC<MatchGridProps> = ({ matches, onUnmatchClick }) => {
  return (
    <div className="matches-grid">
      {matches.map((match) => (
        <MatchCard
          key={`match-${match.id}`}
          match={match}
          onUnmatchClick={onUnmatchClick}
        />
      ))}
    </div>
  );
};

export default MatchGrid;
