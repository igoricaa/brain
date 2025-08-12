import { UseQueryOptions } from '@tanstack/react-query';
import { http } from './http';

// Core async validation types
export interface AsyncValidationRule {
    endpoint: string;
    method?: 'GET' | 'POST';
    debounceMs?: number;
    dependencies?: string[];
    validateOn?: 'change' | 'blur' | 'submit' | 'all';
    enabled?: boolean;
    // Custom payload transformation for validation request
    transformPayload?: (value: unknown, formValues: Record<string, unknown>) => unknown;
    // Custom error message extraction from response
    extractError?: (error: unknown) => string;
    // Cache key customization
    cacheKey?: (
        fieldName: string,
        value: unknown,
        dependencies?: Record<string, unknown>,
    ) => string[];
}

export interface AsyncValidationResult {
    isValid: boolean;
    error?: string;
    isValidating: boolean;
    lastValidated?: Date;
}

export interface AsyncValidationConfig {
    // Global debounce for all async validations
    defaultDebounceMs?: number;
    // Whether to validate on field change by default
    validateOnChange?: boolean;
    // Whether to validate on field blur by default
    validateOnBlur?: boolean;
    // Global validation endpoint prefix
    endpointPrefix?: string;
    // Default query options for all validation queries
    queryOptions?: Partial<UseQueryOptions>;
}

export interface ValidationEndpoint {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
}

export interface ValidationRequest {
    fieldName: string;
    value: unknown;
    formValues: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
}

export interface ValidationResponse {
    isValid: boolean;
    error?: string;
    suggestions?: string[];
    metadata?: Record<string, unknown>;
}

// Error types for async validation
export class AsyncValidationError extends Error {
    constructor(
        message: string,
        public fieldName: string,
        public originalError?: unknown,
    ) {
        super(message);
        this.name = 'AsyncValidationError';
    }
}

// Utility functions
export function createValidationEndpoint(
    baseEndpoint: string,
    fieldName: string,
    config?: AsyncValidationConfig,
): string {
    const prefix = config?.endpointPrefix || '';
    return `${prefix}${baseEndpoint}`.replace(':field', fieldName);
}

export function buildValidationPayload(
    request: ValidationRequest,
    rule: AsyncValidationRule,
): unknown {
    if (rule.transformPayload) {
        return rule.transformPayload(request.value, request.formValues);
    }

    // Default payload structure
    const payload = {
        field: request.fieldName,
        value: request.value,
        ...(request.dependencies && Object.keys(request.dependencies).length > 0
            ? { dependencies: request.dependencies }
            : {}),
    };

    return rule.method === 'GET' ? null : payload;
}

export function buildValidationUrl(
    endpoint: string,
    request: ValidationRequest,
    rule: AsyncValidationRule,
): string {
    if (rule.method === 'GET') {
        const params = new URLSearchParams();
        params.set('field', request.fieldName);
        params.set('value', String(request.value));

        if (request.dependencies) {
            Object.entries(request.dependencies).forEach(([key, value]) => {
                params.set(`dep_${key}`, String(value));
            });
        }

        return `${endpoint}?${params.toString()}`;
    }

    return endpoint;
}

export async function executeValidation(
    request: ValidationRequest,
    rule: AsyncValidationRule,
): Promise<ValidationResponse> {
    try {
        const url = buildValidationUrl(rule.endpoint, request, rule);
        const payload = buildValidationPayload(request, rule);

        const response = await http.request({
            url,
            method: rule.method || 'POST',
            ...(payload && { data: payload }),
        });

        // Handle different response formats
        const data = response.data;

        // If response is a boolean, assume valid/invalid
        if (typeof data === 'boolean') {
            return { isValid: data };
        }

        // If response has isValid field
        if (typeof data === 'object' && 'isValid' in data) {
            return data as ValidationResponse;
        }

        // If response has error field, assume invalid
        if (typeof data === 'object' && 'error' in data && data.error) {
            return {
                isValid: false,
                error: rule.extractError ? rule.extractError(data) : String(data.error),
            };
        }

        // Default to valid if we can't determine
        return { isValid: true };
    } catch (error) {
        const errorMessage = rule.extractError
            ? rule.extractError(error)
            : error instanceof Error
              ? error.message
              : 'Validation failed';

        return {
            isValid: false,
            error: errorMessage,
        };
    }
}

export function generateValidationCacheKey(
    fieldName: string,
    value: unknown,
    rule: AsyncValidationRule,
    dependencies?: Record<string, unknown>,
): string[] {
    if (rule.cacheKey) {
        return rule.cacheKey(fieldName, value, dependencies);
    }

    const baseKey = ['validation', fieldName, rule.endpoint];

    // Include value in cache key
    baseKey.push(String(value));

    // Include dependencies in cache key for proper invalidation
    if (dependencies && Object.keys(dependencies).length > 0) {
        const depKeys = Object.keys(dependencies).sort();
        depKeys.forEach((key) => {
            baseKey.push(`${key}:${String(dependencies[key])}`);
        });
    }

    return baseKey;
}

export function shouldTriggerValidation(
    triggerEvent: 'change' | 'blur' | 'submit',
    rule: AsyncValidationRule,
    config?: AsyncValidationConfig,
): boolean {
    const validateOn = rule.validateOn || 'all';

    if (validateOn === 'all') {
        return triggerEvent === 'change' || triggerEvent === 'blur' || triggerEvent === 'submit';
    }

    return validateOn === triggerEvent;
}

// Debounce utility specifically for validation
export function createValidationDebouncer<T extends unknown[]>(
    fn: (...args: T) => void,
    delayMs: number,
): (...args: T) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: T) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delayMs);
    };
}
