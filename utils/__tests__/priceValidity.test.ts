/**
 * Un prix affichable se reconnaît à la présence d'un chiffre, pas à sa longueur.
 *
 * StoreKit renvoie parfois un code devise nu quand le territoire est mal
 * configuré. La première version filtrait sur `price.length > 5`, ce qui
 * rejetait « $5.99 » et « £5.99 » — cinq caractères, prix parfaitement
 * valides. Tant que le paywall se contentait d'un repli d'affichage, c'était
 * cosmétique. Depuis que le bouton d'achat est désactivé quand le prix n'est
 * pas prêt, tous les marchés anglophones ne pouvaient plus acheter.
 */
const isDisplayablePrice = (price?: string | null): boolean =>
  !!price && /\d/.test(price);

describe('validité d\'un prix renvoyé par le store', () => {
  it.each([
    ['5,99 €',   'France, Allemagne, Espagne'],
    ['$5.99',    'États-Unis — cinq caractères, rejeté par l\'ancien seuil'],
    ['£5.99',    'Royaume-Uni — cinq caractères aussi'],
    ['CA$5.99',  'Canada'],
    ['¥900',     'Japon, sans décimale'],
    ['5,99 zł',  'Pologne'],
  ])('accepte %s (%s)', (price) => {
    expect(isDisplayablePrice(price)).toBe(true);
  });

  it.each([['USD'], ['EUR'], ['GBP'], [''], [null], [undefined]])(
    'rejette %s, qui n\'est pas un prix',
    (price) => {
      expect(isDisplayablePrice(price as any)).toBe(false);
    },
  );

  it('l\'ancien seuil de longueur bloquait bien les marchés anglophones', () => {
    // Trace du défaut, pour qu'un retour en arrière saute aux yeux.
    const oldCheck = (p: string) => p.length > 5;
    expect(oldCheck('$5.99')).toBe(false);
    expect(oldCheck('£5.99')).toBe(false);
    expect(isDisplayablePrice('$5.99')).toBe(true);
  });
});
