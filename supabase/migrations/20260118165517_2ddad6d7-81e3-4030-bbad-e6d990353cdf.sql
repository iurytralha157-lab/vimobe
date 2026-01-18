-- Update user role to super_admin
UPDATE public.users 
SET role = 'super_admin' 
WHERE email = 'Companyvetter@gmail.com';