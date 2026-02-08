import React, { useState } from 'react';
import type { DateRange, PresetRange } from '../types';
import { DateRangeSelector } from './DateRangeSelector';
import { exportToExcel } from '../services/exportService';
import './Export.css';

export const Export: React.FC = () => {
  const [preset, setPreset] = useState<PresetRange>('today');
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfToday,
    end: now,
  });
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeBabies, setIncludeBabies] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!includeUsers && !includeBabies && !includeTasks) {
      setError('Veuillez sélectionner au moins un type de données à exporter');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await exportToExcel({
        dateRange,
        includeUsers,
        includeBabies,
        includeTasks,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export">
      <h2>Export de données</h2>

      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      <div className="export-card">
        <h3>Type de données</h3>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeUsers}
              onChange={(e) => setIncludeUsers(e.target.checked)}
            />
            <span>Utilisateurs</span>
            <p className="checkbox-hint">
              Emails, noms d'utilisateur, dates de création
            </p>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeBabies}
              onChange={(e) => setIncludeBabies(e.target.checked)}
            />
            <span>Bébés</span>
            <p className="checkbox-hint">
              Noms, dates de création, nombre de tâches, parents associés
            </p>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeTasks}
              onChange={(e) => setIncludeTasks(e.target.checked)}
            />
            <span>Tâches</span>
            <p className="checkbox-hint">
              Toutes les tâches (biberons, couches, sommeils, etc.)
            </p>
          </label>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button
          onClick={handleExport}
          disabled={loading}
          className="export-button"
        >
          {loading ? 'Export en cours...' : '📥 Télécharger l\'export Excel'}
        </button>

        <div className="export-info">
          <h4>Format de l'export</h4>
          <ul>
            <li>Format: Excel (.xlsx)</li>
            <li>Données filtrées par période de création</li>
            <li>Un onglet par type de données</li>
            <li>Conforme RGPD - Données en lecture seule</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
