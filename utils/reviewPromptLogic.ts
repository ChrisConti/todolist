// Logique pure du review prompt (sentiment gate) — testable sans AsyncStorage ni React.
// Règles :
// - max 3 prompts "consommés" (réponse oui ou non) par fenêtre glissante de 365 jours
// - 1er prompt à la 3e tâche ; ensuite +10 tâches après un dismiss/sans réponse, +25 après une réponse
// - minimum 7 jours entre deux prompts
// - "oui" → cooldown 6 mois ; "non" → un seul retry à 90 jours, stop définitif au 2e "non"
// Un dismiss (ou une modale jamais vue : app tuée, transition d'écran) ne consomme pas de prompt.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_CONSUMED_PER_YEAR = 3;
export const ROLLING_WINDOW_MS = 365 * DAY_MS;
export const YES_COOLDOWN_MS = 180 * DAY_MS;
export const NO_RETRY_MS = 90 * DAY_MS;
export const MAX_NO_COUNT = 2;
export const MIN_MS_BETWEEN_PROMPTS = 7 * DAY_MS;
export const FIRST_PROMPT_TASK_COUNT = 3;
export const TASKS_AFTER_DISMISS = 10;
export const TASKS_AFTER_ANSWER = 25;

export type PromptOutcome = 'pending' | 'yes' | 'no' | 'dismissed';

export interface ReviewPromptState {
  /** Timestamps (ms) des prompts ayant reçu une réponse oui/non — fenêtre glissante 365j */
  consumedAt: number[];
  /** Timestamp (ms) du dernier prompt affiché, répondu ou non */
  lastPromptAt: number | null;
  /** Compteur de tâches au moment du dernier prompt */
  lastPromptAtCount: number;
  lastPromptOutcome: PromptOutcome;
  yesAt: number | null;
  noAt: number | null;
  noCount: number;
}

export const initialReviewPromptState = (): ReviewPromptState => ({
  consumedAt: [],
  lastPromptAt: null,
  lastPromptAtCount: 0,
  lastPromptOutcome: 'pending',
  yesAt: null,
  noAt: null,
  noCount: 0,
});

export const consumedInWindow = (state: ReviewPromptState, now: number): number =>
  state.consumedAt.filter(t => now - t < ROLLING_WINDOW_MS).length;

export function shouldShowPrompt(state: ReviewPromptState, taskCount: number, now: number): boolean {
  if (state.noCount >= MAX_NO_COUNT) return false;
  if (state.noAt !== null && now - state.noAt < NO_RETRY_MS) return false;
  if (state.yesAt !== null && now - state.yesAt < YES_COOLDOWN_MS) return false;
  if (consumedInWindow(state, now) >= MAX_CONSUMED_PER_YEAR) return false;
  if (state.lastPromptAt !== null && now - state.lastPromptAt < MIN_MS_BETWEEN_PROMPTS) return false;

  if (state.lastPromptAt === null && state.lastPromptAtCount === 0) {
    return taskCount >= FIRST_PROMPT_TASK_COUNT;
  }

  const tasksSinceLastPrompt = taskCount - state.lastPromptAtCount;
  const answered = state.lastPromptOutcome === 'yes' || state.lastPromptOutcome === 'no';
  return tasksSinceLastPrompt >= (answered ? TASKS_AFTER_ANSWER : TASKS_AFTER_DISMISS);
}

export function recordPromptShown(state: ReviewPromptState, taskCount: number, now: number): ReviewPromptState {
  return { ...state, lastPromptAt: now, lastPromptAtCount: taskCount, lastPromptOutcome: 'pending' };
}

export function recordOutcome(state: ReviewPromptState, outcome: 'yes' | 'no' | 'dismissed', now: number): ReviewPromptState {
  const next: ReviewPromptState = { ...state, lastPromptOutcome: outcome };
  if (outcome === 'dismissed') return next;

  // Prune les timestamps hors fenêtre pour ne pas grossir indéfiniment
  next.consumedAt = [...state.consumedAt.filter(t => now - t < ROLLING_WINDOW_MS), now];
  if (outcome === 'yes') next.yesAt = now;
  if (outcome === 'no') {
    next.noAt = now;
    next.noCount = state.noCount + 1;
  }
  return next;
}

/**
 * Migration depuis l'ancien système (promptCount à vie + lastPromptAtCount).
 * Choix délibéré : on ne convertit pas les anciens prompts en prompts consommés —
 * l'objectif du changement est de re-solliciter la base historique. Les garde-fous
 * (espacement 7j, +25 tâches depuis lastPromptAtCount, quota natif Apple) suffisent.
 */
export function migrateLegacyState(legacyLastPromptAtCount: number): ReviewPromptState {
  return {
    ...initialReviewPromptState(),
    lastPromptAtCount: legacyLastPromptAtCount,
    // 'yes' → exige +25 tâches depuis le dernier prompt legacy (et non +10)
    lastPromptOutcome: legacyLastPromptAtCount > 0 ? 'yes' : 'pending',
  };
}

export function parseReviewPromptState(json: string | null): ReviewPromptState | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || !Array.isArray(raw.consumedAt)) return null;
    return { ...initialReviewPromptState(), ...raw };
  } catch {
    return null;
  }
}
