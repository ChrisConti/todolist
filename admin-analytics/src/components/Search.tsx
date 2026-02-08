import React, { useState } from 'react';
import type { DateRange, PresetRange, BabyStats } from '../types';
import { DateRangeSelector } from './DateRangeSelector';
import { searchBabyById } from '../services/searchService';
import './Search.css';

export const Search: React.FC = () => {
  const [babyId, setBabyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [babyStats, setBabyStats] = useState<BabyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetRange>('7days');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babyId.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setBabyStats(null);

      const stats = await searchBabyById(babyId.trim(), dateRange);
      setBabyStats(stats);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche');
      setBabyStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('fr-FR');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="search">
      <h2>Recherche de bébé</h2>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={babyId}
            onChange={(e) => setBabyId(e.target.value)}
            placeholder="ID du bébé (ex: abc123xyz)"
            className="search-input"
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Recherche...' : '🔍 Rechercher'}
          </button>
        </div>
      </form>

      {error && <div className="error-box">{error}</div>}

      {babyStats && (
        <>
          <div className="baby-info-card">
            <h3>👶 {babyStats.baby.name}</h3>
            <div className="baby-info-grid">
              <div className="info-item">
                <span className="info-label">ID:</span>
                <span className="info-value">{babyStats.baby.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Créé le:</span>
                <span className="info-value">{formatDate(babyStats.baby.CreatedDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Parents:</span>
                <span className="info-value">
                  {babyStats.parentEmails.length > 0
                    ? babyStats.parentEmails.join(', ')
                    : 'Aucun parent associé'}
                </span>
              </div>
            </div>
          </div>

          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              setDateRange(range);
              // Re-trigger search with new date range
              if (babyId.trim()) {
                handleSearch({ preventDefault: () => {} } as React.FormEvent);
              }
            }}
            preset={preset}
            onPresetChange={setPreset}
          />

          <div className="stats-card">
            <h3>📊 Activité totale</h3>
            <div className="total-tasks">{babyStats.totalTasks} tâches</div>
          </div>

          <div className="task-types-grid">
            <div className="task-type-card">
              <div className="task-type-icon">🍼</div>
              <div className="task-type-content">
                <div className="task-type-label">Biberons</div>
                <div className="task-type-value">{babyStats.tasksByType.bottles.count} tâches</div>
                <div className="task-type-detail">
                  {babyStats.tasksByType.bottles.totalMl} ml total
                </div>
              </div>
            </div>

            <div className="task-type-card">
              <div className="task-type-icon">💩</div>
              <div className="task-type-content">
                <div className="task-type-label">Couches</div>
                <div className="task-type-value">{babyStats.tasksByType.diapers.count} tâches</div>
                <div className="task-type-detail">
                  S:{babyStats.tasksByType.diapers.solid} M:{babyStats.tasksByType.diapers.soft} L:
                  {babyStats.tasksByType.diapers.liquid}
                </div>
              </div>
            </div>

            <div className="task-type-card">
              <div className="task-type-icon">😴</div>
              <div className="task-type-content">
                <div className="task-type-label">Sommeils</div>
                <div className="task-type-value">{babyStats.tasksByType.sleep.count} tâches</div>
                <div className="task-type-detail">
                  {formatDuration(babyStats.tasksByType.sleep.totalHours)} total
                </div>
              </div>
            </div>

            <div className="task-type-card">
              <div className="task-type-icon">🤱</div>
              <div className="task-type-content">
                <div className="task-type-label">Allaitement</div>
                <div className="task-type-value">
                  {babyStats.tasksByType.breastfeeding.count} tâches
                </div>
                <div className="task-type-detail">
                  {formatDuration(babyStats.tasksByType.breastfeeding.totalHours)} total
                </div>
              </div>
            </div>

            <div className="task-type-card">
              <div className="task-type-icon">🌡️</div>
              <div className="task-type-content">
                <div className="task-type-label">Températures</div>
                <div className="task-type-value">
                  {babyStats.tasksByType.temperature.count} tâches
                </div>
                <div className="task-type-detail">
                  Moy: {babyStats.tasksByType.temperature.avgTemp.toFixed(1)}°C
                </div>
              </div>
            </div>

            <div className="task-type-card">
              <div className="task-type-icon">💊</div>
              <div className="task-type-content">
                <div className="task-type-label">Santé</div>
                <div className="task-type-value">{babyStats.tasksByType.health.count} tâches</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
