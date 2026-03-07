-- ==========================================================
-- SCRIPT DE LIMPIEZA Y ESTANDARIZACIÓN DE DATOS (ZONAS)
-- ==========================================================

DO $$ 
DECLARE
    zona_destino_id UUID;
    zona_camargo_id UUID;
    zona_cortoda_id UUID;
BEGIN
    -- 1. Asegurar que existe 'Zona Camargo'
    INSERT INTO public.zones (name) 
    VALUES ('Zona Camargo') 
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO zona_destino_id FROM public.zones WHERE name = 'Zona Camargo' LIMIT 1;

    -- 2. Identificar el ID de 'camargo' (si existe como fila en tabla zones)
    SELECT id INTO zona_camargo_id FROM public.zones WHERE name ILIKE 'camargo' AND name != 'Zona Camargo' LIMIT 1;

    -- 3. MIGRACIÓN DE TEXTO EN TABLAS (Donde se guarda el nombre directamente)
    
    -- Clientes
    UPDATE public.clients SET zone = 'Zona Camargo' WHERE zone ILIKE 'camargo' OR zone IS NULL OR zone = '';
    UPDATE public.clients SET zone = 'Zona Camargo' WHERE zone ILIKE 'Cortoda';

    -- Lotes de Stock
    UPDATE public.stock_batches SET zone = 'Zona Camargo' WHERE zone ILIKE 'camargo';
    UPDATE public.stock_batches SET zone = 'Zona Camargo' WHERE zone ILIKE 'Cortoda';
    
    -- Logs de Molienda (Si tienen columna zone)
    -- UPDATE public.milling_logs SET zone = 'Zona Camargo' WHERE zone ILIKE 'camargo' OR zone ILIKE 'Cortoda';

    -- 4. LIMPIEZA DE TABLA 'zones' (Para eliminar 'camargo' y 'Cortoda' del dropdown)
    DELETE FROM public.zones WHERE name ILIKE 'camargo' AND name != 'Zona Camargo';
    DELETE FROM public.zones WHERE name ILIKE 'Cortoda';

    -- 5. ELIMINAR CUALQUIER OTRA REFERENCIA QUE BLOQUEE ELIMINACIÓN
    -- Si hay tablas con FK a zones, aquí las reasignamos (Ejemplo hipotético)
    -- UPDATE public.items SET zone_id = zona_destino_id WHERE zone_id IN (zona_camargo_id, zona_cortoda_id);

END $$;

COMMENT ON TABLE public.zones IS 'Zonas estandarizadas: camargo -> Zona Camargo, Cortoda eliminado.';
