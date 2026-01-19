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
  startImpersonate: (orgId: string, orgName: string) => void;
  stopImpersonate: () => void;
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
    const { data } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .single();
    
    return !!data;
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

  const startImpersonate = (orgId: string, orgName: string) => {
    const session: ImpersonateSession = { orgId, orgName };
    setImpersonating(session);
    localStorage.setItem('impersonating', JSON.stringify(session));
    
    // Refresh to load the impersonated org
    if (user) {
      fetchProfile(user.id);
    }
  };

  const stopImpersonate = () => {
    setImpersonating(null);
    localStorage.removeItem('impersonating');
    
    // Refresh to load original org
    if (user) {
      fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
          setIsSuperAdmin(false);
        }
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
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
    setIsSuperAdmin(false);
    setImpersonating(null);
    localStorage.removeItem('impersonating');
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
