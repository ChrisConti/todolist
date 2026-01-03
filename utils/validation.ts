import { VALIDATION } from './constants';

/**
 * Validates a baby's name
 * @param name - The name to validate
 * @returns Object with isValid boolean and optional error message
 */
export const validateBabyName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length < VALIDATION.MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Name must be at least ${VALIDATION.MIN_NAME_LENGTH} characters`,
    };
  }
  return { isValid: true };
};

/**
 * Validates a birthdate in DD/MM/YYYY format
 * @param birthdate - The birthdate string to validate
 * @returns Object with isValid boolean and optional error message
 */
export const validateBirthdate = (birthdate: string): { isValid: boolean; error?: string } => {
  if (!birthdate || birthdate.length < VALIDATION.MIN_BIRTHDATE_LENGTH) {
    return {
      isValid: false,
      error: 'Birthdate is required',
    };
  }

  if (!VALIDATION.BIRTHDATE_REGEX.test(birthdate)) {
    return {
      isValid: false,
      error: `Birthdate must be in ${VALIDATION.BIRTHDATE_FORMAT} format`,
    };
  }

  // Validate that it's a real date
  const [day, month, year] = birthdate.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return {
      isValid: false,
      error: 'Invalid date',
    };
  }

  // Check that date is not in the future
  if (date > new Date()) {
    return {
      isValid: false,
      error: 'Birthdate cannot be in the future',
    };
  }

  return { isValid: true };
};

/**
 * Formats a date string for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

/**
 * Formats birthdate input as user types
 * @param text - The input text
 * @returns Formatted birthdate string
 */
export const formatBirthdateInput = (text: string): string => {
  const cleaned = text.replace(/[^0-9]/g, '');
  let formatted = cleaned;
  
  if (cleaned.length > 2) {
    formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
  }
  if (cleaned.length > 4) {
    formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
  }
  
  return formatted;
};
