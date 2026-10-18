import { compareVersions, customMessageFor, isUpdateRequired, minVersionFor, parseVersion } from '../appVersion';

describe('parseVersion', () => {
  it('complète les segments manquants', () => {
    expect(parseVersion('1.3')).toEqual([1, 3, 0]);
    expect(parseVersion('2')).toEqual([2, 0, 0]);
    expect(parseVersion(' 1.3.6 ')).toEqual([1, 3, 6]);
  });

  it('refuse ce qui n’est pas une version numérique', () => {
    for (const value of ['', 'abc', '1.3.6-beta', '1..3', '1.2.3.4', 'v1.3.6', undefined, null, 136, {}]) {
      expect(parseVersion(value)).toBeNull();
    }
  });
});

describe('compareVersions', () => {
  it('compare numériquement, pas alphabétiquement', () => {
    expect(compareVersions([1, 10, 0], [1, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([1, 3, 10], [1, 3, 9])).toBeGreaterThan(0);
    expect(compareVersions([2, 0, 0], [1, 99, 99])).toBeGreaterThan(0);
    expect(compareVersions([1, 3, 6], [1, 3, 6])).toBe(0);
  });
});

describe('isUpdateRequired', () => {
  it('bloque une version strictement inférieure au minimum', () => {
    expect(isUpdateRequired('1.3.5', '1.3.6')).toBe(true);
    expect(isUpdateRequired('1.2.2', '1.3.6')).toBe(true);
    expect(isUpdateRequired('1.9.0', '1.10.0')).toBe(true);
  });

  it('laisse passer la version minimale elle-même et les plus récentes', () => {
    expect(isUpdateRequired('1.3.6', '1.3.6')).toBe(false);
    expect(isUpdateRequired('1.3.6', '1.3')).toBe(false);
    expect(isUpdateRequired('1.10.0', '1.9.9')).toBe(false);
  });

  it('ne bloque jamais en cas de doute', () => {
    expect(isUpdateRequired('1.3.5', undefined)).toBe(false);
    expect(isUpdateRequired('1.3.5', '')).toBe(false);
    expect(isUpdateRequired('1.3.5', 'n/a')).toBe(false);
    expect(isUpdateRequired('1.3.5', 2)).toBe(false);
    expect(isUpdateRequired(undefined, '9.9.9')).toBe(false);
  });
});

describe('minVersionFor', () => {
  const config = { minVersionIos: '1.3.7', minVersionAndroid: '1.3.6' };

  it('lit le champ de la plateforme courante', () => {
    expect(minVersionFor(config, 'ios')).toBe('1.3.7');
    expect(minVersionFor(config, 'android')).toBe('1.3.6');
  });

  it('ne bloque pas les autres plateformes', () => {
    expect(minVersionFor(config, 'web')).toBeUndefined();
  });

  it('ne renvoie rien sans document', () => {
    expect(minVersionFor(undefined, 'ios')).toBeUndefined();
  });
});

describe('customMessageFor', () => {
  const config = { messageFr: 'Correctif important', messageEn: 'Important fix', messageEs: '  ' };

  it('prend le message de la langue de l’app, y compris avec une région', () => {
    expect(customMessageFor(config, 'fr')).toBe('Correctif important');
    expect(customMessageFor(config, 'en-US')).toBe('Important fix');
  });

  it("n'affiche rien plutôt qu'un message dans une autre langue", () => {
    expect(customMessageFor(config, 'es')).toBeNull();
    expect(customMessageFor({ messageFr: 'Correctif' }, 'en')).toBeNull();
    expect(customMessageFor(config, 'de')).toBeNull();
    expect(customMessageFor(undefined, 'fr')).toBeNull();
  });
});
