-- SQL Script: Estandarización Segura (Versión con comprobaciones)
-- Ejecuta esto para corregir las columnas que fallaron anteriormente.

DO $$ 
BEGIN 
  -- 1. Tabla: mills (Nombre -> name)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mills' AND column_name='Name') THEN
    ALTER TABLE public.mills RENAME COLUMN "Name" TO name;
    RAISE NOTICE 'Tabla mills: Columna Name renombrada a name.';
  ELSE
    RAISE NOTICE 'Tabla mills: La columna Name no existe (quizás ya es minúscula).';
  END IF;

  -- 2. Tabla: milling_logs (Client_id -> client_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='milling_logs' AND column_name='Client_id') THEN
    ALTER TABLE public.milling_logs RENAME COLUMN "Client_id" TO client_id;
    RAISE NOTICE 'Tabla milling_logs: Columna Client_id renombrada a client_id.';
  ELSE
    RAISE NOTICE 'Tabla milling_logs: La columna Client_id no existe.';
  END IF;

  -- 4. Tabla: user_profiles (Nombre -> nombre, Created_at -> created_at)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='Nombre') THEN
    ALTER TABLE public.user_profiles RENAME COLUMN "Nombre" TO nombre;
    RAISE NOTICE 'Tabla user_profiles: Columna Nombre renombrada a nombre.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='Created_at') THEN
    ALTER TABLE public.user_profiles RENAME COLUMN "Created_at" TO created_at;
    RAISE NOTICE 'Tabla user_profiles: Columna Created_at renombrada a created_at.';
  END IF;

END $$;
