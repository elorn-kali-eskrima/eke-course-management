import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from './useAuth';
import { useData } from './useData';

export default function HistoryTab() {
  const { sessions, loadingSessions: loading, errorSessions: error, deleteSession, program, tiers, seasons } = useData();
  const { profile } = useAuth();

  const activeSeason = seasons.find(s => s.is_active);
  const [filterSeason, setFilterSeason] = useState('active'); // 'active' | 'all' | <id>
  const [filterInstructor, setFilterInstructor] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';

  // Liste dédupliquée des instructeurs présents dans les séances
  const instructors = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      if (s.instructor) map.set(s.instructor.id, s.instructor);
    });
    return Array.from(map.values());
  }, [sessions]);

// Détermination de l'ID de saison à filtrer
  const seasonIdToFilter =
    filterSeason === 'all' ? null
    : filterSeason === 'active' ? activeSeason?.id
    : filterSeason;

  // Filtrage
  const filtered = sessions.filter(s => {
    if (seasonIdToFilter && s.season_id !== seasonIdToFilter) return false;
    if (filterInstructor !== 'all' && s.instructor_id !== filterInstructor) return false;
    if (filterLevel !== 'all') {
      const levels = new Set(s.session_skills.map(ss => ss.skill?.category?.level?.id).filter(Boolean));
      if (!levels.has(filterLevel)) return false;
    }
    return true;
  });

  const handleDelete = async (sessionId) => {
    if (!confirm('Supprimer cette séance ?')) return;
    try {
      await deleteSession(sessionId);
      if (expandedId === sessionId) setExpandedId(null);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

// Bloquer uniquement au tout premier chargement (pas pendant les refresh silencieux)
  if (loading && sessions.length === 0) {
    return <div className="p-6 text-center text-black/60">⏳ Chargement de l'historique…</div>;
  }
  if (error) {
    return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 max-w-4xl mx-auto">❌ Erreur : {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Titre */}
      <div className="mb-5 flex items-baseline gap-3">
        <div className="text-xs font-mono text-black/30">02</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
            <span className="text-xl">📚</span>
            Historique des séances
          </h2>
          <div className="text-xs text-black/50 uppercase tracking-[0.2em]">
            {filtered.length} séance{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

{/* Filtres */}
      <div className="bg-white border border-black/10 rounded-lg p-3 mb-4 flex flex-wrap gap-2">
        <select
          value={filterSeason}
          onChange={e => setFilterSeason(e.target.value)}
          className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black font-semibold"
        >
          <option value="active">📅 Saison active{activeSeason ? ` (${activeSeason.name})` : ''}</option>
          <option value="all">📅 Toutes les saisons</option>
          {seasons.filter(s => !s.is_active).map(s => (
            <option key={s.id} value={s.id}>📅 {s.name}</option>
          ))}
        </select>
        <select
          value={filterInstructor}
          onChange={e => setFilterInstructor(e.target.value)}
          className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
        >
          <option value="all">👥 Tous les instructeurs</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
        </select>
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
        >
          <option value="all">🎯 Tous les niveaux</option>
          {program?.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-black/40">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm">Aucune séance enregistrée pour l'instant.</div>
          <div className="text-xs mt-1">Va dans l'onglet 📝 Séances pour en créer une.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(session => {
            const isOpen = expandedId === session.id;
            const skillCount = session.session_skills.length;
            const levels = [...new Set(session.session_skills
              .map(ss => ss.skill?.category?.level?.id)
              .filter(Boolean))];
            const canDelete = profile?.role === 'admin' || profile?.id === session.created_by;
            const instructorName = session.instructor?.full_name || '?';
            const instructorColor = session.instructor?.color || '#000';

            // Regrouper par niveau > catégorie
            const grouped = {};
            session.session_skills.forEach(ss => {
              const level = ss.skill?.category?.level;
              const cat = ss.skill?.category;
              if (!level || !cat) return;
              const levelKey = level.id;
              if (!grouped[levelKey]) grouped[levelKey] = { level, categories: {} };
              if (!grouped[levelKey].categories[cat.id]) {
                grouped[levelKey].categories[cat.id] = { cat, skills: [] };
              }
              grouped[levelKey].categories[cat.id].skills.push(ss.skill);
            });

            return (
              <div key={session.id} className="bg-white border border-black/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(isOpen ? null : session.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: instructorColor }}
                    >
                      {instructorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        📅 {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {session.comment && <MessageSquare size={12} className="text-black/50" />}
                      </div>
                      <div className="text-xs text-black/60 flex items-center gap-2 flex-wrap">
                        <span>{instructorName}</span>
                        <span>·</span>
                        <span>✓ {skillCount} comp.</span>
                        {levels.length > 0 && <><span>·</span><span>{levels.join(', ')}</span></>}
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={18} className="flex-shrink-0" /> : <ChevronRight size={18} className="flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-black/10 p-4 bg-stone-50/50 space-y-3">
                    {/* Commentaire */}
                    {session.comment && (
                      <div className="border-l-4 border-black/40 pl-3 py-2 bg-white/80 rounded-r">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/50 mb-1 flex items-center gap-1">
                          <MessageSquare size={11} /> Note
                        </div>
                        <div className="text-sm italic text-black/80">{session.comment}</div>
                      </div>
                    )}

                    {/* Compétences groupées */}
                    {Object.values(grouped).map(({ level, categories }) => {
                      const tierColor = getTierColor(level.tier_id);
                      return Object.values(categories).map(({ cat, skills }) => (
                        <div key={`${level.id}-${cat.id}`}>
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/50 mb-1.5 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-white text-[9px]" style={{ background: tierColor }}>{level.id}</span>
                            <span>{cat.emoji || '🥋'} {cat.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map(sk => (
                              <span key={sk.id} className="text-xs bg-white border border-black/10 px-2 py-1 rounded">{sk.name}</span>
                            ))}
                          </div>
                        </div>
                      ));
                    })}

                    {/* Suppression */}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="flex items-center gap-2 text-xs text-red-600 hover:text-red-800 mt-3"
                      >
                        <Trash2 size={14} /> 🗑️ Supprimer la séance
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}