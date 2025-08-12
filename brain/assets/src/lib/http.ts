import axios from 'axios';

export const http = axios.create({
    baseURL: '/api',
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
});

export type DRFError = Record<string, string[] | string> & {
    detail?: string;
    non_field_errors?: string[];
};

export function normalizeDrfErrors(err: unknown): {
    fieldErrors: Record<string, string>;
    formError?: string;
} {
    const fieldErrors: Record<string, string> = {};
    let formError: string | undefined;

    // Axios error shape
    const data: DRFError | undefined = (err as any)?.response?.data as DRFError | undefined;
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            if (key === 'non_field_errors' && Array.isArray(value)) {
                formError = value.join(' ');
                continue;
            }
            if (key === 'detail' && typeof value === 'string') {
                formError = value;
                continue;
            }
            if (Array.isArray(value)) {
                fieldErrors[key] = value.join(' ');
            } else if (typeof value === 'string') {
                fieldErrors[key] = value;
            }
        }
    } else {
        formError = 'Unexpected error';
    }

    return { fieldErrors, formError };
}
