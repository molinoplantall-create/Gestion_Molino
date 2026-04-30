import { z } from 'zod';

// Maintenance Schema
export const maintenanceSchema = z.object({
    molinoId: z.string()
        .min(1, 'Debe seleccionar un molino'),

    tipo: z.enum(['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'EMERGENCIA'], {
        errorMap: () => ({ message: 'Tipo de mantenimiento inválido' })
    }),

    descripcion: z.string()
        .min(3, 'La descripción debe tener al menos 3 caracteres')
        .max(500, 'La descripción no puede exceder 500 caracteres'),

    fechaProgramada: z.string()
        .min(1, 'Debe seleccionar una fecha'),

    prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'], {
        errorMap: () => ({ message: 'Prioridad inválida' })
    }),

    horasEstimadas: z.number()
        .min(1, 'Las horas estimadas deben ser al menos 1')
        .max(24, 'Las horas estimadas no pueden exceder 24'),

    asignadoA: z.string()
        .min(1, 'Debe asignar el mantenimiento a alguien'),

    categoria: z.string().optional()
});

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
