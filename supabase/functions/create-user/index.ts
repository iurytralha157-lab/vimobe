import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a strong random password (12 chars: upper, lower, number, special)
function generateRandomPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + numbers + special;

  // Ensure at least one of each
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  return pwd.sort(() => Math.random() - 0.5).join('');
}

async function sendWelcomeWhatsApp(
  supabaseAdmin: any,
  organizationId: string,
  toPhone: string,
  name: string,
  email: string,
  password: string,
) {
  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.log('[welcome-msg] Evolution API not configured, skipping');
      return { sent: false, reason: 'evolution_not_configured' };
    }

    // Find notification instance
    let instanceName: string | null = null;
    const { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('instance_name, status')
      .eq('organization_id', organizationId)
      .eq('is_notification_session', true)
      .maybeSingle();

    if (session?.status === 'connected' && session.instance_name) {
      instanceName = session.instance_name;
    } else {
      const { data: systemSettings } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .limit(1)
        .maybeSingle();
      const globalInstance = (systemSettings?.value as any)?.notification_instance_name;
      if (globalInstance) instanceName = globalInstance;
    }

    if (!instanceName) {
      console.log('[welcome-msg] No notification instance available');
      return { sent: false, reason: 'no_instance' };
    }

    const formattedPhone = toPhone.replace(/\D/g, '');
    if (!formattedPhone || formattedPhone.length < 10) {
      return { sent: false, reason: 'invalid_phone' };
    }

    const loginUrl = 'https://vimob.vettercompany.com.br/auth';
    const message =
      `👋 Olá *${name}*, seja bem-vindo(a) ao Vimob CRM!\n\n` +
      `Sua conta foi criada com sucesso. Aqui estão seus dados de acesso:\n\n` +
      `🔗 *Link de acesso:* ${loginUrl}\n` +
      `📧 *Login (e-mail):* ${email}\n` +
      `🔑 *Senha:* ${password}\n\n` +
      `Por segurança, recomendamos alterar a senha após o primeiro acesso em *Configurações → Minha Conta*.`;

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: formattedPhone, text: message }),
    });

    const data = await response.json().catch(() => ({}));
    console.log('[welcome-msg] sent:', { phone: formattedPhone, instance: instanceName, status: response.status });
    return { sent: response.ok, status: response.status, data };
  } catch (e) {
    console.error('[welcome-msg] error:', e);
    return { sent: false, reason: 'exception', error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({
        error: 'Token de autenticação não fornecido. Por favor, faça login novamente.',
        code: 'MISSING_AUTH_HEADER'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      console.error('Auth validation failed:', authError?.message || 'User not found');
      return new Response(JSON.stringify({
        error: 'Sua sessão expirou. Por favor, faça login novamente.',
        code: 'SESSION_EXPIRED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's profile to check permissions
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('id', callerUser.id)
      .single();

    // Check if caller is super admin
    const { data: superAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'super_admin')
      .single();

    const isSuperAdmin = !!superAdminRole;
    const isOrgAdmin = callerProfile?.role === 'admin';

    if (!isSuperAdmin && !isOrgAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions. Must be an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, role, organizationId, phone, whatsapp, endereco } = await req.json();

    if (!name || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, email, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which organization to use
    let targetOrgId = organizationId;
    if (!isSuperAdmin) {
      targetOrgId = callerProfile?.organization_id;
    }

    if (!targetOrgId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', targetOrgId)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a random password for this account
    const generatedPassword = generateRandomPassword(12);
    // Use whatsapp field if provided, fallback to phone
    const contactWhatsapp = (whatsapp || phone || '').toString().trim() || null;

    // Check if email already exists in public.users
    let { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name')
      .eq('email', email)
      .maybeSingle();

    // If not found in public.users, check auth.users (orphan auth entry from previous failed deletion)
    if (!existingUser) {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authMatch = authList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (authMatch) {
        console.log(`Found orphan auth user ${email} (no public.users row). Recreating profile...`);
        // Create the public.users profile linked to existing auth id
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: authMatch.id,
            email,
            name,
            phone: contactWhatsapp,
            whatsapp: contactWhatsapp,
            endereco: endereco || null,
            role: role as 'admin' | 'user',
            organization_id: targetOrgId,
            is_active: true,
          }, { onConflict: 'id' });

        if (insertError) {
          console.error('Error creating profile for orphan auth user:', insertError);
          return new Response(JSON.stringify({ error: `Email já cadastrado no sistema de autenticação. Erro ao recriar perfil: ${insertError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Reset password to a fresh generated one and resend
        await supabaseAdmin.auth.admin.updateUserById(authMatch.id, {
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { name },
        });

        // Add role + membership
        await supabaseAdmin.from('user_roles').upsert(
          { user_id: authMatch.id, role: role as 'admin' | 'user' },
          { onConflict: 'user_id,role' }
        );
        await supabaseAdmin.from('organization_members').upsert(
          { user_id: authMatch.id, organization_id: targetOrgId, role: role as 'admin' | 'user', is_active: true },
          { onConflict: 'user_id,organization_id' }
        );

        // Send welcome whatsapp
        let welcomeResult: any = { sent: false };
        if (contactWhatsapp) {
          welcomeResult = await sendWelcomeWhatsApp(
            supabaseAdmin,
            targetOrgId,
            contactWhatsapp,
            name,
            email,
            generatedPassword,
          );
        }

        return new Response(JSON.stringify({
          success: true,
          user: { id: authMatch.id, email, name, role },
          wasAuthOrphan: true,
          generatedPassword,
          whatsappSent: welcomeResult.sent,
          message: 'Usuário recuperado de cadastro órfão. Nova senha enviada.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (existingUser) {
      // Check if the user exists in auth.users
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingUser.id);

      // If user exists in public.users but NOT in auth.users, create auth entry
      if (!authUser?.user) {
        console.log(`User ${email} exists in users table but not in auth. Creating auth entry...`);

        const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          id: existingUser.id,
          email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: { name: name || existingUser.name },
        });

        if (createAuthError) {
          console.error('Error creating auth user for existing profile:', createAuthError);
          return new Response(JSON.stringify({ error: createAuthError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            organization_id: existingUser.organization_id || targetOrgId,
            role: role as 'admin' | 'user',
            name: name || existingUser.name,
            phone: contactWhatsapp,
            whatsapp: contactWhatsapp,
            endereco: endereco || null,
            is_active: true,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
        }

        await supabaseAdmin
          .from('organization_members')
          .upsert({
            user_id: existingUser.id,
            organization_id: existingUser.organization_id || targetOrgId,
            role: role as 'admin' | 'user',
            is_active: true,
          }, { onConflict: 'user_id,organization_id' });

        // Send welcome whatsapp
        let welcomeResult: any = { sent: false };
        if (contactWhatsapp) {
          welcomeResult = await sendWelcomeWhatsApp(
            supabaseAdmin,
            existingUser.organization_id || targetOrgId,
            contactWhatsapp,
            name || existingUser.name,
            email,
            generatedPassword,
          );
        }

        console.log(`Auth entry created for orphan user: ${email}`);
        return new Response(JSON.stringify({
          success: true,
          user: {
            id: existingUser.id,
            email,
            name: name || existingUser.name,
            role,
          },
          wasAuthOrphan: true,
          generatedPassword,
          whatsappSent: welcomeResult.sent,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If user exists without organization, add them to the current org
      if (!existingUser.organization_id) {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            organization_id: targetOrgId,
            role: role as 'admin' | 'user',
            name: name || existingUser.name,
            phone: contactWhatsapp,
            whatsapp: contactWhatsapp,
            endereco: endereco || null,
            is_active: true,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Error updating orphan user:', updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabaseAdmin
          .from('organization_members')
          .upsert({
            user_id: existingUser.id,
            organization_id: targetOrgId,
            role: role as 'admin' | 'user',
            is_active: true,
          }, { onConflict: 'user_id,organization_id' });

        console.log(`Orphan user ${email} added to org ${org.name}`);
        return new Response(JSON.stringify({
          success: true,
          user: {
            id: existingUser.id,
            email,
            name: name || existingUser.name,
            role,
          },
          wasOrphan: true,
          message: 'Usuário existente vinculado à organização. A senha atual dele continua válida.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User already belongs to an organization
      if (existingUser.organization_id === targetOrgId) {
        const { data: existingMember } = await supabaseAdmin
          .from('organization_members')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('organization_id', targetOrgId)
          .maybeSingle();

        if (existingMember) {
          return new Response(JSON.stringify({ error: 'Este usuário já pertence a esta organização' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Multi-org: Add user to new organization via organization_members
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .upsert({
          user_id: existingUser.id,
          organization_id: targetOrgId,
          role: role as 'admin' | 'user',
          is_active: true,
        }, { onConflict: 'user_id,organization_id' });

      if (memberError) {
        console.error('Error adding user to organization:', memberError);
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User ${email} added to org ${org.name} (multi-org)`);
      return new Response(JSON.stringify({
        success: true,
        user: {
          id: existingUser.id,
          email,
          name: existingUser.name,
          role,
        },
        wasMultiOrg: true,
        message: `Usuário adicionado à organização ${org.name}. O acesso será feito com a senha existente.`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== NEW USER FLOW ==========
    // 1. Create auth user with random generated password
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createAuthError || !authData.user) {
      console.error('Error creating auth user:', createAuthError);
      const isEmailExists = createAuthError?.message?.toLowerCase().includes('already been registered') ||
        (createAuthError as any)?.code === 'email_exists';
      const friendlyMessage = isEmailExists
        ? 'Este email já está cadastrado no sistema. Verifique se o usuário já existe ou entre em contato com o suporte.'
        : (createAuthError?.message || 'Erro ao criar usuário');
      return new Response(JSON.stringify({ error: friendlyMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create/update user profile (upsert handles auth trigger race)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        name,
        phone: contactWhatsapp,
        whatsapp: contactWhatsapp,
        endereco: endereco || null,
        role: role as 'admin' | 'user',
        organization_id: targetOrgId,
        is_active: true,
      }, { onConflict: 'id' });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error creating user profile:', userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Create organization_members entry
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .upsert({
        user_id: authData.user.id,
        organization_id: targetOrgId,
        role: role as 'admin' | 'user',
        is_active: true,
      }, { onConflict: 'user_id,organization_id' });

    if (memberError) {
      console.error('Error creating organization member:', memberError);
    }

    // 4. Send welcome WhatsApp with credentials
    let welcomeResult: any = { sent: false };
    if (contactWhatsapp) {
      welcomeResult = await sendWelcomeWhatsApp(
        supabaseAdmin,
        targetOrgId,
        contactWhatsapp,
        name,
        email,
        generatedPassword,
      );
    }

    console.log(`User created successfully: ${email} in org ${org.name} (whatsapp sent: ${welcomeResult.sent})`);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role,
      },
      generatedPassword,
      whatsappSent: welcomeResult.sent,
      whatsappReason: welcomeResult.reason || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
