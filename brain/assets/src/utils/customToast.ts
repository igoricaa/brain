import { toast } from 'sonner';

/**
 * Custom toast positions that align with the submit button area
 * Submit button is in a sticky bottom bar at `fixed bottom-0 left-64 right-0`
 */

export interface CustomToastOptions {
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Shows a success toast positioned 40px above the submit button,
 * right-aligned with the submit button area
 */
export const showSubmitAreaSuccessToast = (message: string, options: CustomToastOptions = {}) => {
    return toast.success(message, {
        ...options,
        position: 'bottom-center',
        style: {
            // Position exactly 40px above the submit button
            // Submit bar: p-4 (16px) + h-11 button (44px) + p-4 (16px) = 76px total height
            // 76px bar + 40px spacing = 116px from bottom
            bottom: '116px',
            // Align right edge with submit button's right edge
            // Container has max-w-7xl mx-auto p-4, so 16px right padding
            right: '1rem', // 16px to match container p-4 padding
            minWidth: 'auto',
            maxWidth: '255px',
            zIndex: 55, // Above submit bar (z-50) but below modals
        },
        className: 'submit-area-toast',
    });
};

/**
 * Shows an error toast positioned 40px above the submit button,
 * right-aligned with the submit button area
 */
export const showSubmitAreaErrorToast = (message: string, options: CustomToastOptions = {}) => {
    return toast.error(message, {
        ...options,
        position: 'bottom-right',
        style: {
            // Position exactly 40px above the submit button
            // Submit bar: p-4 (16px) + h-11 button (44px) + p-4 (16px) = 76px total height
            // 76px bar + 40px spacing = 116px from bottom
            bottom: '116px',
            // Align right edge with submit button's right edge
            // Container has max-w-7xl mx-auto p-4, so 16px right padding
            right: '1rem', // 16px to match container p-4 padding
            minWidth: 'auto',
            maxWidth: '400px',
            zIndex: 55, // Above submit bar (z-50) but below modals
        },
        className: 'submit-area-toast',
    });
};

/**
 * Shows an info toast positioned 40px above the submit button,
 * right-aligned with the submit button area
 */
export const showSubmitAreaInfoToast = (message: string, options: CustomToastOptions = {}) => {
    return toast.info(message, {
        ...options,
        position: 'bottom-right',
        style: {
            // Position exactly 40px above the submit button
            // Submit bar: p-4 (16px) + h-11 button (44px) + p-4 (16px) = 76px total height
            // 76px bar + 40px spacing = 116px from bottom
            bottom: '116px',
            // Align right edge with submit button's right edge
            // Container has max-w-7xl mx-auto p-4, so 16px right padding
            right: '1rem', // 16px to match container p-4 padding
            minWidth: 'auto',
            maxWidth: '400px',
            zIndex: 55, // Above submit bar (z-50) but below modals
        },
        className: 'submit-area-toast',
    });
};
