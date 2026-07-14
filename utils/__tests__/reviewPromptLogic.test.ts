import {
  initialReviewPromptState,
  migrateLegacyState,
  parseReviewPromptState,
  shouldShowPrompt,
  recordPromptShown,
  recordOutcome,
  consumedInWindow,
  DAY_MS,
  ReviewPromptState,
} from '../reviewPromptLogic';

const NOW = new Date('2026-07-14T10:00:00Z').getTime();
const days = (n: number) => n * DAY_MS;

describe('reviewPromptLogic', () => {
  describe('premier prompt', () => {
    it('ne se déclenche pas avant 3 tâches', () => {
      const state = initialReviewPromptState();
      expect(shouldShowPrompt(state, 1, NOW)).toBe(false);
      expect(shouldShowPrompt(state, 2, NOW)).toBe(false);
    });

    it('se déclenche à la 3e tâche', () => {
      expect(shouldShowPrompt(initialReviewPromptState(), 3, NOW)).toBe(true);
    });
  });

  describe('espacement', () => {
    it('impose 7 jours minimum entre deux prompts', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'dismissed', NOW);
      expect(shouldShowPrompt(state, 50, NOW + days(6))).toBe(false);
      expect(shouldShowPrompt(state, 50, NOW + days(8))).toBe(true);
    });

    it('exige +10 tâches après un dismiss', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'dismissed', NOW);
      expect(shouldShowPrompt(state, 12, NOW + days(8))).toBe(false);
      expect(shouldShowPrompt(state, 13, NOW + days(8))).toBe(true);
    });

    it('exige +10 tâches après un prompt sans réponse (app tuée)', () => {
      const state = recordPromptShown(initialReviewPromptState(), 3, NOW); // outcome reste 'pending'
      expect(shouldShowPrompt(state, 12, NOW + days(8))).toBe(false);
      expect(shouldShowPrompt(state, 13, NOW + days(8))).toBe(true);
    });
  });

  describe('fenêtre glissante 365 jours', () => {
    const consumedState = (timestamps: number[]): ReviewPromptState => ({
      ...initialReviewPromptState(),
      consumedAt: timestamps,
      lastPromptAt: Math.max(...timestamps),
      lastPromptAtCount: 10,
      lastPromptOutcome: 'dismissed',
    });

    it('bloque après 3 prompts consommés dans la fenêtre', () => {
      const state = consumedState([NOW - days(300), NOW - days(200), NOW - days(100)]);
      expect(shouldShowPrompt(state, 100, NOW)).toBe(false);
    });

    it('débloque quand un prompt sort de la fenêtre', () => {
      const state = consumedState([NOW - days(370), NOW - days(200), NOW - days(100)]);
      expect(consumedInWindow(state, NOW)).toBe(2);
      expect(shouldShowPrompt(state, 100, NOW)).toBe(true);
    });

    it('un dismiss ne consomme pas de prompt', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'dismissed', NOW);
      expect(consumedInWindow(state, NOW)).toBe(0);
    });

    it('prune les timestamps expirés au moment du recordOutcome', () => {
      let state = consumedState([NOW - days(400), NOW - days(380)]);
      state = recordOutcome(state, 'yes', NOW);
      expect(state.consumedAt).toEqual([NOW]);
    });
  });

  describe('sentiment oui', () => {
    it('applique un cooldown de 6 mois puis exige +25 tâches', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'yes', NOW);
      expect(shouldShowPrompt(state, 100, NOW + days(170))).toBe(false);
      expect(shouldShowPrompt(state, 27, NOW + days(181))).toBe(false); // +24 tâches
      expect(shouldShowPrompt(state, 28, NOW + days(181))).toBe(true); // +25 tâches
    });
  });

  describe('sentiment non', () => {
    it('bloque 90 jours après un premier non', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'no', NOW);
      expect(shouldShowPrompt(state, 100, NOW + days(89))).toBe(false);
      expect(shouldShowPrompt(state, 100, NOW + days(91))).toBe(true);
    });

    it('stop définitif après deux non', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'no', NOW);
      state = recordPromptShown(state, 100, NOW + days(91));
      state = recordOutcome(state, 'no', NOW + days(91));
      expect(shouldShowPrompt(state, 1000, NOW + days(1000))).toBe(false);
    });
  });

  describe('migration legacy', () => {
    it('re-sollicite un ancien utilisateur après +25 tâches, sans blocage 365j', () => {
      const state = migrateLegacyState(53);
      expect(shouldShowPrompt(state, 77, NOW)).toBe(false); // +24
      expect(shouldShowPrompt(state, 78, NOW)).toBe(true); // +25
    });

    it('utilisateur legacy jamais prompté = comportement premier prompt', () => {
      const state = migrateLegacyState(0);
      expect(shouldShowPrompt(state, 3, NOW)).toBe(true);
    });
  });

  describe('parseReviewPromptState', () => {
    it('rejette null, JSON invalide et structures inattendues', () => {
      expect(parseReviewPromptState(null)).toBeNull();
      expect(parseReviewPromptState('not json')).toBeNull();
      expect(parseReviewPromptState('{"foo":1}')).toBeNull();
      expect(parseReviewPromptState('42')).toBeNull();
    });

    it('complète les champs manquants avec les valeurs par défaut', () => {
      const parsed = parseReviewPromptState('{"consumedAt":[123]}');
      expect(parsed).toMatchObject({ consumedAt: [123], noCount: 0, lastPromptOutcome: 'pending' });
    });

    it('round-trip avec un état réel', () => {
      let state = recordPromptShown(initialReviewPromptState(), 3, NOW);
      state = recordOutcome(state, 'yes', NOW);
      expect(parseReviewPromptState(JSON.stringify(state))).toEqual(state);
    });
  });
});
