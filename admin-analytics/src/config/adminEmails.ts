/**
 * Whitelist of admin emails allowed to access the analytics dashboard
 * SECURITY: Only these emails can authenticate and view data
 */
export const ADMIN_EMAILS = [
  'continente.christopher@gmail.com',
  'delphine.bardou@gmail.com',
];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
