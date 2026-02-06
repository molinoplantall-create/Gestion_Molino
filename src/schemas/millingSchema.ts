import { z } from 'zod';

// Milling Process Schema
export const millingProcessSchema = z.object({
    clientId: z.string()
        .min(1, 'Debe seleccionar un cliente'),

    mineral: z.enum(['OXIDO', 'SULFURO'], {
        errorMap: () => ({ message: 'Tipo de mineral inválido' })
    }),

    totalSacos: z.number()
        .min(1, 'Debe ingresar al menos 1 saco')
        .max(1000, 'No puede procesar más de 1000 sacos a la vez'),

    totalCuarzo: z.number()
        .min(0, 'El cuarzo no puede ser negativo'),

    totalLlampo: z.number()
        .min(0, 'El llampo no puede ser negativo'),

    observaciones: z.string()
        .max(500, 'Las observaciones no pueden exceder 500 caracteres')
        .optional()
});

// Validation for individual mill
export const millConfigSchema = z.object({
    cuarzo: z.number()
        .min(0, 'El cuarzo no puede ser negativo')
        .max(200, 'Excede la capacidad del molino'),

    llampo: z.number()
        .min(0, 'El llampo no puede ser negativo')
        .max(200, 'Excede la capacidad del molino'),

    total: z.number()
        .min(1, 'Debe ingresar al menos 1 saco')
        .max(200, 'Excede la capacidad del molino')
});

export type MillingProcessData = z.infer<typeof millingProcessSchema>;
export type MillConfigData = z.infer<typeof millConfigSchema>;
