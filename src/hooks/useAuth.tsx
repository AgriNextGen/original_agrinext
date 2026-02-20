import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  profiles: Array<{ id: string; profile_type: string; display_name: string; phone: string; is_active: boolean }>;
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
  refreshRole: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("agrinext_active_profile") || null;
    } catch {
      return null;
    }
  });

  const fetchUserProfiles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('user_profiles').select('id, profile_type, display_name, phone, is_active').eq('user_id', userId);
      if (error) {
        console.error('Error fetching user profiles:', error);
        setProfiles([]);
        setUserRole(null);
        return;
      }
      setProfiles(data || []);
      // determine active profile
      let activeId = activeProfileId;
      if (!activeId && data && data.length === 1) {
        activeId = data[0].id;
      } else if (activeId && !data.find((p:any)=>p.id===activeId)) {
        activeId = data[0]?.id ?? null;
      }
      setActiveProfileId(activeId || null);
      const activeProfile = (data || []).find((p:any)=>p.id === activeId) || (data && data[0]);
      setUserRole(activeProfile?.profile_type ?? null);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      setProfiles([]);
      setUserRole(null);
    }
  }, [activeProfileId]);

  const refreshRole = useCallback(async () => {
    if (user?.id) {
      await fetchUserProfiles(user.id);
    }
  }, [user?.id, fetchUserRole]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // After login, load profiles
          setTimeout(() => {
            if (mounted) {
              fetchUserProfiles(session.user.id);
            }
          }, 100);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setProfiles([]);
      setActiveProfileId(null);
      try { localStorage.removeItem("agrinext_active_profile"); } catch {}
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const setActiveProfile = useCallback((id: string | null) => {
    setActiveProfileId(id);
    try {
      if (id) localStorage.setItem("agrinext_active_profile", id);
      else localStorage.removeItem("agrinext_active_profile");
    } catch {}
    const active = profiles.find(p => p.id === id);
    setUserRole(active?.profile_type ?? null);
  }, [profiles]);

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, profiles, activeProfileId, setActiveProfileId: setActiveProfile, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
