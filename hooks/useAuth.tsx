import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../integrations/supabase/client";
import type { User as SupabaseUser, Session as SupabaseSession } from "@supabase/supabase-js";

type AuthUser = SupabaseUser | { id: string; email: string; full_name?: string };
type AuthSession = SupabaseSession | { user: AuthUser } | null;

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        });

      return () => subscription.unsubscribe();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
      return;
    }
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error && (data as any)?.user) {
      const u = (data as any).user as AuthUser;
      setUser(u);
      setSession({ user: u });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && (data as any)?.user) {
      const u = (data as any).user as AuthUser;
      setUser(u);
      setSession({ user: u });
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, error, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
