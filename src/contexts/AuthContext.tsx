import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/hooks/use-audit-logs';
import { performanceTracker } from '@/lib/performance';
import { performFullCacheClear } from '@/lib/cache-utils';
interface UserProfile {
  id: string;
  organization_id: string | null;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super_admin';
  avatar_url: string | null;
  is_active: boolean;
  language?: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  theme_mode: string;
  accent_color: string;
  is_active?: boolean;
  subscription_status?: string;
  segment?: 'imobiliario' | 'telecom' | 'servicos' | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  default_commission_percentage?: number | null;
}

interface ImpersonateSession {
  orgId: string;
  orgName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  isSuperAdmin: boolean;
  impersonating: ImpersonateSession | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  startImpersonate: (orgId: string, orgName: string) => Promise<void>;
  stopImpersonate: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  needsOrgSelection: boolean;
  authInitialized: boolean;
  organizationsLoaded: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOrgSelection, setNeedsOrgSelection] = useState(false);
  const [organizationsLoaded, setOrganizationsLoaded] = useState(false);

  useEffect(() => {
    if (organization) {
      console.log('[AuthContext] active organization changed:', organization.id);
      if (user) {
        localStorage.setItem(`vimob_active_organization_${user.id}`, organization.id);
      }
    }
  }, [organization, user]);
  const [impersonating, setImpersonating] = useState<ImpersonateSession | null>(() => {
    const stored = localStorage.getItem('impersonating');
    return stored ? JSON.parse(stored) : null;
  });

  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
    return performanceTracker.trackTimed('checkSuperAdmin', async () => {
      // Check both user_roles table AND users.role field for super_admin
      const [rolesResult, usersResult] = await Promise.all([
        (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle(),
        supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .eq('role', 'super_admin')
          .maybeSingle()
      ]);

      return !!(rolesResult.data || usersResult.data);
    });
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    return performanceTracker.trackTimed('fetchProfile', async () => {
      try {
        // Fetch profile and check super admin status in parallel
        // Optimized: Select only required fields
        const [userResult, superAdmin] = await Promise.all([
          supabase
            .from('users')
            .select('id, organization_id, name, email, role, avatar_url, is_active, language, phone, whatsapp, cpf, cep, endereco, numero, complemento, bairro, cidade, uf')
            .eq('id', userId)
            .single(),
          checkSuperAdmin(userId)
        ]);

        const profileData = userResult.data;

        if (profileData) {
          setIsSuperAdmin(superAdmin);

          // Block inactive users (super_admins bypass this check)
          if (!profileData.is_active && !superAdmin) {
            console.warn('User is deactivated, signing out');
            await supabase.auth.signOut();
            // Removed intrusive alert to prevent blocking the UI
            // toast handles this in the UI

            return false;
          }

          setProfile(profileData as UserProfile);

          const storedImpersonating = localStorage.getItem('impersonating');
          const activeImpersonation: ImpersonateSession | null = storedImpersonating
            ? JSON.parse(storedImpersonating)
            : null;

          const orgIdToFetch = activeImpersonation?.orgId || profileData.organization_id;

          if (orgIdToFetch) {
            // Optimized: Select only required fields
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id, name, logo_url, theme_mode, accent_color, is_active, subscription_status, segment, cnpj, inscricao_estadual, razao_social, nome_fantasia, cep, endereco, numero, complemento, bairro, cidade, uf, telefone, whatsapp, email, website, default_commission_percentage')
              .eq('id', orgIdToFetch)
              .single();

            if (orgData) {
              if (!orgData.is_active && !superAdmin && !activeImpersonation) {
                console.warn('Organization is deactivated, signing out');
                await supabase.auth.signOut();
                // Removed intrusive alert
                return false;
              }
              setOrganization(orgData as Organization);
            }
          }
          
          // Fetch full profile data in background after critical data is loaded
          fetchFullProfile(userId);
          
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return false;
      }
    });
  };

  const fetchFullProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('phone, whatsapp, cpf, cep, endereco, numero, complemento, bairro, cidade, uf')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(prev => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error('Error fetching full profile:', error);
    }
  };

  const startImpersonate = async (orgId: string, orgName: string) => {
    if (!user) return;

    // Log auditoria (sem alterar o banco)
    logAuditAction('impersonate_start', 'organization', orgId, undefined, {
      org_name: orgName,
      started_at: new Date().toISOString()
    }).catch(console.error);

    const impersonateSession: ImpersonateSession = { orgId, orgName };

    // Persistir no localStorage ANTES de setar o estado para que fetchProfile já leia corretamente
    localStorage.setItem('impersonating', JSON.stringify(impersonateSession));
    setImpersonating(impersonateSession);

    // Buscar e setar a org impersonada em memória (sem tocar o banco)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgData) setOrganization(orgData as Organization);
  };

  const stopImpersonate = async () => {
    // Log auditoria antes de limpar o estado
    if (user && impersonating) {
      logAuditAction('impersonate_stop', 'organization', impersonating.orgId, undefined, {
        org_name: impersonating.orgName,
        stopped_at: new Date().toISOString()
      }).catch(console.error);
    }

    setImpersonating(null);
    localStorage.removeItem('impersonating');
    setOrganization(null); // Limpa org impersonada imediatamente

    // Recarregar org original do super admin (usando organization_id real do banco)
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('AuthProvider mounted');

    const clearAllStates = () => {
      console.log('Cleaning auth states');
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setIsSuperAdmin(false);
      setImpersonating(null);
      localStorage.removeItem('impersonating');
      sessionStorage.removeItem('org_selected');
    };

    // Safety timeout: stop loading after 3 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn('Auth safety timeout reached - forcing loading to false');
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 3000);

    console.log('getSession started');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      console.log('getSession finished, session:', !!session, 'error:', error?.message);

      if (error || !session) {
        clearAllStates();
        setLoading(false);
        setAuthInitialized(true);
        console.log('Auth initialization complete naturally (no session)');
        return;
      }

      setSession(session);
      setUser(session.user);
      console.log('[AuthContext] login user loaded:', session.user.id);

      try {
        await Promise.all([
          fetchProfile(session.user.id),
          checkMultiOrg(session.user.id)
        ]);
      } catch (err) {
        console.error('[AuthContext] Error during initial auth data fetch:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthInitialized(true);
          console.log('[AuthContext] Auth initialization complete naturally');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        const authEvent = event as string;
        console.log('Auth event:', authEvent, 'Session:', !!session);

        // Se for o evento inicial, não fazemos nada aqui pois o getSession já tratou
        if (authEvent === 'INITIAL_SESSION') {
          console.log('Ignoring INITIAL_SESSION event');
          return;
        }

        if (authEvent === 'SIGNED_OUT') {
          clearAllStates();
          performFullCacheClear({ 
            clearAuth: true, 
            redirectTo: '/auth' 
          });
          setLoading(false);
          setAuthInitialized(true);
          return;
        }

        if (authEvent === 'SIGNED_IN' || authEvent === 'USER_UPDATED' || authEvent === 'TOKEN_REFRESHED') {
          if (session) {
            setSession(session);
            setUser(session.user);
            
            if (session.user?.id) {
              await fetchProfile(session.user.id);
            }
          }
          setLoading(false);
          setAuthInitialized(true);
        }

        if (!session && authEvent !== 'INITIAL_SESSION') {
          clearAllStates();
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });

    // Log successful login (async to avoid blocking)
    if (!error && data.user) {
      // Check multi-org in background
      checkMultiOrg(data.user.id).catch(console.error);
      
      setTimeout(() => {
        logAuditAction('login', 'session', data.user.id, undefined, {
          email,
          login_at: new Date().toISOString()
        }).catch(console.error);
      }, 0);
    }

    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (!error) {
      logAuditAction('password_reset_request', 'session', null, undefined, {
        email,
        requested_at: new Date().toISOString()
      }).catch(console.error);
    }

    return { error };
  };

  const signOut = async () => {
    // Log logout before clearing states (capture user ID while we still have it)
    const currentUserId = user?.id;
    if (currentUserId) {
      logAuditAction('logout', 'session', currentUserId).catch(console.error);
    }

    // Tentar signOut global (invalida refresh token no servidor)
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.log('Logout server-side falhou (sessão provavelmente já expirada):', error);
    }

    // Executar limpeza profunda e redirecionar para login com cache bust
    await performFullCacheClear({ 
      clearAuth: true, 
      redirectTo: '/auth' 
    });
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const switchOrganization = async (orgId: string) => {
    if (!user) return;

    // Marcar como selecionado na sessão para evitar re-redirecionamento
    sessionStorage.setItem('org_selected', 'true');


    // Update users.organization_id to reflect active org
    await supabase
      .from('users')
      .update({ organization_id: orgId })
      .eq('id', user.id);

    // Track last access on the membership row
    await supabase
      .from('organization_members' as any)
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('organization_id', orgId);

    // Fetch the new org data
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgData) {
      setOrganization(orgData as Organization);
    }

    // Get user's role in this org from organization_members
    const { data: memberData } = await supabase
      .from('organization_members' as any)
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (memberData) {
      // Update profile role to match org membership role
      const newRole = (memberData as any).role;
      await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      setProfile(prev => prev ? { ...prev, organization_id: orgId, role: newRole } : prev);
    } else {
      setProfile(prev => prev ? { ...prev, organization_id: orgId } : prev);
    }

    setNeedsOrgSelection(false);
  };

  // Check if user has multiple orgs after profile is loaded
  const checkMultiOrg = async (userId: string) => {
    return performanceTracker.trackTimed('checkMultiOrg', async () => {
      try {
        // Se já selecionamos nesta sessão, não precisamos perguntar de novo
        if (sessionStorage.getItem('org_selected') === 'true') {
          console.log('[AuthContext] organization already selected in this session');
          setNeedsOrgSelection(false);
          return;
        }

        const { data, error } = await supabase
          .from('organization_members' as any)
          .select('organization_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        const count = data?.length || 0;
        console.log('[AuthContext] accessible organizations count:', count);

        if (!error && data && count > 1) {
          console.log('[AuthContext] redirect decision: /select-organization (multi-org)');
          setNeedsOrgSelection(true);
        } else if (!error && data && count === 1) {
          const onlyOrgId = (data as any[])[0].organization_id;
          console.log('[AuthContext] redirect decision: dashboard (single org:', onlyOrgId, ')');
          await switchOrganization(onlyOrgId);
          setNeedsOrgSelection(false);
        } else {
          console.log('[AuthContext] redirect decision: no active organizations found');
          setNeedsOrgSelection(false);
        }
      } catch (err) {
        console.error('[AuthContext] Error checking multi-org:', err);
        setNeedsOrgSelection(false);
      }
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      organization,
      loading,
      isSuperAdmin,
      impersonating,
      needsOrgSelection,
      authInitialized,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
      startImpersonate,
      stopImpersonate,
      switchOrganization,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
