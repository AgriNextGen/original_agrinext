import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
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

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        return;
      }
      setUserRole(data?.role ?? null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    if (user?.id) {
      await fetchUserRole(user.id);
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
          // Handle OAuth signup with role from sessionStorage (Google signup flow)
          const signupRole = sessionStorage.getItem('signup_role');
          if (signupRole) {
            sessionStorage.removeItem('signup_role');
            const metadata = session.user.user_metadata || {};
            const name = metadata.full_name || metadata.name || metadata.email?.split('@')[0] || 'User';
            const phone = metadata.phone || null;
            try {
              await supabase.from('user_roles').upsert({ user_id: session.user.id, role: signupRole }, { onConflict: 'user_id' });
              if (signupRole === 'buyer') {
                await supabase.from('buyers').upsert({ user_id: session.user.id, name, phone }, { onConflict: 'user_id' });
              } else if (signupRole === 'logistics') {
                await supabase.from('transporters').upsert({ user_id: session.user.id, name, phone }, { onConflict: 'user_id' });
              }
            } catch (e) {
              console.error('OAuth role assignment error:', e);
            }
          }
          // Small delay to ensure role is created after signup
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(session.user.id);
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
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut, refreshRole }}>
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
