import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Star, AlertTriangle } from 'lucide-react';
import { useSeasons } from './useSeasons';

export default function SeasonsManager() {
  const { seasons, loading, error, createSeason, updateSeason, deleteSeason, activateSeason } = useSeasons();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const startAdd = () => {
    const today = new Date();
    const year = today.getFullYear();
    // Suggestion : si on est entre janvier et juin, la saison en cours est (year-1)-year
    // Sinon (juillet-décembre), la saison à venir est year-(year+1)
    const startYear = today.getMonth() < 6 ? year : year + 1;
    setForm({
      name: `${startYear}-${startYear + 1}`,
      start_date: `${startYear}-09-01`,
      end_date: `${startYear + 1}-06-30`,
    });
    setAdding(true);
    setEditingId(null);
    setErrorMsg('');
  };

  const startEdit = (season) => {
    setForm({ name: season.name, start_date: season.start_date, end_date: season.end_date });
    setEditingId(season.id);
    setAdding(false);
    setErrorMsg('');
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setErrorMsg('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      setErrorMsg('Tous les champs sont obligatoires');
      return;
    }
    if (form.start_date >= form.end_date) {
      setErrorMsg('La date de fin doit être après la date de début');
      return;
    }
    try {
      if (adding) {
        await createSeason({
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
        });
        setAdding(false);
      } else if (editingId) {
        await updateSeason(editingId, {
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
        });
        setEditingId(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (season) => {
    if (season.is_active) {
      alert("Impossible de supprimer la saison active. Active une autre saison d'abord.");
      return;
    }
    if (!confirm(`Supprimer la saison "${season.name}" ?\n\n⚠️ Toutes les séances liées à cette saison seront aussi supprimées.`)) return;
    try {
      await deleteSeason(season.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleActivate = async (season) => {
    if (season.is_active) return;
    if (!confirm(`Activer la saison "${season.name}" ?\n\nLes nouvelles séances créées y seront automatiquement rattachées.`)) return;
    try {
      await activateSeason(season.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-sm text-black/60">⏳ Chargement…</div>;
  }
  if (error) {
    return <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">❌ {error}</div>;
  }

  const activeSeason = seasons.find(s => s.is_active);

  return (
    <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">
        📅 Saisons ({seasons.length})
      </h3>

      {/* Bandeau saison active */}
      {activeSeason ? (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-sm">
          <Star size={14} className="text-emerald-700" fill="currentColor" />
          <span className="text-emerald-900">
            Saison active : <strong>{activeSeason.name}</strong>
            <span className="text-xs text-emerald-700 ml-2">
              ({new Date(activeSeason.start_date).toLocaleDateString('fr-FR')} → {new Date(activeSeason.end_date).toLocaleDateString('fr-FR')})
            </span>
          </span>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded flex items-center gap-2 text-sm">
          <AlertTriangle size={14} className="text-amber-700" />
          <span className="text-amber-900">
            ⚠️ Aucune saison active. Active une saison pour permettre la création de nouvelles séances.
          </span>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2 mb-3">
        {seasons.map(season => {
          const isEditing = editingId === season.id;
          if (isEditing) return null; // affiché en bas

          const start = new Date(season.start_date).toLocaleDateString('fr-FR');
          const end = new Date(season.end_date).toLocaleDateString('fr-FR');

          return (
            <div key={season.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                  {season.is_active && <Star size={12} className="text-emerald-600" fill="currentColor" />}
                  {season.name}
                  {season.is_active && (
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-black/60">{start} → {end}</div>
              </div>
              {!season.is_active && (
                <button
                  onClick={() => handleActivate(season)}
                  className="text-[10px] bg-black text-white px-2 py-1 rounded uppercase tracking-wider font-bold hover:bg-stone-800"
                  title="Activer cette saison"
                >
                  Activer
                </button>
              )}
              <button onClick={() => startEdit(season)} className="p-2 hover:bg-black/5 rounded" title="Modifier">
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(season)}
                disabled={season.is_active}
                className="p-2 hover:bg-red-50 text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title={season.is_active ? "Impossible : saison active" : "Supprimer"}
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
              {adding ? '✨ Nouvelle saison' : '✏️ Modifier la saison'}
            </div>
            <button onClick={cancel} className="p-1 hover:bg-white/10 rounded"><X size={16} /></button>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Nom (ex: 2025-2026)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="2026-2027"
              className="w-full px-3 py-2 rounded bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Date de début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/60 mb-1">Date de fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded bg-white text-black"
              />
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

      {/* Bouton ajout */}
      {!adding && !editingId && (
        <button
          onClick={startAdd}
          className="w-full py-2.5 border border-dashed border-black/30 rounded text-sm font-semibold hover:bg-stone-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> ➕ Ajouter une saison
        </button>
      )}
    </div>
  );
}