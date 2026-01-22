import validator from 'validator';

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags and escape special characters
  return validator.escape(validator.stripLow(input.trim()));
};

export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  // Normalize and validate email
  const normalized = validator.normalizeEmail(email.trim().toLowerCase());
  return normalized || '';
};

export const validateAndSanitizeSignup = (data: any) => {
  const errors: string[] = [];
  const sanitized: any = {};

  // Email validation and sanitization
  if (!data.email) {
    errors.push('Email is required');
  } else {
    const email = sanitizeEmail(data.email);
    if (!validator.isEmail(email)) {
      errors.push('Invalid email format');
    } else {
      sanitized.email = email;
    }
  }

  // Password validation
  if (data.password) {
    if (!validator.isLength(data.password, { min: 8, max: 128 })) {
      errors.push('Password must be between 8 and 128 characters');
    } else {
      sanitized.password = data.password; // Don't sanitize passwords
    }
  }

  // Role validation
  if (data.role) {
    const allowedRoles = ['startup', 'investor', 'researcher'];
    const role = sanitizeInput(data.role);
    if (!allowedRoles.includes(role)) {
      errors.push('Invalid role specified');
    } else {
      sanitized.role = role;
    }
  }

  return { errors, sanitized };
};
