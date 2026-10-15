import { resolveTheme } from '../themeResolution';

describe('resolveTheme', () => {
  describe('sans premium — le droit prime sur tout', () => {
    it('reste clair même si le téléphone est en sombre', () => {
      expect(resolveTheme('system', 'dark', false)).toBe('light');
    });

    it('reste clair même si « sombre » avait été choisi du temps du premium', () => {
      expect(resolveTheme('dark', 'dark', false)).toBe('light');
    });
  });

  describe('avec premium', () => {
    it('suit le téléphone en mode système', () => {
      expect(resolveTheme('system', 'dark', true)).toBe('dark');
      expect(resolveTheme('system', 'light', true)).toBe('light');
    });

    it('force le sombre malgré un téléphone clair', () => {
      expect(resolveTheme('dark', 'light', true)).toBe('dark');
    });

    it('force le clair malgré un téléphone sombre', () => {
      expect(resolveTheme('light', 'dark', true)).toBe('light');
    });
  });

  describe('réglage système indisponible', () => {
    it('retombe sur le clair plutôt que de deviner', () => {
      expect(resolveTheme('system', null, true)).toBe('light');
      expect(resolveTheme('system', undefined, true)).toBe('light');
    });
  });
});

/**
 * Le droit au sombre ne doit jamais survivre à une réponse négative du serveur.
 *
 * ThemeContext applique un premium « optimiste » pendant l'hydratation, pour
 * éviter un flash clair à un premium qui était en sombre au lancement
 * précédent. Une première version ne le révoquait que si la session avait vu
 * passer un isPremium à true : un premium remboursé, ou un document Users pas
 * encore synchronisé, gardait donc le sombre indéfiniment.
 *
 * On reproduit ici la règle de révocation telle que le contexte l'applique.
 */
describe('révocation du premium optimiste', () => {
  /** Reproduit l'effet de ThemeContext : la réponse fait foi dans les deux sens. */
  const settle = (optimistic: boolean, isPremium: boolean, loading: boolean) =>
    loading ? optimistic : isPremium;

  it('garde l\'optimisme tant que le serveur n\'a pas répondu', () => {
    expect(settle(true, false, true)).toBe(true);
  });

  it('révoque dès que le serveur répond non, même sans oui préalable', () => {
    // Le cas du remboursement, et celui du document pas encore synchronisé.
    expect(settle(true, false, false)).toBe(false);
  });

  it('confirme quand le serveur répond oui', () => {
    expect(settle(false, true, false)).toBe(true);
  });

  it('une fois révoqué, le sombre n\'est plus résolvable', () => {
    const canUseDarkMode = settle(true, false, false);
    expect(resolveTheme('dark', 'dark', canUseDarkMode)).toBe('light');
  });
});
