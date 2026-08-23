const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY;
const SECRET_KEY = import.meta.env.VITE_AMPLITUDE_SECRET_KEY;
// Projet hébergé en résidence de données EU — le endpoint US renvoie 403 "Invalid API Key"
const BASE_URL = 'https://analytics.eu.amplitude.com/api/2';

export interface ReviewFunnelData {
  promptShown: number;
  sentimentYes: number;
  sentimentNo: number;
  sentimentDismissed: number;
  writeClicked: number;
  reviewDismissed: number;
}

function toAmplitudeDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function getEventTotal(eventName: string, start: string, end: string): Promise<number> {
  if (!API_KEY || !SECRET_KEY) throw new Error('Amplitude credentials missing');

  const e = encodeURIComponent(JSON.stringify({ event_type: eventName }));
  const url = `${BASE_URL}/events/segmentation?e=${e}&start=${start}&end=${end}&m=totals`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${API_KEY}:${SECRET_KEY}`)}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amplitude ${res.status}: ${text}`);
  }

  const json = await res.json();
  const series: number[] = json.data?.series?.[0] ?? [];
  return series.reduce((sum, v) => sum + (v || 0), 0);
}

export async function getReviewFunnel(
  startDate: Date | null,
  endDate: Date | null
): Promise<ReviewFunnelData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const start = toAmplitudeDate(startDate ?? thirtyDaysAgo);
  const end = toAmplitudeDate(endDate ?? now);

  const [promptShown, sentimentYes, sentimentNo, sentimentDismissed, writeClicked, reviewDismissed] =
    await Promise.all([
      getEventTotal('review_prompt_shown', start, end),
      getEventTotal('review_sentiment_yes', start, end),
      getEventTotal('review_sentiment_no', start, end),
      getEventTotal('review_sentiment_dismissed', start, end),
      getEventTotal('review_write_clicked', start, end),
      getEventTotal('review_prompt_dismissed', start, end),
    ]);

  return { promptShown, sentimentYes, sentimentNo, sentimentDismissed, writeClicked, reviewDismissed };
}
