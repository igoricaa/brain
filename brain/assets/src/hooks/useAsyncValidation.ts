import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
    AsyncValidationRule,
    AsyncValidationResult,
    AsyncValidationConfig,
    ValidationRequest,
    executeValidation,
    generateValidationCacheKey,
    shouldTriggerValidation,
    createValidationDebouncer,
} from '../lib/asyncValidation';

export interface UseAsyncValidationOptions {
    fieldName: string;
    value: unknown;
    formValues: Record<string, unknown>;
    rule: AsyncValidationRule;
    config?: AsyncValidationConfig;
    // Whether the field is currently focused
    isFocused?: boolean;
    // Whether the field has been touched (blurred at least once)
    isTouched?: boolean;
    // Whether to enable validation (useful for conditional validation)
    enabled?: boolean;
}

export interface UseAsyncValidationReturn extends AsyncValidationResult {
    // Manually trigger validation
    validate: () => void;
    // Clear validation state
    clear: () => void;
    // Cancel ongoing validation
    cancel: () => void;
}

export function useAsyncValidation({
    fieldName,
    value,
    formValues,
    rule,
    config,
    isFocused = false,
    isTouched = false,
    enabled = true,
}: UseAsyncValidationOptions): UseAsyncValidationReturn {
    const queryClient = useQueryClient();

    // Get dependencies from form values
    const dependencies = rule.dependencies
        ? Object.fromEntries(rule.dependencies.map((dep) => [dep, formValues[dep]]))
        : undefined;

    // Generate cache key
    const cacheKey = generateValidationCacheKey(fieldName, value, rule, dependencies);

    // Determine if validation should be enabled
    const shouldValidate = enabled && rule.enabled !== false && value !== '' && value != null;

    // Create validation request
    const validationRequest: ValidationRequest = {
        fieldName,
        value,
        formValues,
        dependencies,
    };

    // TanStack Query for validation
    const query = useQuery({
        queryKey: cacheKey,
        queryFn: () => executeValidation(validationRequest, rule),
        enabled: false, // We'll enable manually based on triggers
        staleTime: 30000, // 30 seconds - validation results are relatively stable
        gcTime: 300000, // 5 minutes - keep in cache for a while
        retry: false, // Don't retry validation failures automatically
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        ...config?.queryOptions,
    });

    // Debounced validation function
    const debouncedValidate = useRef(
        createValidationDebouncer(
            () => {
                if (shouldValidate) {
                    query.refetch();
                }
            },
            rule.debounceMs || config?.defaultDebounceMs || 500,
        ),
    );

    // Manual validation trigger
    const validate = () => {
        if (shouldValidate) {
            query.refetch();
        }
    };

    // Clear validation state
    const clear = () => {
        queryClient.removeQueries({ queryKey: cacheKey });
    };

    // Cancel ongoing validation
    const cancel = () => {
        queryClient.cancelQueries({ queryKey: cacheKey });
    };

    // Handle value changes (with debouncing)
    useEffect(() => {
        if (shouldTriggerValidation('change', rule, config) && isTouched) {
            debouncedValidate.current();
        }
    }, [value, isTouched, rule, config]);

    // Handle dependencies changes (immediate validation)
    useEffect(() => {
        if (dependencies && isTouched) {
            validate();
        }
    }, [dependencies, validate, isTouched]);

    // Handle blur events (immediate validation)
    const validateOnBlur = () => {
        if (shouldTriggerValidation('blur', rule, config)) {
            validate();
        }
    };

    // Expose blur handler for external use
    useEffect(() => {
        if (!isFocused && isTouched) {
            validateOnBlur();
        }
    }, [isFocused, isTouched, validateOnBlur]);

    // Transform query result to our format
    const result: AsyncValidationResult = {
        isValid: query.data?.isValid ?? true,
        error: query.data?.error,
        isValidating: query.isFetching,
        lastValidated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : undefined,
    };

    return {
        ...result,
        validate,
        clear,
        cancel,
    };
}

// Hook for multiple field validation
export interface UseMultiFieldAsyncValidationOptions {
    fields: Array<{
        fieldName: string;
        value: unknown;
        rule: AsyncValidationRule;
        isTouched?: boolean;
    }>;
    formValues: Record<string, unknown>;
    config?: AsyncValidationConfig;
    enabled?: boolean;
}

export function useMultiFieldAsyncValidation({
    fields,
    formValues,
    config,
    enabled = true,
}: UseMultiFieldAsyncValidationOptions): Record<string, UseAsyncValidationReturn> {
    const results: Record<string, UseAsyncValidationReturn> = {};

    fields.forEach((field) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        results[field.fieldName] = useAsyncValidation({
            fieldName: field.fieldName,
            value: field.value,
            formValues,
            rule: field.rule,
            config,
            isTouched: field.isTouched,
            enabled,
        });
    });

    return results;
}

// Utility hook for form-level async validation
export interface UseFormAsyncValidationOptions {
    formValues: Record<string, unknown>;
    rules: Record<string, AsyncValidationRule>;
    touchedFields: Set<string>;
    config?: AsyncValidationConfig;
    enabled?: boolean;
}

export function useFormAsyncValidation({
    formValues,
    rules,
    touchedFields,
    config,
    enabled = true,
}: UseFormAsyncValidationOptions) {
    const validationResults = useMultiFieldAsyncValidation({
        fields: Object.entries(rules).map(([fieldName, rule]) => ({
            fieldName,
            value: formValues[fieldName],
            rule,
            isTouched: touchedFields.has(fieldName),
        })),
        formValues,
        config,
        enabled,
    });

    // Aggregate validation state
    const isValidating = Object.values(validationResults).some((result) => result.isValidating);
    const hasErrors = Object.values(validationResults).some(
        (result) => !result.isValid && result.error,
    );
    const allValid = Object.values(validationResults).every((result) => result.isValid);

    // Get all errors
    const errors = Object.entries(validationResults)
        .filter(([_, result]) => !result.isValid && result.error)
        .reduce(
            (acc, [fieldName, result]) => {
                acc[fieldName] = result.error!;
                return acc;
            },
            {} as Record<string, string>,
        );

    // Manual validation for all fields
    const validateAll = () => {
        Object.values(validationResults).forEach((result) => result.validate());
    };

    // Clear all validation states
    const clearAll = () => {
        Object.values(validationResults).forEach((result) => result.clear());
    };

    return {
        validationResults,
        isValidating,
        hasErrors,
        allValid,
        errors,
        validateAll,
        clearAll,
    };
}
