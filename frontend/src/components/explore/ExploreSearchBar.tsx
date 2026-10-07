import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2, Users, FileText, PlaySquare, Hash, Tag, Sparkles } from 'lucide-react';
import type { SearchType, SearchHistoryItem } from '../../types/explore';

interface ExploreSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  activeType: SearchType;
  onTypeChange: (type: SearchType) => void;
  history: SearchHistoryItem[];
  onSelectHistory: (item: SearchHistoryItem) => void;
  onRemoveHistory: (id: number) => void;
  onClearHistory: () => void;
  isLoading?: boolean;
}

const CATEGORIES: Array<{ type: SearchType; label: string; icon: React.ReactNode }> = [
  { type: 'all', label: 'All', icon: <Sparkles size={14} /> },
  { type: 'people', label: 'People', icon: <Users size={14} /> },
  { type: 'posts', label: 'Posts', icon: <FileText size={14} /> },
  { type: 'stories', label: 'Stories', icon: <PlaySquare size={14} /> },
  { type: 'hashtags', label: 'Hashtags', icon: <Hash size={14} /> },
  { type: 'interests', label: 'Interests', icon: <Tag size={14} /> },
];

export const ExploreSearchBar: React.FC<ExploreSearchBarProps> = ({
  value,
  onChange,
  activeType,
  onTypeChange,
  history,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  isLoading,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showHistory = isFocused && !value.trim() && history.length > 0;

  return (
    <div className="explore-search-container" ref={containerRef}>
      {/* Search Input Bar */}
      <div className={`explore-search-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <Search size={20} className="explore-search-icon" />
        <input
          type="text"
          className="explore-search-input"
          placeholder="Search people, posts, hashtags..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          aria-label="Search Connectly"
        />

        {isLoading && <span className="explore-search-spinner" aria-label="Searching..." />}

        {value && !isLoading && (
          <button
            type="button"
            className="explore-search-clear-btn"
            onClick={() => {
              onChange('');
              setIsFocused(true);
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search History Dropdown */}
      {showHistory && (
        <div className="explore-search-history-dropdown glass-panel">
          <div className="history-header">
            <span className="history-title">Recent Searches</span>
            <button
              type="button"
              className="history-clear-all-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClearHistory();
              }}
            >
              <Trash2 size={12} /> Clear all
            </button>
          </div>
          <div className="history-items-list">
            {history.map((item) => (
              <div
                key={item.id}
                className="history-item-row"
                onClick={() => {
                  onSelectHistory(item);
                  setIsFocused(false);
                }}
              >
                <div className="history-item-left">
                  <Clock size={14} className="history-clock-icon" />
                  <span className="history-query-text">{item.query}</span>
                  {item.searchType !== 'all' && (
                    <span className="history-type-tag">{item.searchType}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="history-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveHistory(item.id);
                  }}
                  aria-label={`Remove ${item.query} from history`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Pills Navigation */}
      <div className="explore-category-pills">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            type="button"
            className={`category-pill ${activeType === cat.type ? 'active' : ''}`}
            onClick={() => onTypeChange(cat.type)}
          >
            <span className="pill-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
