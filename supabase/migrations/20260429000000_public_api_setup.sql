-- Create organization_api_keys table
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies for organization_api_keys
CREATE POLICY "Admins can view their org api keys" 
ON public.organization_api_keys FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = organization_api_keys.organization_id
        AND users.role = 'admin'
    )
);

CREATE POLICY "Admins can delete their org api keys" 
ON public.organization_api_keys FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = organization_api_keys.organization_id
        AND users.role = 'admin'
    )
);

-- Function to generate API key (SECURITY DEFINER to handle hashing and storage)
CREATE OR REPLACE FUNCTION public.generate_organization_api_key(
    p_organization_id UUID,
    p_name TEXT DEFAULT 'Chave Padrão'
)
RETURNS TABLE (api_key TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raw_key TEXT;
    v_key_hash TEXT;
    v_key_prefix TEXT;
BEGIN
    -- Check if caller is admin of the target org
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = p_organization_id
        AND users.role = 'admin'
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Generate a secure random key
    v_raw_key := 'sk_live_' || encode(gen_random_bytes(24), 'hex');
    v_key_prefix := substring(v_raw_key from 1 for 12);
    
    -- Hash the key for storage (SHA256)
    v_key_hash := encode(digest(v_raw_key, 'sha256'), 'hex');

    -- Insert into table
    INSERT INTO public.organization_api_keys (organization_id, name, key_hash, key_prefix)
    VALUES (p_organization_id, p_name, v_key_hash, v_key_prefix);

    RETURN QUERY SELECT v_raw_key;
END;
$$;
