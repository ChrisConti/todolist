import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function computeTimeAgo(date: Date, t: any): string {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return t('timeAgo.now');
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return t('timeAgo.minutes', { count: diffMinutes });
  const totalHours = Math.floor(diffMinutes / 60);
  if (totalHours < 24) {
    const minutes = diffMinutes % 60;
    if (minutes === 0) return t('timeAgo.hours', { count: totalHours });
    return t('timeAgo.hoursMinutes', { hours: totalHours, minutes });
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (hours === 0) return t('timeAgo.days', { count: days });
  return t('timeAgo.daysHours', { days, hours });
}

export function useTimeAgo(date: Date | string): string {
  const { t } = useTranslation();
  const parsed = date instanceof Date ? date : new Date(date);

  const [label, setLabel] = useState(() => computeTimeAgo(parsed, t));

  useEffect(() => {
    const diffSeconds = Math.floor((Date.now() - parsed.getTime()) / 1000);
    const interval = diffSeconds < 3600 ? 60_000 : diffSeconds < 86400 ? 300_000 : 3_600_000;

    const id = setInterval(() => {
      setLabel(computeTimeAgo(parsed, t));
    }, interval);

    return () => clearInterval(id);
  }, [parsed.getTime()]);

  return label;
}
