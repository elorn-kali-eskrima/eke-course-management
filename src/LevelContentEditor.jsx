import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from './supabaseClient';
import { categoriesApi, skillsApi } from './useCategoriesAdmin';

const EMOJI_SUGGESTIONS = ['🥋', '🥢', '🥍', '🔪', '👊', '👣', '⚔️', '🌀', '🤼', '🙏', '🎯', '⭐', '🔥', '💪', '🛡️', '🏹'];

export default function LevelContentEditor({ levelId }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // États locaux pour l'édition
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🥋');

  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatEmoji, setEditCatEmoji] = useState('🥋');

  const [addingSkillCatId, setAddingSkillCatId] = useState(null);
  const [newSkillName, setNewSkillName] = useState('');

  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editSkillName, setEditSkillName] = useState('');

  const reload = () => setReloadKey(k => k + 1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji, sort_order, skills (id, name, sort_order)')
        .eq('level_id', levelId)
        .order('sort_order');
      if (!error && data) {
        // Trier les compétences côté client
        data.forEach(c => c.skills.sort((a, b) => a.sort_order - b.sort_order));
        setCategories(data);
      }
      setLoading(false);
    }
    load();
  }, [levelId, reloadKey]);

  // ============ CATÉGORIES ============
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await categoriesApi.create({
        level_id: levelId,
        name: newCatName.trim(),
        emoji: newCatEmoji || '🥋',
      });
      setNewCatName('');
      setNewCatEmoji('🥋');
      setAddingCategory(false);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const startEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatEmoji(cat.emoji || '🥋');
  };

  const handleSaveCategory = async () => {
    if (!editCatName.trim()) return;
    try {
      await categoriesApi.update(editingCatId, {
        name: editCatName.trim(),
        emoji: editCatEmoji || '🥋',
      });
      setEditingCatId(null);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const skillCount = cat.skills?.length || 0;
    let msg = `Supprimer la catégorie "${cat.name}" ?`;
    if (skillCount > 0) {
      msg += `\n\n⚠️ ${skillCount} compétence${skillCount > 1 ? 's seront supprimées' : ' sera supprimée'} avec elle.`;
    }
    msg += '\n\nIrréversible.';
    if (!confirm(msg)) return;
    try {
      await categoriesApi.delete(cat.id);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleMoveCategory = async (cat, direction) => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    try {
      await categoriesApi.swap(cat, categories[targetIdx]);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // ============ COMPÉTENCES ============
  const handleAddSkill = async (categoryId) => {
    if (!newSkillName.trim()) return;
    try {
      await skillsApi.create({ category_id: categoryId, name: newSkillName.trim() });
      setNewSkillName('');
      setAddingSkillCatId(null);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const startEditSkill = (sk) => {
    setEditingSkillId(sk.id);
    setEditSkillName(sk.name);
  };

  const handleSaveSkill = async () => {
    if (!editSkillName.trim()) return;
    try {
      await skillsApi.update(editingSkillId, { name: editSkillName.trim() });
      setEditingSkillId(null);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleDeleteSkill = async (sk) => {
    if (!confirm(`Supprimer la compétence "${sk.name}" ?\n\nElle sera retirée des séances qui la référencent.`)) return;
    try {
      await skillsApi.delete(sk.id);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleMoveSkill = async (cat, sk, direction) => {
    const idx = cat.skills.findIndex(s => s.id === sk.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cat.skills.length) return;
    try {
      await skillsApi.swap(sk, cat.skills[targetIdx]);
      reload();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) return <div className="text-xs text-black/40 p-2">⏳ Chargement…</div>;

  return (
    <div className="space-y-2 mt-2 pl-4 border-l-2 border-black/10">
      {categories.length === 0 && !addingCategory && (
        <div className="text-xs text-black/40 italic p-2">Aucune catégorie. Ajoutes-en une ci-dessous.</div>
      )}

      {/* Liste des catégories */}
      {categories.map((cat, catIdx) => {
        const isEditingCat = editingCatId === cat.id;
        const isFirstCat = catIdx === 0;
        const isLastCat = catIdx === categories.length - 1;

        return (
          <div key={cat.id} className="bg-white rounded border border-black/10 p-2">
            {/* Ligne catégorie */}
            {isEditingCat ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={editCatEmoji}
                  onChange={e => setEditCatEmoji(e.target.value)}
                  maxLength={2}
                  className="w-10 px-1 py-1 border border-black/15 rounded text-center"
                />
                <input
                  type="text"
                  value={editCatName}
                  onChange={e => setEditCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(); if (e.key === 'Escape') setEditingCatId(null); }}
                  autoFocus
                  className="flex-1 px-2 py-1 border border-black/15 rounded text-sm"
                />
                <button onClick={handleSaveCategory} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
                <button onClick={() => setEditingCatId(null)} className="p-1 text-black/60 hover:bg-stone-100 rounded"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex flex-col">
                  <button onClick={() => handleMoveCategory(cat, 'up')} disabled={isFirstCat} className="p-0 hover:bg-black/5 rounded disabled:opacity-20"><ChevronUp size={12} /></button>
                  <button onClick={() => handleMoveCategory(cat, 'down')} disabled={isLastCat} className="p-0 hover:bg-black/5 rounded disabled:opacity-20"><ChevronDown size={12} /></button>
                </div>
                <span className="text-base">{cat.emoji || '🥋'}</span>
                <span className="text-xs uppercase tracking-[0.15em] font-bold flex-1">{cat.name}</span>
                <span className="text-[10px] text-black/40">{cat.skills?.length || 0}</span>
                <button onClick={() => startEditCategory(cat)} className="p-1 hover:bg-black/5 rounded"><Edit2 size={12} /></button>
                <button onClick={() => handleDeleteCategory(cat)} className="p-1 hover:bg-red-50 text-red-600 rounded"><Trash2 size={12} /></button>
              </div>
            )}

            {/* Liste des compétences */}
            <div className="pl-4 space-y-1">
              {cat.skills?.map((sk, skIdx) => {
                const isEditingSk = editingSkillId === sk.id;
                const isFirstSk = skIdx === 0;
                const isLastSk = skIdx === cat.skills.length - 1;

                return (
                  <div key={sk.id} className="flex items-center gap-2 group">
                    {isEditingSk ? (
                      <>
                        <input
                          type="text"
                          value={editSkillName}
                          onChange={e => setEditSkillName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveSkill(); if (e.key === 'Escape') setEditingSkillId(null); }}
                          autoFocus
                          className="flex-1 px-2 py-1 border border-black rounded text-xs"
                        />
                        <button onClick={handleSaveSkill} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
                        <button onClick={() => setEditingSkillId(null)} className="p-1 text-black/60 hover:bg-stone-100 rounded"><X size={12} /></button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <button onClick={() => handleMoveSkill(cat, sk, 'up')} disabled={isFirstSk} className="p-0 hover:bg-black/5 rounded disabled:opacity-20"><ChevronUp size={10} /></button>
                          <button onClick={() => handleMoveSkill(cat, sk, 'down')} disabled={isLastSk} className="p-0 hover:bg-black/5 rounded disabled:opacity-20"><ChevronDown size={10} /></button>
                        </div>
                        <span className="text-black/30 text-xs">•</span>
                        <span className="flex-1 text-xs">{sk.name}</span>
                        <button onClick={() => startEditSkill(sk)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded transition"><Edit2 size={10} /></button>
                        <button onClick={() => handleDeleteSkill(sk)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-600 rounded transition"><Trash2 size={10} /></button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Ajout d'une compétence */}
              {addingSkillCatId === cat.id ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={e => setNewSkillName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddSkill(cat.id);
                      if (e.key === 'Escape') { setAddingSkillCatId(null); setNewSkillName(''); }
                    }}
                    autoFocus
                    placeholder="Nouvelle compétence (Entrée pour valider)"
                    className="flex-1 px-2 py-1 border border-black rounded text-xs"
                  />
                  <button onClick={() => handleAddSkill(cat.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
                  <button onClick={() => { setAddingSkillCatId(null); setNewSkillName(''); }} className="p-1 text-black/60 hover:bg-stone-100 rounded"><X size={12} /></button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingSkillCatId(cat.id); setNewSkillName(''); }}
                  className="text-[10px] text-black/50 hover:text-black flex items-center gap-1 mt-1"
                >
                  <Plus size={10} /> Ajouter une compétence
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Ajout d'une catégorie */}
      {addingCategory ? (
        <div className="flex items-center gap-2 p-2 bg-stone-100 rounded">
          <input
            type="text"
            value={newCatEmoji}
            onChange={e => setNewCatEmoji(e.target.value)}
            maxLength={2}
            className="w-10 px-1 py-1 border border-black/15 rounded text-center"
          />
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') { setAddingCategory(false); setNewCatName(''); } }}
            autoFocus
            placeholder="Nom de la catégorie (Entrée pour valider)"
            className="flex-1 px-2 py-1 border border-black rounded text-xs"
          />
          <button onClick={handleAddCategory} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
          <button onClick={() => { setAddingCategory(false); setNewCatName(''); }} className="p-1 text-black/60 hover:bg-stone-100 rounded"><X size={14} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-2 mb-1">
          <button
            onClick={() => { setAddingCategory(true); setNewCatName(''); setNewCatEmoji('🥋'); }}
            className="text-xs text-black/60 hover:text-black flex items-center gap-1 px-2 py-1 border border-dashed border-black/20 rounded hover:bg-stone-50"
          >
            <Plus size={12} /> Ajouter une catégorie
          </button>
          {EMOJI_SUGGESTIONS.slice(0, 8).map(em => (
            <span key={em} className="text-xs opacity-30 hover:opacity-100 cursor-default" title={`Suggestion : ${em}`}>{em}</span>
          ))}
        </div>
      )}
    </div>
  );
}