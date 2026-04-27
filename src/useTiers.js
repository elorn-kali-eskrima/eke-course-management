import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('tiers')
          .select('*')
          .order('sort_order');
        if (err) throw err;
        setTiers(data || []);
        setError(null);
      } catch (err) {
        console.error('[useTiers] Erreur:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const createTier = async ({ id, color, emoji, sort_order }) => {
    const { error: err } = await supabase
      .from('tiers')
      .insert({ id, color, emoji, sort_order });
    if (err) throw err;
    reload();
  };

  const updateTier = async (id, updates) => {
    const { error: err } = await supabase
      .from('tiers')
      .update(updates)
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  const deleteTier = async (id) => {
    const { error: err } = await supabase
      .from('tiers')
      .delete()
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  return { tiers, loading, error, reload, createTier, updateTier, deleteTier };
}