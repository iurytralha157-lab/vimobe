-- Migration: Create organization_members table for multi-org support
-- Run this in Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- 2. Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Super admin bypass function
CREATE OR REPLACE FUNCTION public.is_super_admin_member_bypass(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'super_admin'
  )
$$;

-- 4. RLS Policies
CREATE POLICY "Users can view own memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view org memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert org memberships"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can update org memberships"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Super admins full access to org members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (public.is_super_admin_member_bypass(auth.uid()));

-- 5. Migrate existing data from users table
INSERT INTO public.organization_members (user_id, organization_id, role, is_active, joined_at, created_at)
SELECT 
  id as user_id,
  organization_id,
  CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END as role,
  COALESCE(is_active, true) as is_active,
  COALESCE(created_at, now()) as joined_at,
  now() as created_at
FROM public.users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
