-- Tabla de usuarios (extensión de auth.users de Supabase)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'OPERADOR', 'GERENCIA')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de molinos
CREATE TABLE mills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'LIBRE' CHECK (estado IN ('LIBRE', 'OCUPADO', 'MANTENIMIENTO')),
  sacos_procesados INTEGER DEFAULT 0,
  horas_trabajadas DECIMAL(10,2) DEFAULT 0,
  ultimo_mantenimiento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  contacto VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  zona VARCHAR(50),
  stock_actual INTEGER DEFAULT 0,
  total_sacos INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de moliendas
CREATE TABLE milling_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  molino_id UUID REFERENCES mills(id) NOT NULL,
  cliente_id UUID REFERENCES clients(id) NOT NULL,
  cantidad_sacos INTEGER NOT NULL CHECK (cantidad_sacos > 0),
  mineral VARCHAR(20) NOT NULL CHECK (mineral IN ('OXIDO', 'SULFURO')),
  sub_mineral VARCHAR(20) NOT NULL CHECK (sub_mineral IN ('CUARZO', 'LLAMPO')),
  hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  hora_fin_calculada TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  estado VARCHAR(20) DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO', 'FINALIZADO')),
  operador_id UUID REFERENCES users(id) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mantenimiento
CREATE TABLE maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  molino_id UUID REFERENCES mills(id) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('PREVENTIVO', 'CORRECTIVO')),
  descripcion_falla TEXT,
  accion_tomada TEXT NOT NULL,
  horas_trabajadas DECIMAL(10,2) NOT NULL,
  requiere_notificacion BOOLEAN DEFAULT false,
  asignado_a VARCHAR(100),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('MOLIENDA', 'MANTENIMIENTO', 'SISTEMA')),
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de stock (auditoría)
CREATE TABLE stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clients(id) NOT NULL,
  producto VARCHAR(200) NOT NULL,
  cantidad_actual INTEGER NOT NULL,
  cantidad_minima INTEGER NOT NULL,
  cantidad_maxima INTEGER NOT NULL,
  ubicacion VARCHAR(100),
  ultimo_movimiento VARCHAR(10) CHECK (ultimo_movimiento IN ('ENTRADA', 'SALIDA')),
  ultima_cantidad INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de auditoría
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_milling_sessions_cliente_id ON milling_sessions(cliente_id);
CREATE INDEX idx_milling_sessions_molino_id ON milling_sessions(molino_id);
CREATE INDEX idx_milling_sessions_hora_inicio ON milling_sessions(hora_inicio);
CREATE INDEX idx_maintenance_logs_molino_id ON maintenance_logs(molino_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_leida ON notifications(leida);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_mills_updated_at BEFORE UPDATE ON mills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milling_sessions_updated_at BEFORE UPDATE ON milling_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_logs_updated_at BEFORE UPDATE ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular hora fin automáticamente
CREATE OR REPLACE FUNCTION calcular_hora_fin()
RETURNS TRIGGER AS $$
DECLARE
  duracion_minutos INTEGER;
BEGIN
  -- Cálculo basado en mineral y cantidad de sacos
  IF NEW.mineral = 'OXIDO' THEN
    duracion_minutos := 100; -- 1:40 fijo
  ELSE
    -- Sulfuro: 120-150 minutos proporcional por saco
    duracion_minutos := 120 + CEIL((NEW.cantidad_sacos * 3)::DECIMAL);
    IF duracion_minutos > 150 THEN
      duracion_minutos := 150;
    END IF;
  END IF;
  
  NEW.duracion_minutos := duracion_minutos;
  NEW.hora_fin_calculada := NEW.hora_inicio + (duracion_minutos || ' minutes')::INTERVAL;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calcular_hora_fin_trigger BEFORE INSERT OR UPDATE ON milling_sessions
  FOR EACH ROW EXECUTE FUNCTION calcular_hora_fin();

-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION actualizar_stock_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Al registrar una molienda, descontar del stock del cliente
  IF TG_OP = 'INSERT' THEN
    UPDATE clients 
    SET stock_actual = stock_actual - NEW.cantidad_sacos,
        total_sacos = total_sacos + NEW.cantidad_sacos,
        updated_at = NOW()
    WHERE id = NEW.cliente_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER actualizar_stock_trigger AFTER INSERT ON milling_sessions
  FOR EACH ROW EXECUTE FUNCTION actualizar_stock_cliente();

-- Función para notificaciones automáticas
CREATE OR REPLACE FUNCTION notificar_molienda_completada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'FINALIZADO' AND OLD.estado = 'EN_PROCESO' THEN
    INSERT INTO notifications (tipo, titulo, mensaje, user_id)
    VALUES (
      'MOLIENDA',
      'Molienda completada',
      'La molienda ' || NEW.id || ' ha finalizado',
      NEW.operador_id
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER notificar_molienda_trigger AFTER UPDATE ON milling_sessions
  FOR EACH ROW EXECUTE FUNCTION notificar_molienda_completada();

-- Insertar datos iniciales
INSERT INTO mills (nombre, estado, sacos_procesados, horas_trabajadas) VALUES
  ('Molino I', 'OCUPADO', 1250, 320),
  ('Molino II', 'LIBRE', 980, 280),
  ('Molino III', 'MANTENIMIENTO', 890, 310),
  ('Molino IV', 'LIBRE', 1100, 290);

-- Políticas de seguridad RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mills ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE milling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY "Todos pueden ver molinos" ON mills FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver clientes" ON clients FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados pueden ver moliendas" ON milling_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores pueden insertar moliendas" ON milling_sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol IN ('ADMIN', 'OPERADOR')));