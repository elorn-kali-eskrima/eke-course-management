import { useState } from 'react';
import { Edit2, Trash2, X, Check, Info } from 'lucide-react';
import { useInstructors } from './useInstructors';
import { useAuth } from './useAuth';
import SeasonsManager from './SeasonsManager';
import TiersManager from './TiersManager';
import LevelsManager from './LevelsManager';


const COLOR_PALETTE = [
  '#000000', '#374151', '#7c2d12', '#991b1b', '#dc2626',
  '#ea580c', '#d97706', '#16a34a', '#0d9488', '#0369a1',
  '#1e40af', '#6d28d9', '#c026d3', '#be185d',
];

export default function ConfigTab() {
  const { instructors, loading, error, updateInstructor, deleteInstructor } = useInstructors();
  const { profile } = useAuth();

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ full_name: '', color: '#000000', role: 'instructor' });
  const [errorMsg, setErrorMsg] = useState('');

  const startEdit = (inst) => {
    setEditingId(inst.id);
    setForm({ full_name: inst.full_name, color: inst.color, role: inst.role });
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
  };

  const saveEdit = async () => {
    if (!form.full_name.trim()) {
      setErrorMsg('Le nom ne peut pas être vide');
      return;
    }
    try {
      await updateInstructor(editingId, {
        full_name: form.full_name.trim(),
        color: form.color,
        role: form.role,
      });
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (inst) => {
    if (inst.id === profile.id) {
      alert("Tu ne peux pas supprimer ton propre compte.");
      return;
    }
    if (!confirm(`Supprimer le profil de ${inst.full_name} ?\n\nNote : Cela supprime uniquement le profil dans l'app. Le compte d'authentification doit être supprimé séparément dans Supabase Dashboard.`)) return;
    try {
      await deleteInstructor(inst.id);
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-black/60">⏳ Chargement…</div>;
  }
  if (error) {
    return <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 max-w-4xl mx-auto">❌ Erreur : {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Titre */}
      <div className="mb-5 flex items-baseline gap-3">
        <div className="text-xs font-mono text-black/30">04</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.05em' }}>
            <span className="text-xl">⚙️</span>
            Configuration
          </h2>
          <div className="text-xs text-black/50 uppercase tracking-[0.2em]">
            Administration du club
          </div>
        </div>
      </div>

      {/* Instructions pour ajouter un compte */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-bold mb-1">➕ Ajouter un nouvel instructeur</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Va sur <strong>Supabase Dashboard → Authentication → Users → Add user → Create new user</strong></li>
              <li>Renseigne email + mot de passe, coche <strong>"Auto Confirm User"</strong></li>
              <li>Reviens ici et rafraîchis → un profil vide apparaîtra dans la liste</li>
              <li>Clique sur ✏️ pour le renseigner (nom, couleur, rôle)</li>
            </ol>
          </div>
        </div>
      </div>

{/* Gestion des saisons */}
      <SeasonsManager />

      {/* Gestion des tiers */}
      <TiersManager />

      {/* Gestion des niveaux */}
      <LevelsManager />

      {/* Liste des instructeurs */}
      <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
        <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">
          👥 Instructeurs ({instructors.length})
        </h3>

        <div className="space-y-2">
          {instructors.map(inst => {
            const isEditing = editingId === inst.id;
            const isMe = inst.id === profile.id;

            return (
              <div key={inst.id} className="bg-stone-50 rounded p-3">
                {isEditing ? (
                  // Mode édition
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wider font-bold">✏️ Modifier</div>
                      <button onClick={cancelEdit} className="p-1 hover:bg-black/5 rounded"><X size={16} /></button>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">Nom complet</label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="ex: Guro Marc"
                        className="w-full px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">🎨 Couleur</label>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="color"
                          value={form.color}
                          onChange={e => setForm({ ...form, color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-black/10"
                        />
                        <input
                          type="text"
                          value={form.color}
                          onChange={e => setForm({ ...form, color: e.target.value })}
                          className="w-24 px-2 py-2 border border-black/15 rounded text-xs font-mono uppercase"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setForm({ ...form, color: c })}
                            className={`w-7 h-7 rounded-full border-2 transition ${form.color.toLowerCase() === c.toLowerCase() ? 'border-black scale-110' : 'border-white hover:scale-110'}`}
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-black/60 mb-1">Rôle</label>
                      <select
                        value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}
                        disabled={isMe}
                        className="w-full px-3 py-2 border border-black/15 rounded text-sm bg-white focus:outline-none focus:border-black disabled:bg-stone-100 disabled:text-black/50"
                      >
                        <option value="instructor">🥋 Instructeur</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                      {isMe && <div className="text-[10px] text-black/40 mt-1">Tu ne peux pas modifier ton propre rôle.</div>}
                    </div>

                    {errorMsg && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                        ❌ {errorMsg}
                      </div>
                    )}

                    <button
                      onClick={saveEdit}
                      className="w-full bg-black text-white py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-stone-800 transition"
                    >
                      💾 Enregistrer
                    </button>
                  </div>
                ) : (
                  // Mode affichage
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: inst.color }}
                    >
                      {inst.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                        {inst.full_name || <span className="text-black/40 italic">Profil vide — à renseigner</span>}
                        {isMe && <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Toi</span>}
                      </div>
                      <div className="text-xs text-black/60 uppercase tracking-wider flex items-center gap-2">
                        {inst.role === 'admin' ? '👑 Admin' : '🥋 Instructeur'}
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(inst)}
                      className="p-2 hover:bg-black/5 rounded"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => handleDelete(inst)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded"
                        title="Supprimer le profil"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}