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
