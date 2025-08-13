/**
 * Production-safe error handling and sanitization utilities
 * Prevents information disclosure while providing useful user feedback.
 */

// Allowed error fields that can be safely displayed to users
const ALLOWED_API_ERROR_FIELDS = new Set([
    'detail',
    'message',
    'website',
    'name',
    'description',
    'funding_target',
    'file',
    'category',
    'document_type',
]);

// Maximum error message length to prevent DoS
const MAX_ERROR_MESSAGE_LENGTH = 500;

// Generic error messages for different error types
const GENERIC_ERROR_MESSAGES = {
    network: 'Network error occurred. Please check your connection and try again.',
    validation: 'Please check your input and try again.',
    server: 'Server error occurred. Please try again later.',
    storage: 'Storage error occurred. Please try again or clear some space.',
    file: 'File processing error. Please check the file and try again.',
    auth: 'Authentication error. Please log in and try again.',
    permission: 'Permission denied. Please check your access rights.',
    quota: 'Storage quota exceeded. Please free up space and try again.',
    timeout: 'Request timed out. Please try again.',
    unknown: 'An unexpected error occurred. Please try again.',
} as const;

export type ErrorType = keyof typeof GENERIC_ERROR_MESSAGES;

export interface SanitizedError {
    message: string;
    type: ErrorType;
    field?: string;
    code?: string;
    timestamp: number;
}

/**
 * Sanitize error for safe display to users
 */
export const sanitizeError = (error: unknown, context?: string): SanitizedError => {
    const timestamp = Date.now();

    // Handle null/undefined errors
    if (!error) {
        return {
            message: GENERIC_ERROR_MESSAGES.unknown,
            type: 'unknown',
            timestamp,
        };
    }

    // Handle Error objects
    if (error instanceof Error) {
        return sanitizeErrorObject(error, context, timestamp);
    }

    // Handle string errors
    if (typeof error === 'string') {
        return sanitizeStringError(error, context, timestamp);
    }

    // Handle object errors (API responses)
    if (typeof error === 'object') {
        return sanitizeObjectError(error as Record<string, any>, context, timestamp);
    }

    // Fallback for unknown error types
    return {
        message: GENERIC_ERROR_MESSAGES.unknown,
        type: 'unknown',
        timestamp,
    };
};

/**
 * Sanitize Error object
 */
const sanitizeErrorObject = (
    error: Error,
    context?: string,
    timestamp: number = Date.now(),
): SanitizedError => {
    let message = error.message || GENERIC_ERROR_MESSAGES.unknown;
    let type: ErrorType = 'unknown';

    // Try to parse structured error messages from API
    if (message.startsWith('{') || message.startsWith('[')) {
        try {
            const apiError = JSON.parse(message);
            return sanitizeObjectError(apiError, context, timestamp);
        } catch {
            // Fall through to string sanitization
        }
    }

    // Determine error type based on message content
    type = categorizeErrorMessage(message);

    // Sanitize the message
    message = sanitizeErrorMessage(message);

    return {
        message,
        type,
        timestamp,
    };
};

/**
 * Sanitize string error
 */
const sanitizeStringError = (
    error: string,
    context?: string,
    timestamp: number = Date.now(),
): SanitizedError => {
    const type = categorizeErrorMessage(error);
    const message = sanitizeErrorMessage(error);

    return {
        message,
        type,
        timestamp,
    };
};

/**
 * Sanitize object error (API responses)
 */
const sanitizeObjectError = (
    error: Record<string, any>,
    context?: string,
    timestamp: number = Date.now(),
): SanitizedError => {
    let message = GENERIC_ERROR_MESSAGES.unknown;
    let type: ErrorType = 'unknown';
    let field: string | undefined;
    let code: string | undefined;

    // Check for status code to determine error type
    if (error.status || error.statusCode) {
        const status = error.status || error.statusCode;
        type = categorizeByStatusCode(status);
    }

    // Extract safe error fields
    for (const [key, value] of Object.entries(error)) {
        if (!ALLOWED_API_ERROR_FIELDS.has(key) || !value) {
            continue;
        }

        // Handle array values (validation errors)
        if (Array.isArray(value) && value.length > 0) {
            const firstError = value[0];
            if (typeof firstError === 'string') {
                message = sanitizeErrorMessage(`${key}: ${firstError}`);
                field = key;
                type = 'validation';
                break;
            }
        }

        // Handle string values
        if (typeof value === 'string') {
            message = sanitizeErrorMessage(key === 'detail' ? value : `${key}: ${value}`);
            field = key !== 'detail' ? key : undefined;
            type = 'validation';
            break;
        }
    }

    // Extract error code if available
    if (error.code && typeof error.code === 'string') {
        code = error.code.substring(0, 50); // Limit code length
    }

    return {
        message,
        type,
        field,
        code,
        timestamp,
    };
};

