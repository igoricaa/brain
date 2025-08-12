import * as React from 'react';
import { AsyncValidationResult } from '../../lib/asyncValidation';

export interface ValidationIndicatorProps {
    validation: AsyncValidationResult;
    fieldName?: string;
    className?: string;
    showSuccessIcon?: boolean;
    showLoadingText?: boolean;
    compact?: boolean;
}

export function ValidationIndicator({
    validation,
    fieldName,
    className = '',
    showSuccessIcon = false,
    showLoadingText = true,
    compact = false,
}: ValidationIndicatorProps) {
    const baseClasses = compact ? 'text-xs' : 'text-sm';

    // Loading state
    if (validation.isValidating) {
        return (
            <div className={`${baseClasses} text-blue-600 flex items-center gap-1 ${className}`}>
                <span
                    className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                    role="status"
                    aria-label="Validating"
                />
                {showLoadingText && (
                    <span>{compact ? 'Checking...' : `Validating ${fieldName || 'field'}...`}</span>
                )}
            </div>
        );
    }

    // Error state
    if (!validation.isValid && validation.error) {
        return (
            <div
                className={`${baseClasses} text-red-600 flex items-center gap-1 ${className}`}
                role="alert"
                aria-live="polite"
            >
                <svg
                    className="h-3 w-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM9.25 14a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V14z"
                        clipRule="evenodd"
                    />
                </svg>
                <span>{validation.error}</span>
            </div>
        );
    }

    // Success state (only show if explicitly requested)
    if (validation.isValid && showSuccessIcon && validation.lastValidated) {
        return (
            <div className={`${baseClasses} text-green-600 flex items-center gap-1 ${className}`}>
                <svg
                    className="h-3 w-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                    />
                </svg>
                {!compact && <span>Valid</span>}
            </div>
        );
    }

    // No validation state to show
    return null;
}

// Inline validation indicator for form fields
export interface InlineValidationProps extends ValidationIndicatorProps {
    position?: 'right' | 'below';
}

export function InlineValidation({ position = 'below', ...props }: InlineValidationProps) {
    const positionClasses =
        position === 'right' ? 'absolute right-2 top-1/2 -translate-y-1/2' : 'mt-1';

    return (
        <div className={`${positionClasses} ${position === 'right' ? 'pointer-events-none' : ''}`}>
            <ValidationIndicator {...props} compact={position === 'right'} />
        </div>
    );
}

// Validation summary component for forms
export interface ValidationSummaryProps {
    validations: Record<string, AsyncValidationResult>;
    className?: string;
    title?: string;
    showValidating?: boolean;
    showValid?: boolean;
}

export function ValidationSummary({
    validations,
    className = '',
    title = 'Validation Status',
    showValidating = true,
    showValid = false,
}: ValidationSummaryProps) {
    const entries = Object.entries(validations);
    const validatingFields = entries.filter(([_, v]) => v.isValidating);
    const errorFields = entries.filter(([_, v]) => !v.isValid && v.error);
    const validFields = entries.filter(([_, v]) => v.isValid && v.lastValidated);

    if (!showValidating && validatingFields.length === 0 && errorFields.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {title && <h3 className="text-sm font-medium text-gray-900">{title}</h3>}

            {/* Validating fields */}
            {showValidating && validatingFields.length > 0 && (
                <div className="space-y-1">
                    {validatingFields.map(([fieldName, validation]) => (
                        <ValidationIndicator
                            key={fieldName}
                            validation={validation}
                            fieldName={fieldName}
                            className="justify-start"
                        />
                    ))}
                </div>
            )}

            {/* Error fields */}
            {errorFields.length > 0 && (
                <div className="space-y-1">
                    {errorFields.map(([fieldName, validation]) => (
                        <ValidationIndicator
                            key={fieldName}
                            validation={validation}
                            fieldName={fieldName}
                            className="justify-start"
                        />
                    ))}
                </div>
            )}

            {/* Valid fields (optional) */}
            {showValid && validFields.length > 0 && (
                <div className="space-y-1">
                    {validFields.map(([fieldName, validation]) => (
                        <ValidationIndicator
                            key={fieldName}
                            validation={validation}
                            fieldName={fieldName}
                            showSuccessIcon
                            className="justify-start"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Field wrapper with integrated validation
export interface ValidatedFieldWrapperProps {
    children: React.ReactNode;
    validation: AsyncValidationResult;
    label?: string;
    fieldName?: string;
    required?: boolean;
    helpText?: string;
    className?: string;
}

export function ValidatedFieldWrapper({
    children,
    validation,
    label,
    fieldName,
    required,
    helpText,
    className = '',
}: ValidatedFieldWrapperProps) {
    const hasError = !validation.isValid && validation.error;
    const isValidating = validation.isValidating;

    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-600 ml-1">*</span>}
                    {isValidating && (
                        <span className="ml-2 text-blue-600">
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </span>
                    )}
                </label>
            )}

            <div className="relative">
                {children}
                {/* Show validation icon in field when not showing full validation */}
                {(hasError || (validation.isValid && validation.lastValidated)) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {hasError ? (
                            <svg
                                className="h-4 w-4 text-red-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM9.25 14a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V14z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-4 w-4 text-green-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </div>
                )}
            </div>

            {/* Help text */}
            {helpText && !hasError && <p className="text-xs text-gray-500">{helpText}</p>}

            {/* Validation message */}
            <ValidationIndicator
                validation={validation}
                fieldName={fieldName}
                showLoadingText={false}
                compact
            />
        </div>
    );
}

export default ValidationIndicator;
