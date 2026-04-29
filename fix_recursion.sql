-- 1. Remover as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Admins can view org memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can update org memberships" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert org memberships" ON organization_members;

-- 2. Recriar as políticas usando a tabela 'users' para evitar recursão
CREATE POLICY "Admins can view org memberships" ON organization_members
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' 
  AND 
  (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
);

CREATE POLICY "Admins can update org memberships" ON organization_members
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' 
  AND 
  (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
);

CREATE POLICY "Admins can insert org memberships" ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' 
  AND 
  (SELECT organization_id FROM public.users WHERE id = auth.uid()) = organization_id
);

-- 3. Garantir que super_admins continuem com acesso total (já existe a função is_super_admin_member_bypass)
-- A política "Super admins full access to org members" já usa essa função e não causa recursão direta.
