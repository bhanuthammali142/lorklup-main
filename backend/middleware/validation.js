const validator = require('validator');

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  // Remove HTML tags and encode entities
  return validator.escape(validator.trim(input));
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, value: string, error?: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, value: email, error: 'Email is required' };
  }

  const sanitized = validator.normalizeEmail(email.trim());

  if (!validator.isEmail(sanitized)) {
    return { isValid: false, value: email, error: 'Invalid email format' };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, error?: string }
 */
function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = false
  } = options;

  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (requireNumbers && !/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  if (requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }

  return { isValid: true };
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return validator.isUUID(uuid);
}

/**
 * Validate phone number (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone number
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Allow +, spaces, dashes, and digits
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  return validator.isMobilePhone(cleaned, 'any', { strictMode: false });
}

/**
 * Sanitize object properties recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key as well to prevent prototype pollution
    const sanitizedKey = typeof key === 'string' ? sanitizeString(key) : key;

    if (typeof value === 'string') {
      const lowerKey = String(sanitizedKey).toLowerCase();
      // Skip HTML escaping for passwords, emails, tokens, secrets, payment signatures, and base64 image/document data to prevent corruption
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('email') ||
        lowerKey.includes('token') ||
        lowerKey.includes('signature') ||
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('razorpay') ||
        lowerKey === 'transaction_id' ||
        lowerKey.includes('photo') ||
        lowerKey.includes('image') ||
        lowerKey.includes('document') ||
        value.startsWith('data:')
      ) {
        sanitized[sanitizedKey] = validator.trim(value);
      } else {
        sanitized[sanitizedKey] = sanitizeString(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  return sanitized;
}

/**
 * Express middleware to sanitize request body, params, and query
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Middleware to validate request body against a schema
 * @param {object} schema - Validation schema
 * @returns {function} - Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }

      // Email validation
      if (rules.email && typeof value === 'string') {
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) {
          errors.push(emailValidation.error);
        }
      }

      // Min length validation
      if (rules.minLength && String(value).length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      // Max length validation
      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeRequest,
  validateEmail,
  validatePassword,
  isValidUUID,
  isValidPhone,
  validateBody
};
