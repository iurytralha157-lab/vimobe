import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'super_admin';
  organization_id: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  // Extended fields
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
  accent_color: string | null;
  theme_mode: string | null;
  logo_size: number | null;
  segment: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  subscription_status?: string;
}

interface ImpersonatingState {
  orgId: string;
  orgName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  isLoading: boolean;
  loading: boolean; // Alias for compatibility
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  impersonating: ImpersonatingState | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  startImpersonate: (orgId: string, orgName: string) => void;
  stopImpersonate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState<ImpersonatingState | null>(() => {
    const stored = localStorage.getItem('impersonating');
    return stored ? JSON.parse(stored) : null;
  });
  const { toast } = useToast();

  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_roles' as 'users')
      .select('role')
      .eq('user_id' as 'id', userId)
      .eq('role', 'super_admin')
      .single();
    
    return !!data;
  };

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("id, email, name, avatar_url, role, organization_id, is_active, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      // Check if super_admin via user_roles table
      const superAdmin = await checkSuperAdmin(userId);
      setIsSuperAdmin(superAdmin);

      setProfile(profileData as UserProfile);

      // If impersonating, fetch that org instead
      const orgIdToFetch = impersonating?.orgId || profileData?.organization_id;

      if (orgIdToFetch) {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgIdToFetch)
          .single();

        if (!orgError && orgData) {
          setOrganization(orgData as Organization);
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  }, [impersonating?.orgId]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
          setIsSuperAdmin(false);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao entrar",
          description: error.message,
        });
        return { error };
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: err.message,
      });
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar",
          description: error.message,
        });
        return { error };
      }

      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: err.message,
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setOrganization(null);
      setIsSuperAdmin(false);
      setImpersonating(null);
      localStorage.removeItem('impersonating');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar e-mail",
          description: error.message,
        });
        return { error };
      }

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: err.message,
      });
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar senha",
          description: error.message,
        });
        return { error };
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: err.message,
      });
      return { error: err };
    }
  };

  const isAdmin = profile?.role === "admin" || isSuperAdmin;

  const startImpersonate = useCallback((orgId: string, orgName: string) => {
    const session: ImpersonatingState = { orgId, orgName };
    setImpersonating(session);
    localStorage.setItem('impersonating', JSON.stringify(session));
    
    // Refresh to load the impersonated org
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const stopImpersonate = useCallback(() => {
    setImpersonating(null);
    localStorage.removeItem('impersonating');
    
    // Refresh to load original org
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const value: AuthContextType = {
    user,
    session,
    profile,
    organization,
    isLoading,
    loading: isLoading, // Alias for compatibility
    isAuthenticated: !!user,
    isSuperAdmin,
    isAdmin,
    impersonating,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    sendPasswordReset,
    updatePassword,
    startImpersonate,
    stopImpersonate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
