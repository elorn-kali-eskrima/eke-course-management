import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Timeout de sécurité : si getSession ne répond pas en 5s, on débloque l'UI
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[useAuth] getSession timeout — forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('[useAuth] init error:', err);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    }

    async function fetchProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (mounted && !error) setProfile(data);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session) await fetchProfile(session.user.id);
        else setProfile(null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}