import * as React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { http, normalizeDrfErrors } from '../../lib/http';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormAsyncValidation } from '../../hooks/useAsyncValidation';
import { AsyncValidationRule, AsyncValidationConfig } from '../../lib/asyncValidation';
import { ValidationIndicator } from './ValidationIndicator';

export interface FormOption {
    label: string;
    value: string;
}

export interface FormFieldDef {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox';
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: FormOption[];
    min?: number;
    max?: number;
    pattern?: string;
    // Async validation configuration
    asyncValidation?: AsyncValidationRule;
}

export interface FormRendererProps<
    TOutput extends Record<string, unknown> = Record<string, unknown>,
> {
    action?: string;
    method?: 'post' | 'get';
    csrfToken?: string | null;
    fields: FormFieldDef[];
    defaultValues?: Record<string, unknown>;
    onSubmitData?: (data: TOutput) => void | Promise<void>;
    submitLabel?: string;
    cancelHref?: string | null;
    cancelLabel?: string;
    api?: {
        endpoint: string;
        method?: 'post' | 'patch' | 'put';
        payload: (values: Record<string, unknown>) => unknown;
        headers?: Record<string, string>;
    };
    nextUrl?: string;
    // Async validation configuration
    asyncValidationConfig?: AsyncValidationConfig;
    // Whether to show validation indicators
    showValidationIndicators?: boolean;
    // Whether to prevent submit while validating
    preventSubmitWhileValidating?: boolean;
}

function buildSchema(defs: FormFieldDef[], options?: { asyncValidationEnabled?: boolean }) {
    const { asyncValidationEnabled = false } = options || {};
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const f of defs) {
        // If field has async validation, we make sync validation less strict
        // to avoid double validation messages
        const hasAsyncValidation = Boolean(f.asyncValidation);
        const shouldRelaxSyncValidation = asyncValidationEnabled && hasAsyncValidation;

        switch (f.type) {
            case 'number': {
                let schema = z
                    .string()
                    .transform((v) => (v === '' || v == null ? null : Number(v)))
                    .refine((v) => v === null || !Number.isNaN(v), { message: 'Invalid number' });

                // Apply min/max constraints for sync validation
                if (typeof f.min === 'number') {
                    schema = schema.refine((v) => v === null || (v as number) >= f.min!, {
                        message: `Min ${f.min}`,
                    });
                }
                if (typeof f.max === 'number') {
                    schema = schema.refine((v) => v === null || (v as number) <= f.max!, {
                        message: `Max ${f.max}`,
                    });
                }

                // Handle required validation - relax if async validation will handle it
                if (f.required && !shouldRelaxSyncValidation) {
                    shape[f.name] = schema.refine((v) => v !== null, {
                        message: 'Required',
                    });
                } else {
                    shape[f.name] = schema.optional();
                }
                break;
            }
            case 'checkbox': {
                let schema = z.boolean().optional();
                if (f.required && !shouldRelaxSyncValidation) {
                    schema = schema.refine((v) => v === true, { message: 'Required' });
                }
                shape[f.name] = schema;
                break;
            }
            case 'date': {
                const s = z.string();
                if (f.required && !shouldRelaxSyncValidation) {
                    shape[f.name] = s.min(1, 'Required');
                } else {
                    shape[f.name] = s.optional();
                }
                break;
            }
            case 'select':
            case 'text':
            case 'textarea':
            default: {
                const base = f.pattern ? z.string().regex(new RegExp(f.pattern)) : z.string();
                if (f.required && !shouldRelaxSyncValidation) {
                    shape[f.name] = base.min(1, 'Required');
                } else {
                    shape[f.name] = base.optional();
                }
                break;
            }
        }
    }

    return z.object(shape);
}

