import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useTiers } from './useTiers';
import { supabase } from './supabaseClient';

const COLOR_PALETTE = [
  '#000000', '#374151', '#7c2d12', '#991b1b', '#dc2626',
  '#ea580c', '#d97706', '#ca8a04', '#16a34a', '#0d9488',
  '#0369a1', '#1e40af', '#6d28d9', '#c026d3', '#be185d',
];

const EMOJI_SUGGESTIONS = ['🟢', '🟡', '🟠', '🔴', '🟣', '🔵', '⚫', '⚪', '🔶', '🔷', '⭐', '🥋', '🥉', '🥈', '🥇'];

export default function TiersManager() {
  const { tiers, loading, error, createTier, updateTier, deleteTier } = useTiers();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', color: '#000000', emoji: '⚪' });
  const [errorMsg, setErrorMsg] = useState('');
  const [levelCounts, setLevelCounts] = useState({});

  // Charger le nombre de niveaux par tier (pour bloquer la suppression si > 0)
  useEffect(() => {    async function loadCounts() {
      const { data } = await supabase
        .from('levels')
        .select('tier_id');
      if (data) {
        const counts = {};
        data.forEach(l => { counts[l.tier_id] = (counts[l.tier_id] || 0) + 1; });
        setLevelCounts(counts);
      }
    }
    loadCounts();
  }, [tiers]);

  const startAdd = () => {
    setForm({ id: '', color: '#374151', emoji: '⚪' });
    setAdding(true);
    setEditingId(null);
    setErrorMsg('');
  };

  const startEdit = (tier) => {
    setForm({ id: tier.id, color: tier.color, emoji: tier.emoji || '⚪' });
    setEditingId(tier.id);
    setAdding(false);
    setErrorMsg('');
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setErrorMsg('');
  };

  const save = async () => {
    if (!form.id.trim()) {
      setErrorMsg('Le nom est obligatoire');
      return;
    }
    try {
      if (adding) {
        const maxOrder = Math.max(0, ...tiers.map(t => t.sort_order || 0));
        await createTier({
          id: form.id.trim(),
          color: form.color,
          emoji: form.emoji,
          sort_order: maxOrder + 1,
        });
        setAdding(false);
      } else if (editingId) {
        await updateTier(editingId, {
          color: form.color,
          emoji: form.emoji,
        });
        setEditingId(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (tier) => {
    const count = levelCounts[tier.id] || 0;
    if (count > 0) {
      alert(`Impossible de supprimer "${tier.id}" : ${count} niveau${count > 1 ? 'x utilisent' : ' utilise'} ce tier.\n\nDéplace ou supprime d'abord les niveaux concernés.`);
      return;
    }
    if (!confirm(`Supprimer le tier "${tier.id}" ?`)) return;
    try {
      await deleteTier(tier.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) return <div className="text-sm text-black/60">⏳ Chargement…</div>;
  if (error) return <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">❌ {error}</div>;

  return (
    <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">
        🎨 Tiers / Catégories de niveaux ({tiers.length})
      </h3>

      <p className="text-xs text-black/60 mb-4">
        Les tiers regroupent tes niveaux (Beginning, Intermediate, Advanced…). Chacun a un emoji et une couleur que les niveaux héritent automatiquement.
      </p>

      <div className="space-y-2 mb-3">
        {tiers.map(tier => {
          const isEditing = editingId === tier.id;
          if (isEditing) return null;
          const levelCount = levelCounts[tier.id] || 0;

          return (
            <div key={tier.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded">
              <span className="text-2xl">{tier.emoji || '⚪'}</span>
              <div
                className="w-6 h-6 rounded border border-black/10 flex-shrink-0"
                style={{ background: tier.color }}
                title={tier.color}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{tier.id}</div>
                <div className="text-[10px] text-black/50">
                  {levelCount} niveau{levelCount > 1 ? 'x' : ''} · {tier.color}
                </div>
              </div>
              <button onClick={() => startEdit(tier)} className="p-2 hover:bg-black/5 rounded" title="Modifier">
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(tier)}
                disabled={levelCount > 0}
                className="p-2 hover:bg-red-50 text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title={levelCount > 0 ? `Niveau${levelCount > 1 ? 'x' : ''} associé${levelCount > 1 ? 's' : ''}` : 'Supprimer'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Formulaire add/edit */}
      {(adding || editingId) && (
        <div className="p-4 bg-black text-white rounded space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider font-bold">
              {adding ? '✨ Nouveau tier' : `✏️ Modifier ${editingId}`}
            </div>
            <button onClick={cancel} className="p-1 hover:bg-white/10 rounded"><X size={16} /></button>
          </div>

          {adding && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Nom (ex: Advanced)</label>
              <input
                type="text"
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value })}
                placeholder="Advanced"
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
              <div className="text-[10px] text-white/50 mt-1">Le nom servira de référence interne. Choisis-le bien : il ne pourra plus être modifié.</div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Emoji</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={form.emoji}
                onChange={e => setForm({ ...form, emoji: e.target.value })}
                maxLength={2}
                className="w-16 px-2 py-2 rounded bg-white text-black text-center text-2xl"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {EMOJI_SUGGESTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setForm({ ...form, emoji: em })}
                  className={`w-8 h-8 rounded text-lg transition ${form.emoji === em ? 'bg-white/30 ring-2 ring-white' : 'hover:bg-white/10'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Couleur</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border border-white/10"
              />
              <input
                type="text"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-28 px-2 py-2 rounded bg-white text-black text-xs font-mono uppercase"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition ${form.color.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-white/20 hover:scale-110'}`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-3 bg-white/10 rounded">
            <div className="text-[10px] uppercase tracking-wider text-white/60 mb-2">Aperçu</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-white text-[10px] font-black" style={{ background: form.color }}>
                B/L1
              </span>
              <span className="text-base">{form.emoji}</span>
              <span className="text-sm">EXEMPLE</span>
            </div>
          </div>

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
          className="w-full py-2.5 border border-dashed border-black/30 rounded text-sm font-semibold hover:bg-stone-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> ➕ Ajouter un tier
        </button>
      )}
    </div>
  );
}