UPDATE public.users 
SET role = 'super_admin' 
WHERE LOWER(email) = LOWER('Companyvetter@gmail.com');