/**
 * Categorize error message to determine type
 */
const categorizeErrorMessage = (message: string): ErrorType => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
        return 'network';
    }

    if (
        lowerMessage.includes('validation') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('required')
    ) {
        return 'validation';
    }

    if (
        lowerMessage.includes('quota') ||
        lowerMessage.includes('storage space') ||
        lowerMessage.includes('localstorage')
    ) {
        return 'quota';
    }

    if (
        lowerMessage.includes('file') ||
        lowerMessage.includes('upload') ||
        lowerMessage.includes('conversion')
    ) {
        return 'file';
    }

    if (
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('forbidden') ||
        lowerMessage.includes('auth')
    ) {
        return 'auth';
    }

    if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
        return 'permission';
    }

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return 'timeout';
    }

    if (
        lowerMessage.includes('server') ||
        lowerMessage.includes('500') ||
        lowerMessage.includes('internal')
    ) {
        return 'server';
    }

    return 'unknown';
};

/**
 * Categorize error by HTTP status code
 */
const categorizeByStatusCode = (status: number): ErrorType => {
    if (status === 400) return 'validation';
    if (status === 401) return 'auth';
    if (status === 403) return 'permission';
    if (status === 408) return 'timeout';
    if (status === 413) return 'file';
    if (status === 422) return 'validation';
    if (status === 429) return 'quota';
    if (status >= 500) return 'server';
    if (status >= 400) return 'unknown';

    return 'unknown';
};

/**
 * Sanitize error message for safe display
 */
const sanitizeErrorMessage = (message: string): string => {
    if (!message || typeof message !== 'string') {
        return GENERIC_ERROR_MESSAGES.unknown;
    }

    // Remove potential XSS content
    let sanitized = message
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/data:/gi, '') // Remove data: protocols
        .replace(/vbscript:/gi, '') // Remove vbscript: protocols
        .trim();

    // Limit message length
    if (sanitized.length > MAX_ERROR_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_ERROR_MESSAGE_LENGTH) + '...';
    }

    // Replace empty or too short messages with generic ones
    if (sanitized.length < 3) {
        return GENERIC_ERROR_MESSAGES.unknown;
    }

    // Remove potentially sensitive information
    sanitized = sanitized
        .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // IP addresses
        .replace(/\b[A-Za-z0-9+/]{20,}\b/g, '[TOKEN]') // Tokens
        .replace(/api[_-]?key[s]?[:\s]*[A-Za-z0-9+/]+/gi, '[API_KEY]') // API keys
        .replace(/password[:\s]*\S+/gi, '[PASSWORD]') // Passwords
        .replace(/token[:\s]*[A-Za-z0-9+/]+/gi, '[TOKEN]'); // Generic tokens

    return sanitized;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: SanitizedError, context?: string): string => {
    // For validation errors, show the specific message
    if (error.type === 'validation' && error.message !== GENERIC_ERROR_MESSAGES.validation) {
        return error.message;
    }

    // For other errors, use generic messages with context
    let baseMessage = GENERIC_ERROR_MESSAGES[error.type];

    if (context) {
        switch (error.type) {
            case 'file':
                baseMessage = `File ${context}: ${baseMessage}`;
                break;
            case 'network':
                baseMessage = `${context} failed: ${baseMessage}`;
                break;
            case 'quota':
                baseMessage = `${context}: ${baseMessage}`;
                break;
            default:
                baseMessage = `${context}: ${baseMessage}`;
                break;
        }
    }

    return baseMessage;
};

/**
 * Log error safely for debugging (server-side only)
 */
export const logErrorSafely = (error: unknown, context?: string): void => {
    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV !== 'development' && !process.env.ENABLE_ERROR_LOGGING) {
        return;
    }

    const timestamp = new Date().toISOString();
    const contextString = context ? `[${context}]` : '';

    console.error(`${timestamp} ${contextString} Error:`, error);

    // Log stack trace for Error objects
    if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
    }
};

/**
 * Create error boundary compatible error handler
 */
export const createErrorHandler = (context: string) => {
    return (error: unknown): SanitizedError => {
        logErrorSafely(error, context);
        return sanitizeError(error, context);
    };
};
