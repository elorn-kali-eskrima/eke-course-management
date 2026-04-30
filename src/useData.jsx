import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { supabase } from './supabaseClient';

const DataContext = createContext(null);

/**
 * Provider qui charge UNE SEULE FOIS toutes les données métier au démarrage,
 * et les met à disposition de toute l'app via le hook useData().
 *
 * Les opérations CRUD passent par les fonctions exposées qui déclenchent
 * un reload automatique de la donnée concernée.
 */
export function DataProvider({ children }) {
  // ============ ÉTATS ============
  const [program, setProgram] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [instructors, setInstructors] = useState([]);

  const [loadingProgram, setLoadingProgram] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(true);

  const [errorProgram, setErrorProgram] = useState(null);
  const [errorSessions, setErrorSessions] = useState(null);
  const [errorSeasons, setErrorSeasons] = useState(null);
  const [errorInstructors, setErrorInstructors] = useState(null);

  // ============ LOADERS ============
  const loadProgram = useCallback(async () => {
    setLoadingProgram(true);
    try {
      const { data: tiersData, error: tiersErr } = await supabase
        .from('tiers').select('*').order('sort_order');
      if (tiersErr) throw tiersErr;

      const { data: levelsData, error: levelsErr } = await supabase
        .from('levels')
        .select(`
          id, name, tier_id, sort_order, is_visible,
          categories (
            id, name, emoji, sort_order,
            skills (id, name, sort_order)
          )
        `)
        .order('sort_order');
      if (levelsErr) throw levelsErr;

      levelsData.forEach(lvl => {
        lvl.categories.sort((a, b) => a.sort_order - b.sort_order);
        lvl.categories.forEach(cat => {
          cat.skills.sort((a, b) => a.sort_order - b.sort_order);
        });
      });

      setTiers(tiersData);
      setProgram(levelsData);
      setErrorProgram(null);
    } catch (err) {
      console.error('[useData] loadProgram:', err);
      setErrorProgram(err.message);
    } finally {
      setLoadingProgram(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
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
      setErrorSessions(null);
    } catch (err) {
      console.error('[useData] loadSessions:', err);
      setErrorSessions(err.message);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    try {
      const { data, error: err } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (err) throw err;
      setSeasons(data || []);
      setErrorSeasons(null);
    } catch (err) {
      console.error('[useData] loadSeasons:', err);
      setErrorSeasons(err.message);
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  const loadInstructors = useCallback(async () => {
    setLoadingInstructors(true);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (err) throw err;
      setInstructors(data || []);
      setErrorInstructors(null);
    } catch (err) {
      console.error('[useData] loadInstructors:', err);
      setErrorInstructors(err.message);
    } finally {
      setLoadingInstructors(false);
    }
  }, []);

  // ============ CHARGEMENT INITIAL (1 seule fois) ============
  useEffect(() => {
    console.log('[useData] Initial load');
    Promise.all([
      loadProgram(),
      loadSessions(),
      loadSeasons(),
      loadInstructors(),
    ]).then(() => console.log('[useData] All loaded'));
  }, [loadProgram, loadSessions, loadSeasons, loadInstructors]);

  // ============ MUTATIONS SESSIONS ============
  const deleteSession = async (sessionId) => {
    const { error: err } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (err) throw err;
    await loadSessions();
  };

  // ============ MUTATIONS SEASONS ============
  const createSeason = async ({ name, start_date, end_date }) => {
    const { error: err } = await supabase
      .from('seasons')
      .insert({ name, start_date, end_date, is_active: false });
    if (err) throw err;
    await loadSeasons();
  };

  const updateSeason = async (id, updates) => {
    const { error: err } = await supabase.from('seasons').update(updates).eq('id', id);
    if (err) throw err;
    await loadSeasons();
  };

  const deleteSeason = async (id) => {
    const { error: err } = await supabase.from('seasons').delete().eq('id', id);
    if (err) throw err;
    await loadSeasons();
  };

  const activateSeason = async (id) => {
    const current = seasons.find(s => s.is_active);
    if (current && current.id !== id) {
      const { error: err1 } = await supabase
        .from('seasons').update({ is_active: false }).eq('id', current.id);
      if (err1) throw err1;
    }
    const { error: err2 } = await supabase
      .from('seasons').update({ is_active: true }).eq('id', id);
    if (err2) throw err2;
    await loadSeasons();
  };

  // ============ MUTATIONS INSTRUCTORS ============
  const updateInstructor = async (id, updates) => {
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', id);
    if (err) throw err;
    await loadInstructors();
  };

  const deleteInstructor = async (id) => {
    const { error: err } = await supabase.from('profiles').delete().eq('id', id);
    if (err) throw err;
    await loadInstructors();
  };

  // ============ VALEUR EXPOSÉE ============
  const value = {
    // Données
    program, tiers, sessions, seasons, instructors,
    // États de chargement
    loadingProgram, loadingSessions, loadingSeasons, loadingInstructors,
    // États d'erreur
    errorProgram, errorSessions, errorSeasons, errorInstructors,
    // Reloads manuels
    reloadProgram: loadProgram,
    reloadSessions: loadSessions,
    reloadSeasons: loadSeasons,
    reloadInstructors: loadInstructors,
    // Mutations sessions
    deleteSession,
    // Mutations seasons
    createSeason, updateSeason, deleteSeason, activateSeason,
    // Mutations instructors
    updateInstructor, deleteInstructor,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData doit être utilisé dans DataProvider');
  return ctx;
}