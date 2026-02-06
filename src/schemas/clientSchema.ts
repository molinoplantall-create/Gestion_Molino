import { z } from 'zod';

// Client Schema
export const clientSchema = z.object({
    nombre: z.string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres'),

    tipoCliente: z.enum(['MINERO', 'PALLAQUERO'], {
        errorMap: () => ({ message: 'Tipo de cliente inválido' })
    }),

    zona: z.string()
        .min(1, 'Debe seleccionar una zona'),

    email: z.string()
        .email('Email inválido')
        .optional()
        .or(z.literal('')),

    telefono: z.string()
        .regex(/^\d{9}$/, 'El teléfono debe tener 9 dígitos')
        .optional()
        .or(z.literal('')),

    direccion: z.string()
        .max(200, 'La dirección no puede exceder 200 caracteres')
        .optional(),

    ruc: z.string()
        .max(11, 'El RUC no puede exceder 11 caracteres')
        .optional(),

    contacto: z.string()
        .max(100, 'El contacto no puede exceder 100 caracteres')
        .optional(),

    observaciones: z.string()
        .max(500, 'Las observaciones no pueden exceder 500 caracteres')
        .optional()
});

export type ClientFormData = z.infer<typeof clientSchema>;
