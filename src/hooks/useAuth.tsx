import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type RoleType = "farmer" | "agent" | "logistics" | "buyer" | "admin" | string;
type UserProfileLite = {
  id: string;
  profile_type: string;
  display_name: string;
  phone: string;
  is_active: boolean;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // legacy field used across the app - represents the active role (may be overridden in dev)
  userRole: string | null;
  // canonical real role read from profiles / user_roles
  realRole: string | null;
  // override controlled via Edge Functions
  activeRole: string | null;
  isDevOverride: boolean;
  devExpiresAt: string | null;
  profiles: Array<{ id: string; profile_type: string; display_name: string; phone: string; is_active: boolean }>;
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  // switch active role in dev (calls Edge Function). Pass null to reset.
  switchActiveRole: (role: RoleType | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  realRole: null,
  activeRole: null,
  isDevOverride: false,
  devExpiresAt: null,
  profiles: [],
  activeProfileId: null,
  setActiveProfileId: async () => {},
  signOut: async () => {},
  refreshRole: async () => {},
  switchActiveRole: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // legacy role exposed to app; we will set this to activeRole when overrides exist
  const [userRole, setUserRole] = useState<string | null>(null);
  // canonical real role from profiles/user_roles
  const [realRole, setRealRole] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [isDevOverride, setIsDevOverride] = useState(false);
  const [devExpiresAt, setDevExpiresAt] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("agrinext_active_profile") || null;
    } catch {
      return null;
    }
  });

  const applyProfilesState = useCallback((rows: UserProfileLite[]) => {
    setProfiles(rows);
    let nextActiveId = activeProfileId;
    if (!nextActiveId && rows.length === 1) {
      nextActiveId = rows[0].id;
    } else if (nextActiveId && !rows.find((p) => p.id === nextActiveId)) {
      nextActiveId = rows[0]?.id ?? null;
    }
    setActiveProfileId(nextActiveId || null);
    const activeProfile = rows.find((p) => p.id === nextActiveId) || rows[0] || null;
    setRealRole(activeProfile?.profile_type ?? null);
    setUserRole(activeProfile?.profile_type ?? null);
  }, [activeProfileId]);

  const fetchUserProfiles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, profile_type, display_name, phone, is_active")
        .eq("user_id", userId);

      if (!error && data && data.length > 0) {
        applyProfilesState(
          data.map((p) => ({
            id: p.id,
            profile_type: p.profile_type,
            display_name: p.display_name || "User",
            phone: p.phone || "",
            is_active: p.is_active ?? true,
          }))
        );
        return;
      }

      if (error) {
        console.warn("user_profiles lookup failed, falling back to legacy role tables:", error.message);
      }

      const [{ data: roleRows, error: roleError }, { data: profileRow, error: profileError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(5),
        supabase.from("profiles").select("id, full_name, phone").eq("id", userId).maybeSingle(),
      ]);

      if (roleError) {
        console.warn("Legacy user_roles lookup failed:", roleError.message);
      }
      if (profileError) {
        console.warn("Legacy profiles lookup failed:", profileError.message);
      }

      const firstRole = roleRows?.[0]?.role ?? null;
      if (firstRole) {
        applyProfilesState([
          {
            id: userId,
            profile_type: firstRole,
            display_name: profileRow?.full_name?.trim() || "User",
            phone: profileRow?.phone || "",
            is_active: true,
          },
        ]);
        return;
      }

      setProfiles([]);
      setRealRole(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      setProfiles([]);
      setRealRole(null);
      setUserRole(null);
    }
  }, [applyProfilesState]);

  const refreshRole = useCallback(async () => {
    if (user?.id) {
      await fetchUserProfiles(user.id);
    }
  }, [user?.id, fetchUserProfiles]);

  // Call dev-get-active-role edge function to fetch override when available
  const fetchDevActiveRole = useCallback(
    async (accessToken?: string) => {
      try {
        if (import.meta.env.MODE === "production") return;
        if (import.meta.env.VITE_DEV_TOOLS_ENABLED !== "true") return;
        if (!accessToken) return;

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-get-active-role`;
        const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };

        const res = await fetch(url, { headers });
        if (!res.ok) {
          // ignore dev tools disabled or blocked
          return;
        }
        const json = await res.json();
        if (json?.ok) {
          const { active_role, real_role, override, expires_at } = json;
          setRealRole(real_role ?? null);
          setActiveRole(active_role ?? null);
          setIsDevOverride(!!override);
          setDevExpiresAt(expires_at ?? null);
          // Set legacy userRole to activeRole so existing UI follows override
          setUserRole(active_role ?? real_role ?? null);
        }
      } catch (err) {
        console.error("fetchDevActiveRole error:", err);
      }
    },
    []
  );

  const switchActiveRole = useCallback(async (role: RoleType | null) => {
    try {
      if (import.meta.env.MODE === "production") return;
      if (import.meta.env.VITE_DEV_TOOLS_ENABLED !== "true") return;
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-switch-role`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ active_role: role }),
      });
      if (!res.ok) {
        console.warn("switchActiveRole failed", await res.text());
        return;
      }
      const json = await res.json();
      if (json?.ok) {
        const { active_role, real_role, expires_at } = json;
        setRealRole(real_role ?? null);
        setActiveRole(active_role ?? null);
        setIsDevOverride(!!active_role && active_role !== real_role);
        setDevExpiresAt(expires_at ?? null);
        setUserRole(active_role ?? real_role ?? null);
      }
    } catch (err) {
      console.error("switchActiveRole error:", err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfiles(session.user.id);
          // fetch dev override if enabled
          await fetchDevActiveRole(session.access_token ?? undefined);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // After login, load profiles
        setTimeout(() => {
          if (mounted) {
            fetchUserProfiles(session.user.id);
            fetchDevActiveRole(session.access_token ?? undefined);
          }
        }, 100);
      } else {
        setRealRole(null);
        setActiveRole(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfiles, fetchDevActiveRole]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRealRole(null);
      setActiveRole(null);
      setUserRole(null);
      setProfiles([]);
      setActiveProfileId(null);
      setIsDevOverride(false);
      setDevExpiresAt(null);
      try {
        localStorage.removeItem("agrinext_active_profile");
      } catch {}
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, []);

  const setActiveProfile = useCallback(
    (id: string | null) => {
      setActiveProfileId(id);
      try {
        if (id) localStorage.setItem("agrinext_active_profile", id);
        else localStorage.removeItem("agrinext_active_profile");
      } catch {}
      const active = profiles.find((p) => p.id === id);
      setRealRole(active?.profile_type ?? null);
      // respect dev override if present
      setUserRole(isDevOverride ? activeRole ?? active?.profile_type ?? null : active?.profile_type ?? null);
    },
    [profiles, isDevOverride, activeRole]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        realRole,
        activeRole,
        isDevOverride,
        devExpiresAt,
        profiles,
        activeProfileId,
        setActiveProfileId: setActiveProfile,
        signOut,
        refreshRole,
        switchActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
