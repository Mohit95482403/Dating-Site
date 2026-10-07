import React, { useState } from 'react';
import type { DiscoveryFiltersState } from '../../types/discovery';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import './Discovery.css';

interface DiscoveryFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: DiscoveryFiltersState;
  onApplyFilters: (filters: DiscoveryFiltersState) => void;
  onResetFilters: () => void;
}

export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [minAge, setMinAge] = useState<number>(currentFilters.minAge ?? 18);
  const [maxAge, setMaxAge] = useState<number>(currentFilters.maxAge ?? 60);
  const [gender, setGender] = useState<DiscoveryFiltersState['gender']>(
    currentFilters.gender ?? 'all'
  );
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(
    currentFilters.maxDistanceKm ?? 50
  );

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      minAge,
      maxAge: Math.max(minAge, maxAge),
      gender,
      maxDistanceKm,
    });
    onClose();
  };

  const handleReset = () => {
    setMinAge(18);
    setMaxAge(60);
    setGender('all');
    setMaxDistanceKm(50);
    onResetFilters();
    onClose();
  };

  return (
    <div className="filters-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className="filters-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="filters-header">
          <div className="filters-header-title">
            <SlidersHorizontal size={20} className="filters-icon" />
            <h2 id="filters-title" className="filters-title">Discovery Preferences</h2>
          </div>
          <button
            type="button"
            className="filters-close-btn"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleApply} className="filters-form">
          {/* GENDER PREFERENCE */}
          <div className="filter-group">
            <label className="filter-label">Show Me</label>
            <div className="filter-gender-toggle-group">
              {[
                { id: 'all', label: 'Everyone' },
                { id: 'female', label: 'Women' },
                { id: 'male', label: 'Men' },
                { id: 'non_binary', label: 'Non-binary' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`gender-toggle-btn ${gender === item.id ? 'active' : ''}`}
                  onClick={() => setGender(item.id as any)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* AGE RANGE SLIDER */}
          <div className="filter-group">
            <div className="filter-label-row">
              <label className="filter-label">Age Range</label>
              <span className="filter-val-badge">
                {minAge} – {maxAge} years
              </span>
            </div>
            <div className="dual-slider-container">
              <div className="range-row">
                <span className="range-subtext">Min: {minAge}</span>
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={minAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinAge(Math.min(val, maxAge));
                  }}
                  className="filter-slider"
                />
              </div>
              <div className="range-row">
                <span className="range-subtext">Max: {maxAge}</span>
                <input
                  type="range"
                  min="18"
                  max="80"
                  value={maxAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMaxAge(Math.max(val, minAge));
                  }}
                  className="filter-slider"
                />
              </div>
            </div>
          </div>

          {/* DISTANCE SLIDER */}
          <div className="filter-group">
            <div className="filter-label-row">
              <label className="filter-label">Maximum Distance</label>
              <span className="filter-val-badge">{maxDistanceKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="filter-slider"
            />
          </div>

          {/* BUTTON ACTIONS */}
          <div className="filters-footer">
            <button
              type="button"
              className="filters-reset-btn"
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              type="submit"
              className="filters-apply-btn"
            >
              <Check size={18} />
              Apply Filters
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscoveryFilters;
