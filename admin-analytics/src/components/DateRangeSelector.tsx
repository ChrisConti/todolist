import React from 'react';
import type { DateRange, PresetRange } from '../types';
import './DateRangeSelector.css';

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset: PresetRange;
  onPresetChange: (preset: PresetRange) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  preset,
  onPresetChange,
}) => {
  const handlePresetChange = (newPreset: PresetRange) => {
    onPresetChange(newPreset);

    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    let start: Date;

    switch (newPreset) {
      case 'today':
        // Filter for today only (00:00 to 23:59)
        start = new Date();
        start.setHours(0, 0, 0, 0); // Start of today
        const endToday = new Date();
        endToday.setHours(23, 59, 59, 999); // End of today
        onDateRangeChange({ start, end: endToday });
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0); // Start of yesterday
        const endYesterday = new Date(start);
        endYesterday.setHours(23, 59, 59, 999); // End of yesterday
        onDateRangeChange({ start, end: endYesterday });
        break;
      case 'all':
        // No date restriction
        onDateRangeChange({ start: null, end: null });
        break;
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        onDateRangeChange({ start, end: now });
        break;
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        onDateRangeChange({ start, end: now });
        break;
      case '3months':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        onDateRangeChange({ start, end: now });
        break;
      case 'custom':
        return; // Don't auto-set dates for custom
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    const newDate = new Date(value);
    if (type === 'end') {
      newDate.setHours(23, 59, 59, 999);
    } else {
      newDate.setHours(0, 0, 0, 0);
    }
    onDateRangeChange({
      ...dateRange,
      [type]: newDate,
    });
  };

  return (
    <div className="date-range-selector">
      <div className="preset-buttons">
        <button
          className={`preset-btn ${preset === 'today' ? 'active' : ''}`}
          onClick={() => handlePresetChange('today')}
        >
          Aujourd'hui
        </button>
        <button
          className={`preset-btn ${preset === 'yesterday' ? 'active' : ''}`}
          onClick={() => handlePresetChange('yesterday')}
        >
          Hier
        </button>
        <button
          className={`preset-btn ${preset === 'all' ? 'active' : ''}`}
          onClick={() => handlePresetChange('all')}
        >
          Toute la base
        </button>
        <button
          className={`preset-btn ${preset === '7days' ? 'active' : ''}`}
          onClick={() => handlePresetChange('7days')}
        >
          7 derniers jours
        </button>
        <button
          className={`preset-btn ${preset === '30days' ? 'active' : ''}`}
          onClick={() => handlePresetChange('30days')}
        >
          30 derniers jours
        </button>
        <button
          className={`preset-btn ${preset === '3months' ? 'active' : ''}`}
          onClick={() => handlePresetChange('3months')}
        >
          3 derniers mois
        </button>
        <button
          className={`preset-btn ${preset === 'custom' ? 'active' : ''}`}
          onClick={() => handlePresetChange('custom')}
        >
          Personnalisé
        </button>
      </div>

      {preset === 'custom' && (
        <div className="custom-date-inputs">
          <div className="date-input-group">
            <label>Du</label>
            <input
              type="date"
              value={formatDate(dateRange.start)}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label>Au</label>
            <input
              type="date"
              value={formatDate(dateRange.end)}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
