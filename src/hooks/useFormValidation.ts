import { useState } from 'react';
import { ZodSchema, ZodError } from 'zod';
import { getFieldErrors } from '../utils/zodHelpers';

interface UseFormValidationOptions<T> {
    schema: ZodSchema<T>;
    onSuccess?: (data: T) => void | Promise<void>;
    onError?: (errors: Record<string, string>) => void;
}

export function useFormValidation<T>({
    schema,
    onSuccess,
    onError
}: UseFormValidationOptions<T>) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isValidating, setIsValidating] = useState(false);

    const validate = async (data: unknown): Promise<boolean> => {
        setIsValidating(true);
        setErrors({});

        try {
            const validData = schema.parse(data);
            setIsValidating(false);

            if (onSuccess) {
                await onSuccess(validData);
            }

            return true;
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors = getFieldErrors(error);
                setErrors(fieldErrors);

                if (onError) {
                    onError(fieldErrors);
                }
            }

            setIsValidating(false);
            return false;
        }
    };

    const validateField = (field: string, value: unknown): string | null => {
        try {
            // @ts-ignore - accessing shape dynamically
            const fieldSchema = schema.shape[field];
            if (fieldSchema) {
                fieldSchema.parse(value);
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
                return null;
            }
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessage = error.issues[0]?.message || 'Error de validación';
                setErrors(prev => ({ ...prev, [field]: errorMessage }));
                return errorMessage;
            }
        }
        return null;
    };

    const clearErrors = () => {
        setErrors({});
    };

    const clearFieldError = (field: string) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    return {
        errors,
        isValidating,
        validate,
        validateField,
        clearErrors,
        clearFieldError,
        hasErrors: Object.keys(errors).length > 0
    };
}
