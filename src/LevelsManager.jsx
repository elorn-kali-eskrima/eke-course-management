import { useState } from 'react';
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useLevelsAdmin } from './useLevelsAdmin';
import { useTiers } from './useTiers';
import LevelContentEditor from './LevelContentEditor';
import { ChevronRight } from 'lucide-react';

export default function LevelsManager() {
  const { levels, loading, error, createLevel, updateLevel, deleteLevel, moveLevel, countSessionsForLevel } = useLevelsAdmin();
  const { tiers } = useTiers();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', tier_id: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const getTier = (tierId) => tiers.find(t => t.id === tierId);

  const startAdd = () => {
    setForm({ id: '', name: '', tier_id: tiers[0]?.id || '' });
    setAdding(true);
    setEditingId(null);
    setErrorMsg('');
  };

  const startEdit = (level) => {
    setForm({ id: level.id, name: level.name, tier_id: level.tier_id });
    setEditingId(level.id);
    setAdding(false);
    setErrorMsg('');
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setErrorMsg('');
  };

  const save = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.tier_id) {
      setErrorMsg('Tous les champs sont obligatoires');
      return;
    }
    try {
      if (adding) {
        await createLevel({
          id: form.id.trim(),
          name: form.name.trim().toUpperCase(),
          tier_id: form.tier_id,
        });
        setAdding(false);
      } else if (editingId) {
        await updateLevel(editingId, {
          name: form.name.trim().toUpperCase(),
          tier_id: form.tier_id,
        });
        setEditingId(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (level) => {
    const sessionCount = await countSessionsForLevel(level.id);
    let msg = `Supprimer le niveau "${level.id}" (${level.name}) ?\n\n`;
    msg += `⚠️ Cela supprimera aussi toutes ses catégories et compétences.`;
    if (sessionCount > 0) {
      msg += `\n\n${sessionCount} compétence${sessionCount > 1 ? 's ont' : ' a'} déjà été cochée${sessionCount > 1 ? 's' : ''} dans des séances. Ces séances perdront leurs références.`;
    }
    msg += `\n\nCette action est irréversible.`;
    if (!confirm(msg)) return;
    try {
      await deleteLevel(level.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const toggleVisibility = async (level) => {
    try {
      await updateLevel(level.id, { is_visible: !level.is_visible });
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleMove = async (level, direction) => {
    try {
      await moveLevel(level.id, direction);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) return <div className="text-sm text-black/60">⏳ Chargement…</div>;
  if (error) return <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">❌ {error}</div>;

  return (
    <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">
        🥋 Niveaux ({levels.length})
      </h3>

      <p className="text-xs text-black/60 mb-4">
        Les niveaux structurent ton programme. Tu peux les réordonner avec les flèches, masquer un niveau en cours de validation avec l'œil, ou supprimer un niveau obsolète.
      </p>

      <div className="space-y-2 mb-3">
        {levels.map((level, idx) => {
          const isEditing = editingId === level.id;
          if (isEditing) return null;

          const tier = getTier(level.tier_id);
          const tierColor = tier?.color || '#000';
          const tierEmoji = tier?.emoji || '⚪';
          const isFirst = idx === 0;
          const isLast = idx === levels.length - 1;

          const isExpanded = expandedId === level.id;

          return (
            <div key={level.id} className={`rounded ${level.is_visible ? 'bg-stone-50' : 'bg-stone-100 opacity-60'}`}>
              <div className="flex items-center gap-2 p-3">
                {/* Chevron pour déplier */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : level.id)}
                  className="p-1 hover:bg-black/5 rounded"
                  title={isExpanded ? 'Replier' : 'Déplier le contenu'}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Boutons réordonner */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(level, 'up')}
                    disabled={isFirst}
                    className="p-0.5 hover:bg-black/5 rounded disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Monter"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(level, 'down')}
                    disabled={isLast}
                    className="p-0.5 hover:bg-black/5 rounded disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Descendre"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Badge niveau */}
                <span className="px-2 py-0.5 text-[10px] font-black rounded text-white" style={{ background: tierColor }}>
                  {level.id}
                </span>
                <span className="text-base">{tierEmoji}</span>

                {/* Nom + tier */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {level.name}
                    {!level.is_visible && (
                      <span className="text-[9px] bg-stone-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                        Masqué
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-black/50">{level.tier_id}</div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => toggleVisibility(level)}
                  className={`p-2 rounded ${level.is_visible ? 'hover:bg-black/5' : 'hover:bg-emerald-50 text-emerald-600'}`}
                  title={level.is_visible ? 'Masquer' : 'Afficher'}
                >
                  {level.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => startEdit(level)} className="p-2 hover:bg-black/5 rounded" title="Modifier">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(level)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Contenu dépliable : catégories et compétences */}
              {isExpanded && (
                <div className="px-3 pb-3">
                  <LevelContentEditor levelId={level.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulaire add/edit */}
      {(adding || editingId) && (
        <div className="p-4 bg-black text-white rounded space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider font-bold">
              {adding ? '✨ Nouveau niveau' : `✏️ Modifier ${editingId}`}
            </div>
            <button onClick={cancel} className="p-1 hover:bg-white/10 rounded"><X size={16} /></button>
          </div>

          {adding && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Code (ex: A/L1)</label>
              <input
                type="text"
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value })}
                placeholder="A/L1"
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
              <div className="text-[10px] text-white/50 mt-1">Le code sert d'identifiant — il ne pourra plus être modifié.</div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Nom complet</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="ADVANCED / LEVEL 1"
              className="w-full px-3 py-2 rounded bg-white text-black"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Tier</label>
            <select
              value={form.tier_id}
              onChange={e => setForm({ ...form, tier_id: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-black"
            >
              <option value="">— Choisir un tier —</option>
              {tiers.map(t => (
                <option key={t.id} value={t.id}>{t.emoji} {t.id}</option>
              ))}
            </select>
          </div>

          {/* Aperçu */}
          {form.tier_id && (
            <div className="p-3 bg-white/10 rounded">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-2">Aperçu</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-white text-[10px] font-black" style={{ background: getTier(form.tier_id)?.color || '#000' }}>
                  {form.id || '?'}
                </span>
                <span className="text-base">{getTier(form.tier_id)?.emoji || '⚪'}</span>
                <span className="text-sm">{form.name || '...'}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 bg-red-500/20 border border-red-300 rounded text-xs">
              ❌ {errorMsg}
            </div>
          )}

          <button
            onClick={save}
            className="w-full bg-white text-black py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-stone-200"
          >
            💾 Enregistrer
          </button>
        </div>
      )}

      {!adding && !editingId && (
        <button
          onClick={startAdd}
          disabled={tiers.length === 0}
          className="w-full py-2.5 border border-dashed border-black/30 rounded text-sm font-semibold hover:bg-stone-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={tiers.length === 0 ? 'Crée au moins un tier d\'abord' : ''}
        >
          <Plus size={16} /> ➕ Ajouter un niveau
        </button>
      )}
    </div>
  );
}