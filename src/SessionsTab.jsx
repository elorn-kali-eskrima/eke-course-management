import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, MessageSquare } from 'lucide-react';
import { useData } from './useData';
import { supabase } from './supabaseClient';
import { useAuth } from './useAuth';

export default function SessionsTab() {
const { program, tiers, loadingProgram: loading, errorProgram: error } = useData();
const { profile } = useAuth();

  // État du formulaire
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSkills, setSelectedSkills] = useState({}); // { skillId: true }
  const [comment, setComment] = useState('');
  const [expandedLevels, setExpandedLevels] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

if (loading && !program) {
    return <div className="p-6 text-center text-black/60">⏳ Chargement du programme…</div>;
  }
  if (error && !program) {
    return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">❌ Erreur : {error}</div>;
  }
  if (!program || program.length === 0) {
    return <div className="p-6 text-center text-black/60">Aucun niveau trouvé.</div>;
  }

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';
  const getTierEmoji = (tierId) => tiers.find(t => t.id === tierId)?.emoji || '⚪';

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev => {
      const next = { ...prev };
      if (next[skillId]) delete next[skillId];
      else next[skillId] = true;
      return next;
    });
  };

  const totalSelected = Object.keys(selectedSkills).length;

 const handleSave = async () => {
    if (totalSelected === 0) return;
    setSaving(true);
    setErrorMsg('');

    try {
      // 1. Créer la séance dans la table 'sessions'
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          date,
          instructor_id: profile.id,
          created_by: profile.id,
          comment: comment.trim() || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Lier les compétences dans la table 'session_skills'
      const skillIds = Object.keys(selectedSkills);
      const rows = skillIds.map(skillId => ({
        session_id: sessionData.id,
        skill_id: skillId,
      }));

      const { error: skillsError } = await supabase
        .from('session_skills')
        .insert(rows);

      if (skillsError) throw skillsError;

      // 3. Tout s'est bien passé : reset du formulaire
      setSelectedSkills({});
      setComment('');
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      console.error('[SessionsTab] Erreur enregistrement:', err);
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Titre */}
      <div className="mb-5 flex items-baseline gap-3">
        <div className="text-xs font-mono text-black/30">01</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
            <span className="text-xl">📝</span>
            Nouvelle séance
          </h2>
          <div className="text-xs text-black/50 uppercase tracking-[0.2em]">
            Enregistrer les compétences travaillées
          </div>
        </div>
      </div>

      {/* Date + Instructeur */}
      <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-black/60 mb-2">📅 Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-black/15 rounded focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-black/60 mb-2">👤 Instructeur</label>
            <div className="px-3 py-2.5 border border-black/15 rounded bg-stone-50 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: profile?.color }} />
              <span className="text-sm">{profile?.full_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commentaire */}
      <div className="bg-white border border-black/10 rounded-lg p-4 mb-6">
        <label className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-black/60 mb-2">
          <MessageSquare size={14} /> 💬 Notes / commentaires
          <span className="text-[10px] normal-case tracking-normal text-black/40 font-normal">(optionnel)</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 500))}
          placeholder="Remarques sur la séance : énergie du groupe, points à retravailler…"
          rows={3}
          className="w-full px-3 py-2.5 border border-black/15 rounded focus:outline-none focus:border-black resize-none text-sm"
        />
        <div className="text-[10px] text-black/40 text-right mt-1">{comment.length}/500</div>
      </div>

      {/* Header compétences */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.2em] font-semibold text-black/60">
          🥋 Compétences — Programme MARS
        </div>
        <div className="text-xs bg-black text-white px-3 py-1 rounded-full font-semibold">
          ✓ {totalSelected} sélectionnée{totalSelected > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste des niveaux avec compétences cochables */}
      <div className="space-y-2 mb-6">
        {program.filter(l => l.is_visible !== false).map(level => {
          const isOpen = expandedLevels[level.id];
          const tierColor = getTierColor(level.tier_id);
          const tierEmoji = getTierEmoji(level.tier_id);

          // Compter compétences sélectionnées dans ce niveau
          const selectedInLevel = level.categories.reduce((sum, cat) =>
            sum + cat.skills.filter(sk => selectedSkills[sk.id]).length, 0
          );

          return (
            <div key={level.id} className="border border-black/10 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setExpandedLevels(prev => ({ ...prev, [level.id]: !prev[level.id] }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-[10px] font-black rounded text-white" style={{ background: tierColor }}>
                    {level.id}
                  </span>
                  <span className="text-base">{tierEmoji}</span>
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.08em', fontSize: '16px' }}>
                    {level.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedInLevel > 0 && (
                    <span className="text-xs text-white px-2 py-0.5 rounded-full font-bold" style={{ background: tierColor }}>
                      {selectedInLevel}
                    </span>
                  )}
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-black/10 p-4 space-y-4 bg-stone-50/50">
                  {level.categories.map(cat => (
                    <div key={cat.id}>
                      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/50 mb-2 pb-1 border-b border-black/10 flex items-center gap-2">
                        <span className="text-sm">{cat.emoji || '🥋'}</span>
                        {cat.name}
                        <span className="ml-auto normal-case tracking-normal text-black/40">{cat.skills.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cat.skills.map(sk => {
                          const isChecked = !!selectedSkills[sk.id];
                          return (
                            <button
                              key={sk.id}
                              onClick={() => toggleSkill(sk.id)}
                              className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded transition ${isChecked ? 'text-white' : 'bg-white hover:bg-stone-100 border border-black/5'}`}
                              style={isChecked ? { background: tierColor } : {}}
                            >
                              <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-white border-white' : 'border-black/30'}`}>
                                {isChecked && <Check size={12} style={{ color: tierColor }} strokeWidth={3} />}
                              </div>
                              <span className="text-sm leading-tight">{sk.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

{/* Message d'erreur */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* Bouton d'enregistrement sticky */}
      <div className="sticky bottom-20 z-30">
        <button
          onClick={handleSave}
          disabled={totalSelected === 0 || saving}
          className={`w-full py-4 rounded-lg font-bold uppercase tracking-wider text-sm shadow-lg transition ${
            totalSelected === 0 || saving
              ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-stone-800'
          }`}
        >
          {saving ? '⏳ Enregistrement…' : savedMsg ? '✅ Séance enregistrée' : `💾 Enregistrer la séance${totalSelected > 0 ? ` (${totalSelected})` : ''}`}
        </button>
      </div>
    </div>
  );
}