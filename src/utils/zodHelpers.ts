import { ZodError } from 'zod';

/**
 * Formats all Zod errors into a single string
 */
export const formatZodError = (error: ZodError): string => {
    return error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
};

/**
 * Gets the first error message from a Zod error
 */
export const getFirstZodError = (error: ZodError): string => {
    return error.issues[0]?.message || 'Error de validación';
};

/**
 * Displays all Zod errors as toast notifications
 */
export const zodErrorToToast = (error: ZodError, toast: any) => {
    error.issues.forEach(issue => {
        const field = issue.path.join('.');
        toast.error(field || 'Error', issue.message);
    });
};

/**
 * Gets field-specific errors from Zod validation
 */
export const getFieldErrors = (error: ZodError): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};

    error.issues.forEach(issue => {
        const field = issue.path.join('.');
        if (field && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
        }
    });

    return fieldErrors;
};
