import { validateBabyName, validateBirthdate, formatBirthdateInput } from '../validation';

describe('validateBabyName', () => {
  const mockT = (key: string) => {
    const translations: { [key: string]: string } = {
      'error.nameMinLength': 'Le nom doit contenir au moins 2 caractères',
    };
    return translations[key] || key;
  };

  it('should validate a correct name', () => {
    const result = validateBabyName('Emma', mockT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty name', () => {
    const result = validateBabyName('', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
  });

  it('should reject name with only spaces', () => {
    const result = validateBabyName('   ', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
  });

  it('should reject name with 1 character', () => {
    const result = validateBabyName('A', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Le nom doit contenir au moins 2 caractères');
  });

  it('should accept name with 2 characters', () => {
    const result = validateBabyName('Ab', mockT);
    expect(result.isValid).toBe(true);
  });

  it('should work without translation function', () => {
    const result = validateBabyName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Name must be at least');
  });
});

describe('validateBirthdate', () => {
  const mockT = (key: string) => {
    const translations: { [key: string]: string } = {
      'error.birthdateRequired': 'La date de naissance est requise',
      'error.birthdateInvalidFormat': 'La date de naissance doit être au format JJ/MM/AAAA',
      'error.birthdateInvalidDate': 'Date invalide',
      'error.birthdateTooOld': 'La date de naissance ne peut pas être il y a plus de 3 ans',
      'error.birthdateTooFuture': 'La date de naissance ne peut pas être dans plus de 3 mois',
    };
    return translations[key] || key;
  };

  it('should validate a correct birthdate', () => {
    const today = new Date();
    const validDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const result = validateBirthdate(validDate, mockT);
    expect(result.isValid).toBe(true);
  });

  it('should reject empty birthdate', () => {
    const result = validateBirthdate('', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La date de naissance est requise');
  });

  it('should reject invalid format', () => {
    const result = validateBirthdate('2024-01-15', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La date de naissance doit être au format JJ/MM/AAAA');
  });

  it('should reject invalid format', () => {
    const result = validateBirthdate('32/13/2024', mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La date de naissance doit être au format JJ/MM/AAAA');
  });

  it('should reject date with impossible day (31 in February)', () => {
    const result = validateBirthdate('31/02/2024', mockT);
    expect(result.isValid).toBe(false);
    // Sera rejeté par la regex car 02 ne peut pas avoir 31 jours
    expect(result.error).toBeTruthy();
  });

  it('should reject date more than 3 years ago', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 4);
    const dateStr = `${String(oldDate.getDate()).padStart(2, '0')}/${String(oldDate.getMonth() + 1).padStart(2, '0')}/${oldDate.getFullYear()}`;
    const result = validateBirthdate(dateStr, mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La date de naissance ne peut pas être il y a plus de 3 ans');
  });

  it('should reject date more than 3 months in future', () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 4);
    const dateStr = `${String(futureDate.getDate()).padStart(2, '0')}/${String(futureDate.getMonth() + 1).padStart(2, '0')}/${futureDate.getFullYear()}`;
    const result = validateBirthdate(dateStr, mockT);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('La date de naissance ne peut pas être dans plus de 3 mois');
  });
});

describe('formatBirthdateInput', () => {
  it('should format input progressively', () => {
    expect(formatBirthdateInput('01')).toBe('01');
    expect(formatBirthdateInput('010')).toBe('01/0');
    expect(formatBirthdateInput('0101')).toBe('01/01');
    expect(formatBirthdateInput('01012')).toBe('01/01/2');
    expect(formatBirthdateInput('01012024')).toBe('01/01/2024');
  });

  it('should handle partial input', () => {
    expect(formatBirthdateInput('1')).toBe('1');
    expect(formatBirthdateInput('010')).toBe('01/0');
  });

  it('should allow input up to 10 characters with slashes', () => {
    const longInput = formatBirthdateInput('010120241234');
    expect(longInput.length).toBeGreaterThanOrEqual(10);
  });

  it('should handle empty input', () => {
    expect(formatBirthdateInput('')).toBe('');
  });
});
