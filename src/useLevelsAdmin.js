import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useLevelsAdmin() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('levels')
          .select('*')
          .order('sort_order');
        if (err) throw err;
        setLevels(data || []);
        setError(null);
      } catch (err) {
        console.error('[useLevelsAdmin] Erreur:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const createLevel = async ({ id, name, tier_id }) => {
    const maxOrder = Math.max(0, ...levels.map(l => l.sort_order || 0));
    const { error: err } = await supabase
      .from('levels')
      .insert({ id, name, tier_id, sort_order: maxOrder + 1, is_visible: true });
    if (err) throw err;
    reload();
  };

  const updateLevel = async (id, updates) => {
    const { error: err } = await supabase
      .from('levels')
      .update(updates)
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  const deleteLevel = async (id) => {
    const { error: err } = await supabase
      .from('levels')
      .delete()
      .eq('id', id);
    if (err) throw err;
    reload();
  };

  // Réordonner : échange le sort_order de deux niveaux adjacents
  const moveLevel = async (id, direction) => {
    const idx = levels.findIndex(l => l.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= levels.length) return;

    const current = levels[idx];
    const target = levels[targetIdx];

    // Swap des sort_order
    const { error: err1 } = await supabase
      .from('levels')
      .update({ sort_order: target.sort_order })
      .eq('id', current.id);
    if (err1) throw err1;

    const { error: err2 } = await supabase
      .from('levels')
      .update({ sort_order: current.sort_order })
      .eq('id', target.id);
    if (err2) throw err2;

    reload();
  };

  // Compter combien de séances utilisent les compétences d'un niveau (pour avertissement avant suppression)
  const countSessionsForLevel = async (levelId) => {
    const { data, error: err } = await supabase
      .from('session_skills')
      .select(`
        skill:skills!inner (
          category:categories!inner (
            level_id
          )
        )
      `)
      .eq('skill.category.level_id', levelId);
    if (err) {
      console.warn('[countSessionsForLevel] erreur:', err.message);
      return 0;
    }
    return data?.length || 0;
  };

  return {
    levels,
    loading,
    error,
    reload,
    createLevel,
    updateLevel,
    deleteLevel,
    moveLevel,
    countSessionsForLevel,
  };
}