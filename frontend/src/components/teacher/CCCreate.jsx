// src/components/teacher/CCCreate.jsx
// POST /api/cc/create/
// Payload attendu par CCCreateSerializer :
// {
//   titre, description, duree_minutes, melange_questions,
//   cours (optionnel, id),
//   questions: [{ enonce, points, choix: [{texte, est_correct}] }]
// }

import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const QUESTION_VIDE = () => ({
  enonce: '',
  points: 1.0,
  choix: [
    { texte: '', est_correct: true  },
    { texte: '', est_correct: false },
    { texte: '', est_correct: false },
    { texte: '', est_correct: false },
  ],
});

export default function CCCreate({ onSuccess }) {
  const [form, setForm] = useState({
    titre:             '',
    description:       '',
    duree_minutes:     20,
    melange_questions: true,
    cours:             '',
  });
  const [questions, setQuestions]   = useState([QUESTION_VIDE()]);
  const [coursList, setCoursList]   = useState([]);
  const [loading,   setLoading]     = useState(false);
  const [erreur,    setErreur]      = useState('');
  const [succes,    setSucces]      = useState('');

  // Charger la liste des cours pour le sélecteur optionnel
  useEffect(() => {
    api.get('/cours/').then(r => setCoursList(r.data.results ?? r.data)).catch(() => {});
  }, []);

  // ── Formulaire principal ──────────────────────────────────────────────────
  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErreur('');
  };

  // ── Gestion des questions ─────────────────────────────────────────────────
  const ajouterQuestion = () => setQuestions(prev => [...prev, QUESTION_VIDE()]);

  const supprimerQuestion = (qi) =>
    setQuestions(prev => prev.filter((_, i) => i !== qi));

  const modifierQuestion = (qi, field, value) =>
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, [field]: value } : q
    ));

  const modifierChoix = (qi, ci, field, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      const choix = q.choix.map((c, j) => {
        if (j !== ci) return field === 'est_correct' ? { ...c, est_correct: false } : c;
        return { ...c, [field]: value };
      });
      return { ...q, choix };
    }));

  const ajouterChoix = (qi) =>
    setQuestions(prev => prev.map((q, i) =>
      i === qi
        ? { ...q, choix: [...q.choix, { texte: '', est_correct: false }] }
        : q
    ));

  const supprimerChoix = (qi, ci) =>
    setQuestions(prev => prev.map((q, i) =>
      i === qi
        ? { ...q, choix: q.choix.filter((_, j) => j !== ci) }
        : q
    ));

  // ── Validation avant envoi ────────────────────────────────────────────────
  const valider = () => {
    if (!form.titre.trim()) return 'Le titre est obligatoire.';
    if (questions.length === 0) return 'Ajoutez au moins une question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.enonce.trim()) return `Question ${i + 1} : l'énoncé est vide.`;
      if (q.choix.length < 2) return `Question ${i + 1} : au moins 2 choix requis.`;
      const bonnes = q.choix.filter(c => c.est_correct);
      if (bonnes.length !== 1) return `Question ${i + 1} : exactement 1 bonne réponse requise.`;
      for (let j = 0; j < q.choix.length; j++) {
        if (!q.choix[j].texte.trim())
          return `Question ${i + 1}, choix ${j + 1} : texte vide.`;
      }
    }
    return null;
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = valider();
    if (err) { setErreur(err); return; }

    setLoading(true);
    setErreur('');
    setSucces('');

    const payload = {
      titre:             form.titre.trim(),
      description:       form.description.trim(),
      duree_minutes:     parseInt(form.duree_minutes),
      melange_questions: form.melange_questions,
      ...(form.cours ? { cours: parseInt(form.cours) } : {}),
      questions: questions.map((q, i) => ({
        enonce: q.enonce.trim(),
        points: parseFloat(q.points),
        ordre:  i,
        choix:  q.choix.map(c => ({
          texte:       c.texte.trim(),
          est_correct: c.est_correct,
        })),
      })),
    };

    try {
      const res = await api.post('/cc/create/', payload);
      setSucces(`CC "${res.data.titre}" créé avec succès ! (${questions.length} questions)`);
      // Reset
      setForm({ titre: '', description: '', duree_minutes: 20, melange_questions: true, cours: '' });
      setQuestions([QUESTION_VIDE()]);
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      const data = err.response?.data;
      const msg  = typeof data === 'string' ? data
        : data?.detail || data?.error
        || Object.values(data ?? {})[0]
        || 'Erreur lors de la création du CC.';
      setErreur(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">

      <div>
        <h2 className="text-lg font-black text-white">Créer un CC</h2>
        <p className="text-xs text-[#8b949e] mt-1">
          Le CC sera inactif par défaut — activez-le depuis l'administration Django quand vous êtes prêt.
        </p>
      </div>

      {/* ── Informations générales ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
          Informations générales
        </h3>

        {/* Titre */}
        <div>
          <label className="block text-xs font-bold text-[#8b949e] mb-1.5">Titre *</label>
          <input
            type="text" name="titre" value={form.titre} onChange={handleForm}
            placeholder="Ex : CC Systèmes Logiques — Chapitre 1"
            className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                       text-sm text-white placeholder-[#8b949e]
                       focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-[#8b949e] mb-1.5">
            Description <span className="font-normal">(optionnel)</span>
          </label>
          <textarea
            name="description" value={form.description} onChange={handleForm}
            rows={2} placeholder="Objectifs, chapitre concerné…"
            className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                       text-sm text-white placeholder-[#8b949e] resize-none
                       focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Durée */}
          <div>
            <label className="block text-xs font-bold text-[#8b949e] mb-1.5">
              Durée (minutes) *
            </label>
            <input
              type="number" name="duree_minutes" value={form.duree_minutes}
              min={5} max={120} onChange={handleForm}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Cours lié */}
          <div>
            <label className="block text-xs font-bold text-[#8b949e] mb-1.5">
              Cours lié <span className="font-normal">(optionnel)</span>
            </label>
            <select
              name="cours" value={form.cours} onChange={handleForm}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">— Aucun —</option>
              {coursList.map(c => (
                <option key={c.id} value={c.id}>{c.titre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mélange questions */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox" name="melange_questions"
            checked={form.melange_questions} onChange={handleForm}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-[#c9d1d9]">
            Mélanger les questions aléatoirement
          </span>
        </label>
      </div>

      {/* ── Questions ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
            Questions ({questions.length})
          </h3>
          <button
            onClick={ajouterQuestion}
            className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/40
                       text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-bold
                       transition-all"
          >
            + Ajouter une question
          </button>
        </div>

        {questions.map((q, qi) => (
          <div key={qi}
               className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">

            {/* En-tête question */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#21262d]">
              <span className="w-6 h-6 bg-blue-600 text-white text-xs font-black
                               rounded flex items-center justify-center flex-shrink-0">
                {qi + 1}
              </span>
              <span className="text-xs font-bold text-[#8b949e] flex-1">Question {qi + 1}</span>

              {/* Points */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#8b949e]">Points :</span>
                <input
                  type="number" value={q.points} min={0.5} max={10} step={0.5}
                  onChange={(e) => modifierQuestion(qi, 'points', parseFloat(e.target.value))}
                  className="w-14 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1
                             text-xs text-white text-center focus:outline-none focus:border-blue-500"
                />
              </div>

              {questions.length > 1 && (
                <button
                  onClick={() => supprimerQuestion(qi)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕ Supprimer
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Énoncé */}
              <textarea
                value={q.enonce}
                onChange={(e) => modifierQuestion(qi, 'enonce', e.target.value)}
                rows={2}
                placeholder="Écrivez l'énoncé de la question…"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5
                           text-sm text-white placeholder-[#8b949e] resize-none
                           focus:outline-none focus:border-blue-500 transition-colors"
              />

              {/* Choix */}
              <div className="space-y-2">
                <p className="text-xs text-[#8b949e]">
                  Choix — cochez la bonne réponse :
                </p>
                {q.choix.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    {/* Radio bonne réponse */}
                    <button
                      onClick={() => modifierChoix(qi, ci, 'est_correct', true)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all
                        ${c.est_correct
                          ? 'bg-emerald-500 border-emerald-400'
                          : 'border-[#8b949e] hover:border-emerald-500'
                        }`}
                      title="Marquer comme bonne réponse"
                    />
                    <input
                      type="text" value={c.texte}
                      onChange={(e) => modifierChoix(qi, ci, 'texte', e.target.value)}
                      placeholder={`Choix ${ci + 1}…`}
                      className={`flex-1 bg-[#0d1117] border rounded-lg px-3 py-2 text-sm
                                  text-white placeholder-[#8b949e]
                                  focus:outline-none transition-colors
                        ${c.est_correct
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-[#21262d] focus:border-blue-500'
                        }`}
                    />
                    {q.choix.length > 2 && (
                      <button
                        onClick={() => supprimerChoix(qi, ci)}
                        className="text-xs text-[#8b949e] hover:text-red-400 transition-colors px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {q.choix.length < 6 && (
                  <button
                    onClick={() => ajouterChoix(qi)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                  >
                    + Ajouter un choix
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Bouton ajouter bas */}
        <button
          onClick={ajouterQuestion}
          className="w-full py-3 border-2 border-dashed border-[#21262d]
                     hover:border-blue-500/50 hover:bg-blue-500/5
                     text-[#8b949e] hover:text-blue-400 rounded-xl text-sm
                     transition-all"
        >
          + Ajouter une question
        </button>
      </div>

      {/* ── Messages ── */}
      {erreur && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/40
                        text-red-400 rounded-lg text-sm">
          ⚠️ {erreur}
        </div>
      )}
      {succes && (
        <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/40
                        text-emerald-400 rounded-lg text-sm">
          ✅ {succes}
        </div>
      )}

      {/* ── Résumé + bouton ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4
                      flex items-center justify-between">
        <div className="text-sm text-[#8b949e]">
          <span className="font-bold text-white">{questions.length}</span> question{questions.length > 1 ? 's' : ''} ·{' '}
          <span className="font-bold text-white">
            {questions.reduce((s, q) => s + parseFloat(q.points || 0), 0).toFixed(1)}
          </span> pts au total ·{' '}
          <span className="font-bold text-white">{form.duree_minutes}</span> min
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500
                     disabled:bg-[#21262d] disabled:text-[#8b949e]
                     text-white font-bold rounded-lg text-sm transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white
                               rounded-full animate-spin" />
              Création…
            </span>
          ) : '✓ Créer le CC'}
        </button>
      </div>

      <p className="text-xs text-[#8b949e] text-center">
        Le CC sera créé en mode <strong className="text-amber-400">inactif</strong>.
        Allez dans l'admin Django → CC → cochez <em>est_actif</em> pour le rendre visible aux étudiants.
      </p>
    </div>
  );
}
