import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  refreshProfile: () => Promise<void>;
  startImpersonate: (orgId: string, orgName: string) => Promise<void>;
  stopImpersonate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState<ImpersonateSession | null>(() => {
    const stored = localStorage.getItem('impersonating');
    return stored ? JSON.parse(stored) : null;
  });

  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
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
  };

  const fetchProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        // Check if super_admin
        const superAdmin = await checkSuperAdmin(userId);
        setIsSuperAdmin(superAdmin);
        
        setProfile(profileData as UserProfile);

        // If impersonating, fetch that org instead
        const orgIdToFetch = impersonating?.orgId || profileData.organization_id;

        if (orgIdToFetch) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgIdToFetch)
            .single();

          if (orgData) {
            setOrganization(orgData as Organization);
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return false;
    }
  };

  const startImpersonate = async (orgId: string, orgName: string) => {
    // Update the super admin's organization_id in the users table
    if (user) {
      await supabase
        .from('users')
        .update({ organization_id: orgId })
        .eq('id', user.id);
    }
    
    const impersonateSession: ImpersonateSession = { orgId, orgName };
    setImpersonating(impersonateSession);
    localStorage.setItem('impersonating', JSON.stringify(impersonateSession));
    
    // Refresh to load the impersonated org with updated organization_id
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const stopImpersonate = async () => {
    // Restore the super admin's organization_id to null
    if (user) {
      await supabase
        .from('users')
        .update({ organization_id: null })
        .eq('id', user.id);
    }
    
    setImpersonating(null);
    localStorage.removeItem('impersonating');
    setOrganization(null); // Clear org immediately to prevent onboarding redirect
    
    // Refresh to load original profile without organization
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const clearAllStates = () => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setIsSuperAdmin(false);
      setImpersonating(null);
      localStorage.removeItem('impersonating');
    };

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      
      // Se houve erro ou sessão inválida, limpar tudo
      if (error || !session) {
        console.log('Sessão inválida na inicialização:', error?.message);
        clearAllStates();
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session.user);
      
      await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth event:', event, 'Session:', !!session);
        
        // Logout ou sessão expirada - limpar tudo e NÃO processar mais nada
        if (event === 'SIGNED_OUT') {
          clearAllStates();
          return;
        }
        
        // Se não tem sessão, limpar estados
        if (!session) {
          clearAllStates();
          return;
        }
        
        // Ignorar TOKEN_REFRESHED se já fizemos logout manualmente
        // Verificar se o storage foi limpo (indicativo de logout manual)
        const storageKey = `sb-iemalzlfnbouobyjwlwi-auth-token`;
        const hasToken = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
        if (!hasToken && event === 'TOKEN_REFRESHED') {
          console.log('Ignorando TOKEN_REFRESHED - logout foi realizado');
          return;
        }
        
        // Sessão válida
        setSession(session);
        setUser(session.user);
        
        // Usar setTimeout para evitar deadlock do Supabase
        setTimeout(() => {
          if (isMounted) {
            fetchProfile(session.user.id);
          }
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  const signOut = async () => {
    // Limpar estados PRIMEIRO (antes de qualquer await)
    // Isso garante que o logout funcione mesmo se a sessão já expirou no servidor
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setIsSuperAdmin(false);
    setImpersonating(null);
    localStorage.removeItem('impersonating');
    
    // Limpar storage do Supabase manualmente para garantir que tokens sejam removidos
    const storageKey = `sb-iemalzlfnbouobyjwlwi-auth-token`;
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    
    // Tentar signOut global (invalida refresh token no servidor)
    // Se falhar (sessão já expirada), não importa - tokens já foram limpos
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.log('Logout server-side falhou (sessão provavelmente já expirada):', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
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
      signIn,
      signUp,
      signOut,
      refreshProfile,
      startImpersonate,
      stopImpersonate
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
