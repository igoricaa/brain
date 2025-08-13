/**
 * Runtime type validation utilities for localStorage data integrity
 * and production-safe schema validation.
 */

// Schema validation errors
export interface ValidationError extends Error {
    code: 'INVALID_SCHEMA' | 'MISSING_FIELD' | 'INVALID_TYPE' | 'CORRUPTED_DATA';
    field?: string;
    expectedType?: string;
    actualType?: string;
}

// Base schema types
export type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SchemaField {
    type: SchemaType;
    required?: boolean;
    validator?: (value: any) => boolean;
    sanitizer?: (value: any) => any;
}

export interface Schema {
    [key: string]: SchemaField;
}

/**
 * Validate an object against a schema
 */
export const validateSchema = <T = any>(data: unknown, schema: Schema, strict = true): T => {
    if (typeof data !== 'object' || data === null) {
        const error: ValidationError = new Error('Data must be an object') as ValidationError;
        error.code = 'INVALID_TYPE';
        error.expectedType = 'object';
        error.actualType = typeof data;
        throw error;
    }

    const result: any = strict ? {} : { ...data };
    const dataObj = data as Record<string, any>;

    // Validate each field in schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        const value = dataObj[fieldName];

        // Check required fields
        if (fieldSchema.required && (value === undefined || value === null)) {
            const error: ValidationError = new Error(
                `Missing required field: ${fieldName}`,
            ) as ValidationError;
            error.code = 'MISSING_FIELD';
            error.field = fieldName;
            throw error;
        }

        // Skip validation for undefined optional fields
        if (value === undefined || value === null) {
            if (!fieldSchema.required) {
                continue;
            }
        }

        // Validate type
        const isValidType = validateFieldType(value, fieldSchema.type);
        if (!isValidType) {
            const error: ValidationError = new Error(
                `Invalid type for field ${fieldName}`,
            ) as ValidationError;
            error.code = 'INVALID_TYPE';
            error.field = fieldName;
            error.expectedType = fieldSchema.type;
            error.actualType = Array.isArray(value) ? 'array' : typeof value;
            throw error;
        }

        // Apply custom validator
        if (fieldSchema.validator && !fieldSchema.validator(value)) {
            const error: ValidationError = new Error(
                `Custom validation failed for field: ${fieldName}`,
            ) as ValidationError;
            error.code = 'INVALID_SCHEMA';
            error.field = fieldName;
            throw error;
        }

        // Apply sanitizer and set value
        result[fieldName] = fieldSchema.sanitizer ? fieldSchema.sanitizer(value) : value;
    }

    return result as T;
};

/**
 * Validate field type
 */
const validateFieldType = (value: any, expectedType: SchemaType): boolean => {
    switch (expectedType) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        default:
            return false;
    }
};

/**
 * Sanitize string to prevent XSS
 */
export const sanitizeString = (value: any): string => {
    if (typeof value !== 'string') {
        return String(value);
    }

    return value
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim()
        .substring(0, 1000); // Limit length
};

/**
 * Sanitize array with type checking
 */
export const sanitizeArray = <T = any>(value: any, itemValidator?: (item: any) => boolean): T[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    if (itemValidator) {
        return value.filter(itemValidator) as T[];
    }

    return value as T[];
};

/**
 * Validate and sanitize number
 */
export const sanitizeNumber = (value: any, min?: number, max?: number): number => {
    const num = typeof value === 'number' ? value : parseFloat(value);

    if (isNaN(num)) {
        return 0;
    }

    if (min !== undefined && num < min) {
        return min;
    }

    if (max !== undefined && num > max) {
        return max;
    }

    return num;
};

/**
 * Safe JSON parse with validation
 */
export const safeJSONParse = <T = any>(jsonString: string, schema?: Schema): T | null => {
    try {
        const parsed = JSON.parse(jsonString);

        if (schema) {
            return validateSchema<T>(parsed, schema);
        }

        return parsed as T;
    } catch (error) {
        console.warn('JSON parse failed:', error);
        return null;
    }
};

/**
 * Create a validator for timestamp fields
 */
export const createTimestampValidator = (maxAge?: number) => {
    return (value: any): boolean => {
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }

        // Check if timestamp is reasonable (not too far in past/future)
        const now = Date.now();
        const minTime = new Date('2020-01-01').getTime(); // Reasonable minimum
        const maxTime = now + 365 * 24 * 60 * 60 * 1000; // Max 1 year in future

        if (value < minTime || value > maxTime) {
            return false;
        }

        // Check max age if specified
        if (maxAge && now - value > maxAge) {
            return false;
        }

        return true;
    };
};

/**
 * Create a validator for UUID strings
 */
export const createUUIDValidator = () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const draftIdRegex = /^draft_\d+_[a-z0-9]+$/;
    const fileIdRegex = /^\d+_\d+$/; // File IDs: timestamp_index format

    return (value: any): boolean => {
        if (typeof value !== 'string') {
            return false;
        }

        return uuidRegex.test(value) || draftIdRegex.test(value) || fileIdRegex.test(value);
    };
};

/**
 * Create a validator for URL strings
 */
export const createURLValidator = () => {
    return (value: any): boolean => {
        if (typeof value !== 'string' || !value) {
            return true; // Allow empty strings for optional URLs
        }

        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    };
};

/**
 * Validate file metadata object
 */
export const validateFileMetadata = (file: unknown): boolean => {
    if (typeof file !== 'object' || file === null) {
        return false;
    }

    const f = file as Record<string, any>;

    // Required fields
    if (!f.id || typeof f.id !== 'string') return false;
    if (!f.name || typeof f.name !== 'string') return false;
    if (typeof f.size !== 'number' || f.size < 0) return false;
    if (!f.type || typeof f.type !== 'string') return false;
    if (typeof f.lastModified !== 'number' || f.lastModified < 0) return false;

    // Optional fields type checking
    if (f.category && typeof f.category !== 'string') return false;
    if (f.documentType && typeof f.documentType !== 'string') return false;
    if (f.proprietary && typeof f.proprietary !== 'boolean') return false;
    if (f.tldr && typeof f.tldr !== 'string') return false;
    if (f.tags && !Array.isArray(f.tags)) return false;
    if (f.blobData && typeof f.blobData !== 'string') return false;
    if (f.hasBlob && typeof f.hasBlob !== 'boolean') return false;

    return true;
};

/**
 * Comprehensive data corruption check
 */
export const checkDataCorruption = (data: unknown): string[] => {
    const issues: string[] = [];

    if (data === null || data === undefined) {
        issues.push('Data is null or undefined');
        return issues;
    }

    if (typeof data !== 'object') {
        issues.push('Data is not an object');
        return issues;
    }

    const dataObj = data as Record<string, any>;

    // Check for circular references
    try {
        JSON.stringify(data);
    } catch (error) {
        issues.push('Data contains circular references');
    }

    // Check for excessively large objects
    try {
        const jsonSize = new Blob([JSON.stringify(data)]).size;
        if (jsonSize > 10 * 1024 * 1024) {
            // 10MB
            issues.push('Data size is excessively large');
        }
    } catch {
        issues.push('Cannot calculate data size');
    }

    // Check for suspicious properties
    for (const [key, value] of Object.entries(dataObj)) {
        if (typeof key !== 'string' || key.length === 0) {
            issues.push('Invalid property key found');
        }

        if (typeof value === 'function') {
            issues.push('Function found in data (possible code injection)');
        }

        if (typeof value === 'string' && value.includes('javascript:')) {
            issues.push('Suspicious javascript: URL found');
        }
    }

    return issues;
};
