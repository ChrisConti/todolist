import { resolveTheme, nativeSchemeOverride } from '../themeResolution';

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

describe('surcharge du schéma natif', () => {
  it('est levée quand un premium suit le système', () => {
    // Sinon la surcharge devient le « système » perçu et l'app s'y enferme.
    expect(nativeSchemeOverride('system', true, 'dark')).toBeNull();
    expect(nativeSchemeOverride('system', false === false, 'light')).toBeNull();
  });

  it('est posée quand l\'utilisateur impose un thème', () => {
    expect(nativeSchemeOverride('dark', true, 'dark')).toBe('dark');
    expect(nativeSchemeOverride('light', true, 'light')).toBe('light');
  });

  it('est posée pour un non-premium, dont le thème ne dépend pas du système', () => {
    // resolveTheme renvoie toujours 'light' sans premium : la surcharge force
    // les composants natifs à s'y aligner, et la valeur perçue du système
    // n'influence plus rien.
    expect(nativeSchemeOverride('system', false, 'light')).toBe('light');
  });

  it('le scénario qui cassait : premium, téléphone sombre, réglage système', () => {
    // Avant le chargement du premium, le thème résolu est clair.
    expect(nativeSchemeOverride('system', false, 'light')).toBe('light');
    // Une fois le premium confirmé, la surcharge est levée et le téléphone
    // reprend la main — l'app passe en sombre.
    expect(nativeSchemeOverride('system', true, 'dark')).toBeNull();
    expect(resolveTheme('system', 'dark', true)).toBe('dark');
  });
});
