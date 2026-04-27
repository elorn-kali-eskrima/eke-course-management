import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

export function useSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('seasons')
          .select('*')
          .order('start_date', { ascending: false });
        if (err) throw err;
        setSeasons(data || []);
        setError(null);
      } catch (err) {
        console.error('[useSeasons] Erreur:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const createSeason = async ({ name, start_date, end_date }) => {
    const { error: err } = await supabase
      .from('seasons')
      .insert({ name, start_date, end_date, is_active: false });
    if (err) throw err;
    reload();
  };

  const updateSeason = async (id, updates) => {
    const { error: err } = await supabase
      .from('seasons')
      .update(updates)
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  const deleteSeason = async (id) => {
    const { error: err } = await supabase
      .from('seasons')
      .delete()
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  const activateSeason = async (id) => {
    const current = seasons.find(s => s.is_active);
    if (current && current.id !== id) {
      const { error: err1 } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', current.id);
      if (err1) throw err1;
    }
    const { error: err2 } = await supabase
      .from('seasons')
      .update({ is_active: true })
      .eq('id', id);
    if (err2) throw err2;
    reload();
  };

  return { seasons, loading, error, reload, createSeason, updateSeason, deleteSeason, activateSeason };
}