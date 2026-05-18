import { useState } from 'react';
import { Download, Upload, AlertTriangle, Check, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useData } from './useData';

const BACKUP_VERSION = 1;

export default function BackupManager() {
  const { reloadProgram, reloadSessions, reloadSeasons, reloadInstructors } = useData();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // ============ EXPORT ============
  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      // Lire toutes les tables
      const [tiers, levels, categories, skills, seasons, profiles, sessions, sessionSkills, branding] = await Promise.all([
        supabase.from('tiers').select('*'),
        supabase.from('levels').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('skills').select('*'),
        supabase.from('seasons').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('session_skills').select('*'),
        supabase.from('branding').select('*'),
      ]);

      // Vérifier les erreurs
      for (const [name, res] of [
        ['tiers', tiers], ['levels', levels], ['categories', categories],
        ['skills', skills], ['seasons', seasons], ['profiles', profiles],
        ['sessions', sessions], ['session_skills', sessionSkills], ['branding', branding],
      ]) {
        if (res.error) throw new Error(`Erreur lecture ${name}: ${res.error.message}`);
      }

      const backup = {
        _meta: {
          version: BACKUP_VERSION,
          app: 'EKE Course Management',
          exported_at: new Date().toISOString(),
          exported_by: 'admin',
        },
        tiers: tiers.data || [],
        levels: levels.data || [],
        categories: categories.data || [],
        skills: skills.data || [],
        seasons: seasons.data || [],
        profiles: profiles.data || [],
        sessions: sessions.data || [],
        session_skills: sessionSkills.data || [],
        branding: branding.data || [],
      };

      // Générer le fichier et déclencher le téléchargement
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `eke-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const counts = {
        séances: backup.sessions.length,
        compétences: backup.skills.length,
        saisons: backup.seasons.length,
      };
      setMessage({
        type: 'success',
        text: `✅ Sauvegarde téléchargée : ${counts.séances} séances, ${counts.compétences} compétences, ${counts.saisons} saisons.`,
      });
    } catch (err) {
      console.error('[BackupManager] export error:', err);
      setMessage({ type: 'error', text: `❌ Erreur export : ${err.message}` });
    } finally {
      setExporting(false);
    }
  };

  // ============ SÉLECTION FICHIER IMPORT ============
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setConfirmText('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed._meta || parsed._meta.app !== 'EKE Course Management') {
          throw new Error("Ce fichier n'est pas une sauvegarde EKE valide.");
        }
        setImportFile(parsed);
        setImportPreview({
          date: parsed._meta.exported_at,
          tiers: parsed.tiers?.length || 0,
          levels: parsed.levels?.length || 0,
          categories: parsed.categories?.length || 0,
          skills: parsed.skills?.length || 0,
          seasons: parsed.seasons?.length || 0,
          sessions: parsed.sessions?.length || 0,
          session_skills: parsed.session_skills?.length || 0,
        });
      } catch (err) {
        setMessage({ type: 'error', text: `❌ Fichier invalide : ${err.message}` });
        setImportFile(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // ============ IMPORT (RESTAURATION) ============
  const handleImport = async () => {
    if (confirmText !== 'RESTAURER') {
      setMessage({ type: 'error', text: '❌ Tape exactement RESTAURER pour confirmer.' });
      return;
    }
    setImporting(true);
    setMessage(null);

    try {
      const b = importFile;

      // ORDRE IMPORTANT : on supprime dans l'ordre inverse des dépendances
      // puis on réinsère dans l'ordre des dépendances.

      // 1. Suppression (ordre inverse des FK)
      await supabase.from('session_skills').delete().neq('session_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('skills').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('levels').delete().neq('id', '___nonexistent___');
      await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('tiers').delete().neq('id', '___nonexistent___');

      // 2. Réinsertion (ordre des dépendances)
      const insert = async (table, rows) => {
        if (!rows || rows.length === 0) return;
        const { error } = await supabase.from(table).insert(rows);
        if (error) throw new Error(`Insertion ${table}: ${error.message}`);
      };

      await insert('tiers', b.tiers);
      await insert('seasons', b.seasons);
      await insert('levels', b.levels);
      await insert('categories', b.categories);
      await insert('skills', b.skills);
      // profiles : on ne réinsère pas (liés à auth.users) — voir note
      await insert('sessions', b.sessions);
      await insert('session_skills', b.session_skills);

      // 3. Recharger tout le cache
      await Promise.all([
        reloadProgram(),
        reloadSessions(),
        reloadSeasons(),
        reloadInstructors(),
      ]);

      setMessage({
        type: 'success',
        text: `✅ Restauration réussie ! ${b.sessions?.length || 0} séances restaurées. Vérifie les données dans les onglets.`,
      });
      setImportFile(null);
      setImportPreview(null);
      setConfirmText('');
    } catch (err) {
      console.error('[BackupManager] import error:', err);
      setMessage({
        type: 'error',
        text: `❌ Erreur restauration : ${err.message}. Les données peuvent être partiellement restaurées. Vérifie dans Supabase.`,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white border border-black/10 rounded-lg p-4 mb-4">
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-black/70 mb-3 pb-2 border-b border-black/10">
        💾 Sauvegarde & Restauration
      </h3>

      <p className="text-xs text-black/60 mb-4">
        Exporte régulièrement une sauvegarde de tes données. En cas de problème,
        tu pourras les restaurer. Conserve les fichiers dans un endroit sûr (Google Drive, disque…).
      </p>

      {/* Message global */}
      {message && (
        <div className={`p-3 rounded text-sm mb-4 ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* EXPORT */}
      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider font-bold text-black/60 mb-2">
          📤 Exporter
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto px-4 py-2.5 bg-black text-white rounded text-sm font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={16} />
          {exporting ? 'Export en cours…' : 'Télécharger une sauvegarde'}
        </button>
        <p className="text-[11px] text-black/50 mt-2">
          Génère un fichier <code className="bg-stone-100 px-1 rounded">eke-backup-AAAA-MM-JJ.json</code> contenant toutes les données.
        </p>
      </div>

      {/* IMPORT */}
      <div className="border-t border-black/10 pt-4">
        <div className="text-xs uppercase tracking-wider font-bold text-black/60 mb-2">
          📥 Restaurer
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded mb-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-800">
            <strong>Attention :</strong> la restauration <strong>efface toutes les données actuelles</strong> (séances, programme, saisons)
            et les remplace par celles du fichier. Cette action est irréversible. Fais d'abord un export de sécurité.
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-black/60 mb-1 block">Choisir un fichier de sauvegarde (.json)</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelect}
            className="block w-full text-xs text-black/70 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-black file:text-white file:text-xs file:font-bold file:uppercase file:tracking-wider hover:file:bg-stone-800 file:cursor-pointer"
          />
        </label>

        {/* Aperçu du fichier */}
        {importPreview && (
          <div className="mt-3 p-3 bg-stone-50 border border-black/10 rounded">
            <div className="text-xs font-bold mb-2">📋 Aperçu de la sauvegarde</div>
            <div className="text-[11px] text-black/60 space-y-0.5">
              <div>Date d'export : {new Date(importPreview.date).toLocaleString('fr-FR')}</div>
              <div>Tiers : {importPreview.tiers} · Niveaux : {importPreview.levels} · Catégories : {importPreview.categories}</div>
              <div>Compétences : {importPreview.skills} · Saisons : {importPreview.seasons}</div>
              <div className="font-bold text-black/80">Séances : {importPreview.sessions} · Compétences cochées : {importPreview.session_skills}</div>
            </div>

            <div className="mt-3 pt-3 border-t border-black/10">
              <label className="text-xs text-black/70 block mb-1">
                Pour confirmer, tape <strong>RESTAURER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="RESTAURER"
                className="w-full px-3 py-2 border border-black/20 rounded text-sm mb-2 focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportFile(null); setImportPreview(null); setConfirmText(''); }}
                  disabled={importing}
                  className="flex-1 px-3 py-2 border border-black/20 rounded text-xs font-semibold hover:bg-stone-100 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <X size={14} /> Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || confirmText !== 'RESTAURER'}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <Upload size={14} />
                  {importing ? 'Restauration…' : 'Restaurer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note sur les comptes */}
      <div className="mt-4 pt-3 border-t border-black/10">
        <p className="text-[11px] text-black/50">
          ℹ️ Les <strong>comptes utilisateurs</strong> (login/mot de passe) ne sont pas inclus dans la restauration
          pour des raisons de sécurité. En cas de restauration totale, recrée les comptes dans Supabase
          (voir le guide « Plan de reprise »).
        </p>
      </div>
    </div>
  );
}