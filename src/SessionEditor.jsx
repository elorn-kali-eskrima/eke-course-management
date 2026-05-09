import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, Save, X } from 'lucide-react';
import { useData } from './useData';

/**
 * Formulaire d'édition d'une session existante.
 * Réutilise le pattern de SessionsTab mais pré-rempli avec les données existantes.
 */
export default function SessionEditor({ session, onSave, onCancel }) {
  const { program, tiers, updateSession } = useData();

  // États initialisés avec les valeurs de la session
  const [date, setDate] = useState(session.date);
  const [comment, setComment] = useState(session.comment || '');
  const [selectedSkills, setSelectedSkills] = useState(() => {
    const initial = {};
    session.session_skills?.forEach(ss => {
      if (ss.skill?.id) initial[ss.skill.id] = true;
    });
    return initial;
  });
  const [expandedLevels, setExpandedLevels] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getTierColor = (tierId) => tiers.find(t => t.id === tierId)?.color || '#000';
  const getTierEmoji = (tierId) => tiers.find(t => t.id === tierId)?.emoji || '⚪';

  const visibleProgram = useMemo(() => {
    return (program || []).filter(l => l.is_visible !== false);
  }, [program]);

  const selectedCount = Object.keys(selectedSkills).length;
  const hasChanges =
    date !== session.date ||
    comment !== (session.comment || '') ||
    !sameSelection(selectedSkills, session);

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev => {
      const next = { ...prev };
      if (next[skillId]) delete next[skillId];
      else next[skillId] = true;
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedCount === 0) {
      setErrorMsg('Sélectionne au moins une compétence');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await updateSession(session.id, {
        date,
        comment: comment.trim() || null,
        skillIds: Object.keys(selectedSkills),
      });
      onSave();
    } catch (err) {
      console.error('[SessionEditor] save error:', err);
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bandeau d'info en mode édition */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm flex items-center justify-between">
        <span className="text-amber-900">✏️ <strong>Mode édition</strong></span>
        <button
          onClick={onCancel}
          className="text-xs text-amber-900/70 hover:text-amber-900 underline"
        >
          Annuler
        </button>
      </div>

      {/* Date + commentaire */}
      <div className="bg-white border border-black/10 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-black/60 mb-1">
            📅 Date
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-black/60 mb-1">
            💬 Commentaire
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Notes sur la séance (optionnel)…"
            className="w-full px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black resize-none"
          />
          <div className="text-[10px] text-black/40 mt-1 text-right">
            {comment.length}/500
          </div>
        </div>
      </div>

      {/* Compétences */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-black/70">
            🥋 Compétences travaillées
          </div>
          <div className="text-xs font-mono text-black/60">
            ✓ {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
          </div>
        </div>

        <div className="space-y-2">
          {visibleProgram.map(level => {
            const isOpen = expandedLevels[level.id];
            const tierColor = getTierColor(level.tier_id);
            const tierEmoji = getTierEmoji(level.tier_id);

            // Compter les compétences cochées dans ce niveau
            const levelSkillIds = level.categories.flatMap(c => c.skills.map(s => s.id));
            const checkedInLevel = levelSkillIds.filter(id => selectedSkills[id]).length;

            return (
              <div key={level.id} className="bg-white border border-black/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedLevels(prev => ({ ...prev, [level.id]: !prev[level.id] }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-white text-[10px] font-black" style={{ background: tierColor }}>
                      {level.id}
                    </span>
                    <span className="text-base">{tierEmoji}</span>
                    <span className="text-sm font-semibold">{level.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkedInLevel > 0 && (
                      <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: tierColor }}>
                        {checkedInLevel}
                      </span>
                    )}
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-black/10 p-3 space-y-3 bg-stone-50/50">
                    {level.categories.map(cat => (
                      <div key={cat.id}>
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/50 mb-1.5">
                          {cat.emoji || '🥋'} {cat.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.skills.map(sk => {
                            const isSelected = !!selectedSkills[sk.id];
                            return (
                              <button
                                key={sk.id}
                                onClick={() => toggleSkill(sk.id)}
                                className={`text-xs px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'text-white border-transparent'
                                    : 'bg-white border-black/15 hover:border-black/40'
                                }`}
                                style={isSelected ? { background: tierColor } : undefined}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                                {sk.name}
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
      </div>

      {/* Erreur */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          ❌ {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 sticky bottom-20 sm:bottom-4 bg-stone-50 pt-3 -mx-1 px-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-3 border border-black/20 rounded text-sm font-semibold hover:bg-stone-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <X size={16} /> Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || selectedCount === 0 || !hasChanges}
          className="flex-1 px-4 py-3 bg-black text-white rounded text-sm font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Enregistrement…' : `💾 Enregistrer (${selectedCount})`}
        </button>
      </div>
    </div>
  );
}

// Helper : compare la sélection actuelle avec celle de la session originale
function sameSelection(selectedSkills, session) {
  const original = new Set();
  session.session_skills?.forEach(ss => {
    if (ss.skill?.id) original.add(ss.skill.id);
  });
  const current = new Set(Object.keys(selectedSkills));
  if (original.size !== current.size) return false;
  for (const id of original) if (!current.has(id)) return false;
  return true;
}