import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAuditAction } from "@/hooks/use-audit-logs";
import { performanceTracker } from "@/lib/performance";

interface UserProfile {
  id: string;
  organization_id: string | null;
  name: string;
  email: string;
  role: "admin" | "user" | "super_admin" | null;
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
  segment?: "imobiliario" | "telecom" | "servicos" | null;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOrgSelection, setNeedsOrgSelection] = useState(false);
  const [impersonating, setImpersonating] = useState<ImpersonateSession | null>(() => {
    try {
      const stored = localStorage.getItem("impersonating");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const checkSuperAdmin = useCallback(async (userId: string): Promise<boolean> => {
    return performanceTracker.trackTimed("checkSuperAdmin", async () => {
      try {
        const [rolesResult, usersResult] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "super_admin")
            .maybeSingle(),
          supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .eq("role", "super_admin")
            .maybeSingle(),
        ]);
        return !!(rolesResult.data || usersResult.data);
      } catch (e) {
        console.error("Error checking super admin:", e);
        return false;
      }
    });
  }, []);

  const fetchFullProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("phone, whatsapp, cpf, cep, endereco, numero, complemento, bairro, cidade, uf")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setProfile((prev) => (prev ? { ...prev, ...data } : null));
      }
    } catch (error) {
      console.error("Error fetching full profile:", error);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<boolean> => {
    return performanceTracker.trackTimed("fetchProfile", async () => {
      try {
        // console.log removed for speed
        const [userResult, superAdmin] = await Promise.all([
          supabase
            .from("users")
            .select("id, organization_id, name, email, role, avatar_url, is_active, language")
            .eq("id", userId)
            .maybeSingle(),
          checkSuperAdmin(userId),
        ]);

        if (userResult.error) {
          console.error("Error fetching user profile record:", userResult.error);
          return false;
        }

        const profileData = userResult.data;
        if (profileData) {
          setIsSuperAdmin(superAdmin);
          
          if (!profileData.is_active && !superAdmin) {
            console.warn("User is deactivated, signing out");
            await supabase.auth.signOut();
            alert("Sua conta foi desativada. Entre em contato com o administrador.");
            return false;
          }
          
          setProfile(profileData as any);

          const storedImpersonating = localStorage.getItem("impersonating");
          const activeImpersonation: ImpersonateSession | null = storedImpersonating
            ? JSON.parse(storedImpersonating)
            : null;

          const orgIdToFetch = activeImpersonation?.orgId || profileData.organization_id;
          
          if (orgIdToFetch) {
            console.log("Fetching organization:", orgIdToFetch);
            const { data: orgData, error: orgError } = await supabase
              .from("organizations")
              .select("id, name, logo_url, theme_mode, accent_color, is_active")
              .eq("id", orgIdToFetch)
              .maybeSingle();

            if (orgError) {
              console.error("Error fetching organization record:", orgError);
            } else if (orgData) {
              if (!orgData.is_active && !superAdmin && !activeImpersonation) {
                console.warn("Organization is deactivated, signing out");
                await supabase.auth.signOut();
                alert("Sua organização foi desativada. Entre em contato com o suporte.");
                return false;
              }
              setOrganization(orgData as Organization);
            }
          }
          
          fetchFullProfile(userId).catch(err => console.error("Non-blocking fetchFullProfile error:", err));
          return true;
        } else {
          console.warn("No user profile found in database for ID:", userId);
          // If super admin and no profile, we still allow basic access
          if (superAdmin) {
            console.log("Super admin detected without explicit profile record");
            setIsSuperAdmin(true);
            return true;
          }
          return false;
        }
      } catch (error) {
        console.error("Critical error in fetchProfile:", error);
        return false;
      }
    });
  }, [checkSuperAdmin, fetchFullProfile]);

  const checkMultiOrg = useCallback(async (userId: string) => {
    return performanceTracker.trackTimed("checkMultiOrg", async () => {
      try {
        const { data, error } = await supabase
          .from("organization_members" as any)
          .select("organization_id")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (!error && data && data.length > 1) {
          setNeedsOrgSelection(true);
        } else {
          setNeedsOrgSelection(false);
        }
      } catch {
        setNeedsOrgSelection(false);
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const clearAllStates = () => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setIsSuperAdmin(false);
      setImpersonating(null);
      localStorage.removeItem("impersonating");
    };

    const initialize = async () => {
      try {
        // console.log removed for speed
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error("Auth getSession error:", error);
          clearAllStates();
          setLoading(false);
          return;
        }

        if (!session) {
          // console.log removed for speed
          clearAllStates();
          setLoading(false);
          return;
        }

        // console.log removed for speed
        setSession(session);
        setUser(session.user);
        
        const [profileSuccess] = await Promise.all([
          fetchProfile(session.user.id),
          checkMultiOrg(session.user.id)
        ]);
        
        console.log("Init sequence complete, profile success:", profileSuccess);
      } catch (e) {
        console.error("Auth init exception:", e);
        clearAllStates();
      } finally {
        if (isMounted) {
          console.log("Setting loading to false");
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      console.log("Auth state changed:", event, currentSession ? "session active" : "no session");

      if (event === "SIGNED_OUT") {
        clearAllStates();
        setLoading(false);
        return;
      }

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Handle events that need profile refresh
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          console.log("Processing auth event, refreshing profile...");
          await Promise.all([
            fetchProfile(currentSession.user.id),
            checkMultiOrg(currentSession.user.id)
          ]);
        }
        setLoading(false);
      } else {
        // No session after change (and not a SIGNED_OUT which we handled above)
        if (event !== "INITIAL_SESSION") {
          clearAllStates();
        }
        // Only set loading false if we're not waiting for INITIAL_SESSION
        // which is handled by initialize()
        if (event !== "INITIAL_SESSION") {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, checkMultiOrg]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        console.log("SignIn successful, refreshing data...");
        await Promise.all([
          fetchProfile(data.user.id),
          checkMultiOrg(data.user.id)
        ]);
        
        setTimeout(() => {
          logAuditAction("login", "session", data.user.id, undefined, {
            email,
            login_at: new Date().toISOString(),
          }).catch(console.error);
        }, 0);
      }
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { name } },
    });
    return { error };
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    if (currentUserId) {
      logAuditAction("logout", "session", currentUserId).catch(console.error);
    }
    clearAllStates();
    localStorage.removeItem("impersonating");
    const storageKey = "sb-iemalzlfnbouobyjwlwi-auth-token";
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      console.log("Logout server-side failed:", error);
    }
  };

  const clearAllStates = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setIsSuperAdmin(false);
    setImpersonating(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) {
      logAuditAction("password_reset_request", "session", null, undefined, {
        email,
        requested_at: new Date().toISOString(),
      }).catch(console.error);
    }
    return { error };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const startImpersonate = async (orgId: string, orgName: string) => {
    if (!user) return;
    logAuditAction("impersonate_start", "organization", orgId, undefined, {
      org_name: orgName,
      started_at: new Date().toISOString(),
    }).catch(console.error);
    const impersonateSession: ImpersonateSession = { orgId, orgName };
    localStorage.setItem("impersonating", JSON.stringify(impersonateSession));
    setImpersonating(impersonateSession);
    const { data: orgData } = await supabase.from("organizations").select("*").eq("id", orgId).single();
    if (orgData) setOrganization(orgData as Organization);
  };

  const stopImpersonate = async () => {
    if (user && impersonating) {
      logAuditAction("impersonate_stop", "organization", impersonating.orgId, undefined, {
        org_name: impersonating.orgName,
        stopped_at: new Date().toISOString(),
      }).catch(console.error);
    }
    setImpersonating(null);
    localStorage.removeItem("impersonating");
    setOrganization(null);
    if (user) await fetchProfile(user.id);
  };

  const switchOrganization = useCallback(async (orgId: string) => {
    if (!user) return;
    console.log("Switching organization to:", orgId);
    
    // Update users.organization_id to reflect active org
    await supabase.from("users").update({ organization_id: orgId }).eq("id", user.id);
    
    // Fetch the new org data
    const { data: orgData } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
    if (orgData) setOrganization(orgData as Organization);
    
    // Get user's role in this org from organization_members
    const { data: memberData } = await supabase
      .from("organization_members" as any)
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
      .maybeSingle();
      
    if (memberData) {
      const newRole = (memberData as any).role;
      await supabase.from("users").update({ role: newRole }).eq("id", user.id);
      setProfile((prev) => (prev ? { ...prev, organization_id: orgId, role: newRole } : prev));
    } else {
      setProfile((prev) => (prev ? { ...prev, organization_id: orgId } : prev));
    }
    setNeedsOrgSelection(false);
  }, [user]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    organization,
    loading,
    isSuperAdmin,
    impersonating,
    needsOrgSelection,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    startImpersonate,
    stopImpersonate,
    switchOrganization,
  }), [user, session, profile, organization, loading, isSuperAdmin, impersonating, needsOrgSelection, fetchProfile, switchOrganization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
