import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * Charge depuis Supabase la structure complète du programme :
 * tiers → levels → categories → skills
 * Retourne un objet prêt à être consommé par l'UI.
 */
export function useProgram() {
  const [program, setProgram] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Charger les tiers
        const { data: tiersData, error: tiersErr } = await supabase
          .from('tiers')
          .select('*')
          .order('sort_order');
        if (tiersErr) throw tiersErr;

        // Charger les niveaux avec leurs catégories et compétences (jointure imbriquée)
        const { data: levelsData, error: levelsErr } = await supabase
          .from('levels')
          .select(`
            id, name, tier_id, sort_order,
            categories (
              id, name, emoji, sort_order,
              skills (id, name, sort_order)
            )
          `)
          .order('sort_order');
        if (levelsErr) throw levelsErr;

        // Trier côté client les catégories et compétences
        levelsData.forEach(lvl => {
          lvl.categories.sort((a, b) => a.sort_order - b.sort_order);
          lvl.categories.forEach(cat => {
            cat.skills.sort((a, b) => a.sort_order - b.sort_order);
          });
        });

        setTiers(tiersData);
        setProgram(levelsData);
        setError(null);
      } catch (err) {
        console.error('[useProgram] Erreur chargement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { program, tiers, loading, error };
}