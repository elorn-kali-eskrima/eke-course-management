import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * Charge et gère les profils des instructeurs.
 */
export function useInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name');
        if (err) throw err;
        setInstructors(data || []);
        setError(null);
      } catch (err) {
        console.error('[useInstructors] Erreur:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const updateInstructor = async (id, updates) => {
    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  const deleteInstructor = async (id) => {
    const { error: err } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  return { instructors, loading, error, reload, updateInstructor, deleteInstructor };
}