-- Agrega la columna current_mineral a la tabla mills si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='mills' AND column_name='current_mineral'
    ) THEN
        ALTER TABLE mills ADD COLUMN current_mineral VARCHAR(50);
    END IF;
END $$;
