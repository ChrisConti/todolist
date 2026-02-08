import React, { useState, useEffect } from 'react';
import type { DateRange, PresetRange } from '../types';
import { DateRangeSelector } from './DateRangeSelector';
import { getAnalyticsMetrics } from '../services/analyticsService';
import './Funnel.css';

export const Funnel: React.FC = () => {
  const [preset, setPreset] = useState<PresetRange>('today');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsMetrics(dateRange);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return (
      <div className="funnel">
        <h2>Funnel d'engagement</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
        />
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  const totalAccounts = metrics?.totalAccounts || 0;
  const totalBabies = metrics?.totalBabies || 0;
  const babiesWithMoreThan1Task = metrics?.babiesWithMoreThan1Task || 0;
  const babiesWithMoreThan5Tasks = metrics?.babiesWithMoreThan5Tasks || 0;
  const babiesWithMoreThan30Tasks = metrics?.babiesWithMoreThan30Tasks || 0;
  const babiesWithMoreThan100Tasks = metrics?.babiesWithMoreThan100Tasks || 0;

  return (
    <div className="funnel">
      <h2>Funnel d'engagement</h2>

      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      <div className="funnel-grid">
        <div className="funnel-step-card">
          <div className="step-number">1</div>
          <div className="step-title">Comptes créés</div>
          <div className="step-value">{totalAccounts}</div>
          <div className="step-percentage">100%</div>
        </div>

        <div className="funnel-arrow-right">→</div>

        <div className="funnel-step-card">
          <div className="step-number">2</div>
          <div className="step-title">Bébés créés</div>
          <div className="step-value">{totalBabies}</div>
          <div className="step-percentage">
            {calculatePercentage(totalBabies, totalAccounts)}%
          </div>
        </div>

        <div className="funnel-arrow-right">→</div>

        <div className="funnel-step-card success">
          <div className="step-number">3</div>
          <div className="step-title">&gt; 1 tâche</div>
          <div className="step-value">{babiesWithMoreThan1Task}</div>
          <div className="step-percentage">
            {calculatePercentage(babiesWithMoreThan1Task, totalBabies)}%
          </div>
        </div>

        <div className="funnel-arrow-right">→</div>

        <div className="funnel-step-card success">
          <div className="step-number">4</div>
          <div className="step-title">&gt; 5 tâches</div>
          <div className="step-value">{babiesWithMoreThan5Tasks}</div>
          <div className="step-percentage">
            {calculatePercentage(babiesWithMoreThan5Tasks, babiesWithMoreThan1Task)}%
          </div>
        </div>

        <div className="funnel-arrow-right">→</div>

        <div className="funnel-step-card success">
          <div className="step-number">5</div>
          <div className="step-title">&gt; 30 tâches</div>
          <div className="step-value">{babiesWithMoreThan30Tasks}</div>
          <div className="step-percentage">
            {calculatePercentage(babiesWithMoreThan30Tasks, babiesWithMoreThan5Tasks)}%
          </div>
        </div>

        <div className="funnel-arrow-right">→</div>

        <div className="funnel-step-card success">
          <div className="step-number">6</div>
          <div className="step-title">&gt; 100 tâches</div>
          <div className="step-value">{babiesWithMoreThan100Tasks}</div>
          <div className="step-percentage">
            {calculatePercentage(babiesWithMoreThan100Tasks, babiesWithMoreThan30Tasks)}%
          </div>
        </div>
      </div>

      <div className="funnel-stats-compact">
        <div className="stat-compact">
          <span className="stat-label">Taux de création de bébé:</span>
          <span className="stat-value">{calculatePercentage(totalBabies, totalAccounts)}%</span>
        </div>
        <div className="stat-compact">
          <span className="stat-label">Activation (&gt;1 tâche):</span>
          <span className="stat-value">
            {totalBabies > 0 ? calculatePercentage(babiesWithMoreThan1Task, totalBabies) : 0}%
          </span>
        </div>
        <div className="stat-compact">
          <span className="stat-label">Utilisateurs actifs (&gt;30 tâches):</span>
          <span className="stat-value">
            {totalBabies > 0 ? calculatePercentage(babiesWithMoreThan30Tasks, totalBabies) : 0}%
          </span>
        </div>
        <div className="stat-compact">
          <span className="stat-label">Power users (&gt;100 tâches):</span>
          <span className="stat-value">
            {totalBabies > 0 ? calculatePercentage(babiesWithMoreThan100Tasks, totalBabies) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};
