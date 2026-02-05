-- Create zones table
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.zones
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.zones
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO public.zones (name) VALUES 
('Norte'), 
('Sur'), 
('Centro'), 
('Este'), 
('Oeste')
ON CONFLICT (name) DO NOTHING;
