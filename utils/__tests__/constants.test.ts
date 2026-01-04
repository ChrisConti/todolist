import { VALIDATION, COLLECTIONS, REVIEW_PROMPT } from '../constants';

describe('Constants', () => {
  describe('VALIDATION', () => {
    it('should have correct validation rules', () => {
      expect(VALIDATION.MIN_NAME_LENGTH).toBe(2);
      expect(VALIDATION.MIN_BIRTHDATE_LENGTH).toBe(8);
      expect(VALIDATION.BIRTHDATE_FORMAT).toBe('DD/MM/YYYY');
      expect(VALIDATION.BIRTHDATE_REGEX).toBeInstanceOf(RegExp);
    });

    it('should validate dates correctly with regex', () => {
      expect(VALIDATION.BIRTHDATE_REGEX.test('01/01/2024')).toBe(true);
      expect(VALIDATION.BIRTHDATE_REGEX.test('31/12/2023')).toBe(true);
      expect(VALIDATION.BIRTHDATE_REGEX.test('2024-01-01')).toBe(false);
      expect(VALIDATION.BIRTHDATE_REGEX.test('32/01/2024')).toBe(false);
      expect(VALIDATION.BIRTHDATE_REGEX.test('01/13/2024')).toBe(false);
    });
  });

  describe('COLLECTIONS', () => {
    it('should have correct collection names', () => {
      expect(COLLECTIONS.USERS).toBe('Users');
      expect(COLLECTIONS.BABY).toBe('Baby');
    });
  });
});