export function FormRenderer<TOutput extends Record<string, unknown> = Record<string, unknown>>({
    action,
    method = 'post',
    csrfToken,
    fields,
    defaultValues,
    onSubmitData,
    submitLabel = 'Save',
    cancelHref,
    cancelLabel = 'Cancel',
    api,
    nextUrl,
    asyncValidationConfig,
    showValidationIndicators = true,
    preventSubmitWhileValidating = true,
}: FormRendererProps<TOutput>) {
    // Determine if async validation is enabled
    const hasAsyncValidation = fields.some((field) => field.asyncValidation);

    const schema = React.useMemo(
        () =>
            buildSchema(fields, {
                asyncValidationEnabled: hasAsyncValidation,
            }),
        [fields, hasAsyncValidation],
    );

    const form = useForm<Record<string, unknown>>({
        resolver: zodResolver(schema),
        defaultValues,
        mode: 'onSubmit',
    });

    const { control, handleSubmit, formState, setError, watch } = form;

    // Watch all form values for async validation
    const watchedValues = watch();

    // Track touched fields
    const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());

    // Create async validation rules from fields
    const asyncValidationRules = React.useMemo(() => {
        return fields.reduce(
            (acc, field) => {
                if (field.asyncValidation) {
                    acc[field.name] = field.asyncValidation;
                }
                return acc;
            },
            {} as Record<string, AsyncValidationRule>,
        );
    }, [fields]);

    // Use async validation hook
    const asyncValidation = useFormAsyncValidation({
        formValues: watchedValues || {},
        rules: asyncValidationRules,
        touchedFields,
        config: asyncValidationConfig,
        enabled: Object.keys(asyncValidationRules).length > 0,
    });

    // Handle field touch
    const handleFieldTouch = React.useCallback((fieldName: string) => {
        setTouchedFields((prev) => new Set([...prev, fieldName]));
    }, []);

    const mutation = useMutation({
        mutationFn: async (values: Record<string, unknown>) => {
            if (!api) return null;
            const data = api.payload(values);
            const method = api.method || 'post';
            const res = await http.request({
                url: api.endpoint,
                method,
                data,
                headers: api.headers,
            });
            return res.data;
        },
    });

    const onSubmit: SubmitHandler<Record<string, unknown>> = async (data) => {
        // Trigger validation for all async validation rules before submit
        if (Object.keys(asyncValidationRules).length > 0) {
            asyncValidation.validateAll();

            // If we're preventing submit while validating, wait for validation to complete
            if (preventSubmitWhileValidating && asyncValidation.isValidating) {
                return; // Don't submit while validating
            }

            // If there are async validation errors, don't submit
            if (asyncValidation.hasErrors) {
                // Set async validation errors on the form
                Object.entries(asyncValidation.errors).forEach(([fieldName, message]) => {
                    setError(fieldName as never, { message });
                });
                return;
            }
        }

        if (api) {
            try {
                await mutation.mutateAsync(data);
                if (cancelHref || nextUrl) {
                    window.location.href = (nextUrl || cancelHref) as string;
                }
            } catch (err) {
                const { fieldErrors, formError } = normalizeDrfErrors(err);
                if (formError) setError('root', { message: formError });
                (Object.entries(fieldErrors) as Array<[string, string]>).forEach(
                    ([fieldName, message]) => {
                        // Controller name is a string field key
                        setError(fieldName as never, { message });
                    },
                );
            }
            return;
        }
        if (onSubmitData) {
            await onSubmitData(data as TOutput);
            return;
        }
        if (!action) return;
        const formEl = document.createElement('form');
        formEl.method = method;
        formEl.action = action;
        if (csrfToken) {
            const csrf = document.createElement('input');
            csrf.type = 'hidden';
            csrf.name = 'csrfmiddlewaretoken';
            csrf.value = csrfToken;
            formEl.appendChild(csrf);
        }
        Object.entries(data).forEach(([name, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value == null ? '' : String(value);
            formEl.appendChild(input);
        });
        document.body.appendChild(formEl);
        formEl.submit();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((f) => {
                // Get async validation for this field (moved outside Controller)
                const fieldAsyncValidation = asyncValidation.validationResults[f.name];

                return (
                    <div key={f.name} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {f.label}
                            {f.required ? <span className="text-red-600"> *</span> : null}
                        </label>
                        <Controller
                            // Casting the discriminated union is safe for RHF Controller generic
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            name={f.name as any}
                            control={control}
                            render={({ field, fieldState }) => {
                                // Enhance input props with async validation handlers
                                const enhancedInputProps = {
                                    ...{
                                        id: f.name,
                                        placeholder: f.placeholder,
                                        className:
                                            'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600/50',
                                        onChange: field.onChange,
                                        onBlur: (
                                            e: React.FocusEvent<
                                                | HTMLInputElement
                                                | HTMLTextAreaElement
                                                | HTMLSelectElement
                                            >,
                                        ) => {
                                            field.onBlur();
                                            handleFieldTouch(f.name);
                                        },
                                        name: field.name,
                                        ref: field.ref,
                                    },
                                    // Add validation state styling
                                    ...(fieldAsyncValidation &&
                                    !fieldAsyncValidation.isValid &&
                                    fieldAsyncValidation.error
                                        ? {
                                              className:
                                                  'block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-red-600/50',
                                          }
                                        : {}),
                                };
                                // Use enhanced input props
                                const inputProps = enhancedInputProps;
                                switch (f.type) {
                                    case 'textarea':
                                        return (
                                            <textarea
                                                {...inputProps}
                                                rows={4}
                                                value={(field.value as string) ?? ''}
                                            />
                                        );
                                    case 'number':
                                        return (
                                            <input
                                                {...inputProps}
                                                inputMode="decimal"
                                                value={
                                                    field.value === null ||
                                                    field.value === undefined
                                                        ? ''
                                                        : String(field.value)
                                                }
                                            />
                                        );
                                    case 'date':
                                        return (
                                            <input
                                                {...inputProps}
                                                type="date"
                                                value={(field.value as string) ?? ''}
                                            />
                                        );
                                    case 'select':
                                        return (
                                            <select
                                                {...inputProps}
                                                value={(field.value as string) ?? ''}
                                            >
                                                <option value="">Select…</option>
                                                {(f.options || []).map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    case 'checkbox':
                                        return (
                                            <input
                                                id={f.name}
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600/50"
                                                checked={Boolean(field.value)}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    handleFieldTouch(f.name);
                                                }}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        );
                                    case 'text':
                                    default:
                                        return (
                                            <input
                                                {...inputProps}
                                                value={(field.value as string) ?? ''}
                                            />
                                        );
                                }
                            }}
                        />
                        {f.helpText && !fieldAsyncValidation?.error && !formState.errors[f.name] ? (
                            <p className="text-xs text-gray-500">{f.helpText}</p>
                        ) : null}

                        {/* Async validation indicator */}
                        {showValidationIndicators && fieldAsyncValidation ? (
                            <ValidationIndicator
                                validation={fieldAsyncValidation}
                                fieldName={f.name}
                                className="mt-1"
                            />
                        ) : null}

                        {/* React Hook Form error display */}
                        {formState.errors[f.name] && !fieldAsyncValidation?.error ? (
                            <p className="text-sm text-red-600 mt-1">
                                {(formState.errors[f.name] as any)?.message}
                            </p>
                        ) : null}
                    </div>
                );
            })}
            <div className="flex items-center gap-2 pt-2">
                <button
                    type="submit"
                    disabled={
                        mutation.isPending ||
                        (preventSubmitWhileValidating && asyncValidation.isValidating)
                    }
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600/50 disabled:opacity-50"
                >
                    {asyncValidation.isValidating ? 'Validating...' : submitLabel}
                </button>
                {cancelHref ? (
                    <a
                        href={cancelHref}
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-gray-300/50"
                    >
                        {cancelLabel}
                    </a>
                ) : null}
            </div>
        </form>
    );
}

export default FormRenderer;
