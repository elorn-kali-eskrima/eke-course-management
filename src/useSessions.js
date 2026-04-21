import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * Charge les séances depuis Supabase avec leur instructeur et compétences associées.
 * Fournit aussi une fonction pour supprimer une séance.
 */
export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
const { data, error: err } = await supabase
          .from('sessions')
          .select(`
            id, date, comment, instructor_id, created_by, created_at, season_id,
            instructor:profiles!sessions_instructor_id_fkey (id, full_name, color),
            session_skills (
              skill:skills (
                id, name,
                category:categories (
                  id, name, emoji,
                  level:levels (id, name, tier_id)
                )
              )
            )
          `)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (err) throw err;
        setSessions(data || []);
        setError(null);
      } catch (err) {
        console.error('[useSessions] Erreur chargement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const deleteSession = async (sessionId) => {
    const { error: err } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (err) throw err;
    reload();
  };

  return { sessions, loading, error, reload, deleteSession };
}