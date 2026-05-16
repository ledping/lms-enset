// src/components/teacher/CoursUpload.jsx
// Upload PDF + métadonnées → POST /api/cours/upload/
// Champs : fichier (PDF), titre, description, filiere (TIC | II | TOUS)
// Réponse backend : { message, cours: CoursDetailSerializer }

import { useState, useRef } from 'react';
import api from '../../api/axiosConfig';

export default function CoursUpload({ onSuccess }) {
  const [form, setForm] = useState({
    titre:       '',
    description: '',
    filiere:     'TOUS',
  });
  const [fichier,    setFichier]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [erreur,     setErreur]     = useState('');
  const [succes,     setSucces]     = useState('');
  const [dragOver,   setDragOver]   = useState(false);

  const inputRef = useRef(null);

  // ── Gestion du formulaire ─────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErreur('');
    setSucces('');
  };

  const handleFile = (file) => {
    setErreur('');
    setSucces('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErreur('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErreur('Le fichier est trop volumineux (max 20 Mo).');
      return;
    }
    setFichier(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  // ── Soumission → POST /api/cours/upload/ ─────────────────────────────────
  const handleSubmit = async () => {
    setErreur('');
    setSucces('');

    if (!form.titre.trim()) {
      setErreur('Le titre du cours est obligatoire.');
      return;
    }
    if (!fichier) {
      setErreur('Veuillez sélectionner un fichier PDF.');
      return;
    }

    setLoading(true);
    try {
      // multipart/form-data — axios le détecte automatiquement avec FormData
      const fd = new FormData();
      fd.append('fichier',     fichier);
      fd.append('titre',       form.titre.trim());
      fd.append('description', form.description.trim());
      fd.append('filiere',     form.filiere);

      const res = await api.post('/cours/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSucces(`Cours "${res.data.cours.titre}" uploadé avec succès !`);
      setForm({ titre: '', description: '', filiere: 'TOUS' });
      setFichier(null);

      // Notifier le parent (TeacherPage) après 1.5 s
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || 'Erreur lors de l\'upload. Vérifiez votre connexion.';
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl mx-auto space-y-5 py-4">

      <div>
        <h2 className="text-lg font-black text-white">Ajouter un cours</h2>
        <p className="text-xs text-[#8b949e] mt-1">
          Uploadez un PDF — il sera stocké sur Cloudinary et accessible aux étudiants.
        </p>
      </div>

      {/* ── Zone de dépôt PDF ── */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center
                    cursor-pointer transition-all
          ${dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : fichier
            ? 'border-emerald-500/50 bg-emerald-500/10'
            : 'border-[#30363d] hover:border-[#8b949e] bg-[#161b22]'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {fichier ? (
          <>
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm font-bold text-emerald-400">{fichier.name}</p>
            <p className="text-xs text-[#8b949e] mt-1">
              {(fichier.size / 1024 / 1024).toFixed(2)} Mo
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setFichier(null); }}
              className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ✕ Retirer le fichier
            </button>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">📤</div>
            <p className="text-sm text-[#8b949e]">
              Glissez un PDF ici ou <span className="text-blue-400 font-bold">cliquez pour parcourir</span>
            </p>
            <p className="text-xs text-[#8b949e] mt-1">PDF uniquement — max 20 Mo</p>
          </>
        )}
      </div>

      {/* ── Titre ── */}
      <div>
        <label className="block text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-1.5">
          Titre du cours *
        </label>
        <input
          type="text"
          name="titre"
          value={form.titre}
          onChange={handleChange}
          placeholder="Ex : Électronique Générale — Chapitre 3 : Transistors"
          className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                     text-sm text-white placeholder-[#8b949e]
                     focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ── Description ── */}
      <div>
        <label className="block text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-1.5">
          Description <span className="text-[#8b949e] font-normal normal-case">(optionnel)</span>
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Résumé du cours, objectifs, prérequis…"
          className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                     text-sm text-white placeholder-[#8b949e] resize-none
                     focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ── Filière ── */}
      <div>
        <label className="block text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-1.5">
          Filière cible *
        </label>
        <div className="flex gap-2">
          {[
            { val: 'TOUS', label: 'Tous',                   desc: 'TIC + II' },
            { val: 'TIC',  label: 'TIC',                    desc: 'Technologies de l\'Info' },
            { val: 'II',   label: 'II',                     desc: 'Informatique Industrielle' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => { setForm(prev => ({ ...prev, filiere: opt.val })); }}
              className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all
                ${form.filiere === opt.val
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-[#0d1117] border-[#21262d] text-[#8b949e] hover:border-[#8b949e]'
                }`}
            >
              <div>{opt.label}</div>
              <div className="font-normal opacity-70 text-[10px] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      {erreur && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/40
                        text-red-400 rounded-lg text-sm">
          {erreur}
        </div>
      )}
      {succes && (
        <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/40
                        text-emerald-400 rounded-lg text-sm">
          ✅ {succes}
        </div>
      )}

      {/* ── Bouton upload ── */}
      <button
        onClick={handleSubmit}
        disabled={loading || !fichier || !form.titre.trim()}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500
                   disabled:bg-[#21262d] disabled:text-[#8b949e] disabled:cursor-not-allowed
                   text-white font-bold rounded-xl transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white
                             rounded-full animate-spin" />
            Upload en cours…
          </span>
        ) : (
          '📤 Publier le cours'
        )}
      </button>

      <p className="text-xs text-[#8b949e] text-center">
        Le fichier sera uploadé sur Cloudinary et immédiatement visible par les étudiants.
      </p>
    </div>
  );
}
