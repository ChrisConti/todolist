import { VALIDATION } from './constants';

/**
 * Validates a baby's name
 * @param name - The name to validate
 * @param t - Translation function (optional, falls back to English)
 * @returns Object with isValid boolean and optional error message
 */
export const validateBabyName = (name: string, t?: (key: string) => string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length < VALIDATION.MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: t ? t('error.nameMinLength') : `Name must be at least ${VALIDATION.MIN_NAME_LENGTH} characters`,
    };
  }
  return { isValid: true };
};

/**
 * Validates a birthdate in DD/MM/YYYY format
 * @param birthdate - The birthdate string to validate
 * @param t - Translation function (optional, falls back to English)
 * @returns Object with isValid boolean and optional error message
 */
export const validateBirthdate = (birthdate: string, t?: (key: string) => string): { isValid: boolean; error?: string } => {
  if (!birthdate || birthdate.length < VALIDATION.MIN_BIRTHDATE_LENGTH) {
    return {
      isValid: false,
      error: t ? t('error.birthdateRequired') : 'Birthdate is required',
    };
  }

  if (!VALIDATION.BIRTHDATE_REGEX.test(birthdate)) {
    return {
      isValid: false,
      error: t ? t('error.birthdateInvalidFormat') : `Birthdate must be in ${VALIDATION.BIRTHDATE_FORMAT} format`,
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
      error: t ? t('error.birthdateInvalidDate') : 'Invalid date',
    };
  }

  // Check that date is not more than 3 years in the past
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  
  if (date < threeYearsAgo) {
    return {
      isValid: false,
      error: t ? t('error.birthdateTooOld') : 'Birthdate cannot be more than 3 years ago',
    };
  }

  // Check that date is not more than 3 months in the future
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  if (date > threeMonthsFromNow) {
    return {
      isValid: false,
      error: t ? t('error.birthdateTooFuture') : 'Birthdate cannot be more than 3 months in the future',
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

/**
 * Validates baby weight
 * @param weight - Weight in kg
 * @param t - Translation function
 * @returns Validation result
 */
export const validateWeight = (weight: number | undefined, t?: (key: string) => string): { isValid: boolean; error?: string } => {
  if (weight === undefined || weight === null) {
    return { isValid: true }; // Optional field
  }
  
  if (weight < 0.1 || weight > 50) {
    return {
      isValid: false,
      error: t ? t('error.invalidWeight') : 'Weight must be between 0.1 and 50 kg',
    };
  }
  
  return { isValid: true };
};

/**
 * Validates baby height
 * @param height - Height in cm
 * @param t - Translation function
 * @returns Validation result
 */
export const validateHeight = (height: number | undefined, t?: (key: string) => string): { isValid: boolean; error?: string } => {
  if (height === undefined || height === null) {
    return { isValid: true }; // Optional field
  }
  
  if (height < 20 || height > 200) {
    return {
      isValid: false,
      error: t ? t('error.invalidHeight') : 'Height must be between 20 and 200 cm',
    };
  }
  
  return { isValid: true };
};

/**
 * Calculates baby age from birthdate
 * @param birthdate - Birthdate string in DD/MM/YYYY format or ISO format
 * @param t - Translation function
 * @returns Formatted age string
 */
export const calculateAge = (birthdate: string, t?: (key: string) => string): string => {
  let date: Date;
  
  // Parse DD/MM/YYYY format
  if (birthdate.includes('/')) {
    const [day, month, year] = birthdate.split('/').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(birthdate);
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Less than 1 week
  if (diffDays < 7) {
    const day = t ? t('baby.day') : 'day';
    const days = t ? t('baby.days') : 'days';
    return diffDays <= 1 ? `${diffDays} ${day}` : `${diffDays} ${days}`;
  }
  
  // Less than 1 month (4 weeks)
  if (diffDays < 28) {
    const weeks = Math.floor(diffDays / 7);
    const week = t ? t('baby.week') : 'week';
    const weeksPlural = t ? t('baby.weeks') : 'weeks';
    return weeks === 1 ? `${weeks} ${week}` : `${weeks} ${weeksPlural}`;
  }
  
  // Calculate years and months
  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (now.getDate() < date.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  const year = t ? t('baby.year') : 'year';
  const yearsPlural = t ? t('baby.years') : 'years';
  const month = t ? t('baby.month') : 'month';
  const monthsPlural = t ? t('baby.months') : 'months';
  
  // Less than 1 year
  if (years === 0) {
    return months === 1 ? `${months} ${month}` : `${months} ${monthsPlural}`;
  }
  
  // 1 year or more
  if (months === 0) {
    return years === 1 ? `${years} ${year}` : `${years} ${yearsPlural}`;
  }
  
  const yearStr = years === 1 ? `${years} ${year}` : `${years} ${yearsPlural}`;
  const monthStr = months === 1 ? `${months} ${month}` : `${months} ${monthsPlural}`;
  
  return `${yearStr} ${monthStr}`;
};
