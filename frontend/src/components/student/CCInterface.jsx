// src/components/student/CCInterface.jsx
// Option C : les questions viennent du backend Django (CCDetailSerializer)
// Le timer est géré côté frontend mais la note est calculée côté serveur.
// useTabGuard détecte les changements d'onglet et force la soumission après 3 avertissements.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTabGuard } from '../../hooks/useTabGuard';
import { evaluationService } from '../../api/evaluationService';
import { generateReceipt } from '../../utils/generateReceipt';

export default function CCInterface({ cc, etudiant, onExit }) {
  // cc = { id, titre, duree_minutes, tentative_id, questions: [{id, enonce, points, ordre, choix: [{id, texte}]}] }

  const [reponses, setReponses]       = useState({});   // { question_id: choix_id }
  const [timeLeft, setTimeLeft]       = useState(cc.duree_minutes * 60);
  const [soumis, setSoumis]           = useState(false);
  const [resultat, setResultat]       = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [erreur, setErreur]           = useState('');

  const timerRef   = useRef(null);
  const startTime  = useRef(Date.now());

  // ── Tab Guard ──────────────────────────────────────────────────────────────
  const { warnings, remainingWarnings } = useTabGuard(!soumis);

  // Écouter l'événement force-submit émis par useTabGuard
  useEffect(() => {
    const handleForceSubmit = () => soumettre(true);
    window.addEventListener('force-submit', handleForceSubmit);
    return () => window.removeEventListener('force-submit', handleForceSubmit);
  }, [reponses]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (soumis) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          soumettre(true);   // Temps écoulé → soumission automatique
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [soumis]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Formatage timer ───────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const timerCouleur = timeLeft <= 120
    ? 'text-red-400 animate-pulse'
    : timeLeft <= 300
    ? 'text-amber-400'
    : 'text-emerald-400';

  // ── Sélection réponse ─────────────────────────────────────────────────────
  const selectionner = (questionId, choixId) => {
    if (soumis) return;
    setReponses(prev => ({ ...prev, [questionId]: choixId }));
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const soumettre = useCallback(async (auto = false) => {
    if (soumis || submitting) return;
    if (!auto && !window.confirm('Êtes-vous sûr(e) de vouloir soumettre votre évaluation ?')) return;

    clearInterval(timerRef.current);
    setSubmitting(true);
    setErreur('');

    // Construire le payload attendu par POST /api/evaluations/soumettre/<tentative_id>/
    // Corps : { "reponses": [{ "question_id": N, "choix_id": M }, ...] }
    const payload = {
      reponses: Object.entries(reponses).map(([question_id, choix_id]) => ({
        question_id: parseInt(question_id),
        choix_id:    parseInt(choix_id),
      })),
    };

    try {
      const data = await evaluationService.soumettre(cc.tentative_id, payload);
      setResultat(data);
      setSoumis(true);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la soumission. Réessayez.');
      setSubmitting(false);
    }
  }, [soumis, submitting, reponses, cc.tentative_id]);

  // ── Télécharger le récépissé PDF ──────────────────────────────────────────
  const telechargerRecepisse = async () => {
    if (!resultat) return;
    try {
      await generateReceipt({
        nom:           etudiant?.nom    ?? '',
        prenom:        etudiant?.prenom ?? '',
        matricule:     etudiant?.matricule ?? resultat.etudiant_matricule,
        filiere:       etudiant?.filiere   ?? resultat.etudiant_filiere,
        titreCC:       resultat.cc_titre,
        note:          resultat.note_sur_20,
        mention:       resultat.mention,
        dateValidation: resultat.date_validation,
        receiptToken:  resultat.receipt_token,
        signatureUrl:  resultat.signature_url ?? null,
      });
    } catch {
      alert('Erreur lors de la génération du récépissé PDF.');
    }
  };

  // ── Progression ───────────────────────────────────────────────────────────
  const nbRepondues  = Object.keys(reponses).length;
  const nbTotal      = cc.questions?.length ?? 0;
  const progression  = nbTotal > 0 ? Math.round((nbRepondues / nbTotal) * 100) : 0;

  // ═════════════════════════════════════════════════════════════════════════
  //  VUE RÉSULTAT (après soumission)
  // ═════════════════════════════════════════════════════════════════════════
  if (soumis && resultat) {
    const note    = Number(resultat.note_sur_20);
    const mention = resultat.mention;
    const reussi  = note >= 10;

    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b22] border border-[#21262d] rounded-2xl overflow-hidden">

          {/* Bandeau résultat */}
          <div className={`h-1 w-full ${reussi ? 'bg-emerald-500' : 'bg-red-500'}`} />

          <div className="p-6 text-center space-y-4">
            <div className="text-4xl">{reussi ? '🎉' : '📋'}</div>
            <h2 className="text-xl font-black text-white">{cc.titre}</h2>
            <p className="text-[#8b949e] text-sm">Évaluation soumise avec succès</p>

            {resultat.hors_delai && (
              <div className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 text-xs">
                ⚠️ Soumission hors délai — note enregistrée
              </div>
            )}

            {/* Note */}
            <div className={`text-6xl font-black mt-4 ${reussi ? 'text-emerald-400' : 'text-red-400'}`}>
              {note.toFixed(2)}
              <span className="text-2xl text-[#8b949e]">/20</span>
            </div>

            <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold
              ${reussi
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}>
              {mention}
            </div>

            {/* Info */}
            <div className="text-xs text-[#8b949e] space-y-1 pt-2">
              <p>{etudiant?.prenom} {etudiant?.nom} — {etudiant?.matricule}</p>
              <p>{new Date(resultat.date_validation).toLocaleString('fr-FR')}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={telechargerRecepisse}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white
                           text-sm font-bold rounded-lg transition-all"
              >
                📄 Télécharger le récépissé PDF
              </button>
              <button
                onClick={onExit}
                className="w-full py-2.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e]
                           text-sm font-bold rounded-lg transition-all"
              >
                ← Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  VUE QCM
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">

      {/* ── Barre supérieure fixe ── */}
      <div className="sticky top-0 z-10 bg-[#161b22] border-b border-[#21262d]
                       px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{cc.titre}</h1>
          <div className="text-xs text-[#8b949e]">
            {nbRepondues}/{nbTotal} réponses
          </div>
        </div>

        {/* Avertissements tab guard */}
        {warnings > 0 && (
          <div className="px-2 py-1 bg-amber-500/20 border border-amber-500/40
                          text-amber-400 rounded text-xs font-bold">
            ⚠️ {remainingWarnings} avert. restants
          </div>
        )}

        {/* Timer */}
        <div className={`font-mono font-black text-lg tabular-nums ${timerCouleur}`}>
          {formatTime(timeLeft)}
        </div>

        <button
          onClick={() => soumettre(false)}
          disabled={submitting}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500
                     disabled:bg-[#21262d] disabled:text-[#8b949e]
                     text-white text-xs font-bold rounded-lg transition-all"
        >
          {submitting ? '…' : 'Soumettre'}
        </button>
      </div>

      {/* ── Barre de progression ── */}
      <div className="h-0.5 bg-[#21262d]">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progression}%` }}
        />
      </div>

      {/* ── Erreur ── */}
      {erreur && (
        <div className="mx-4 mt-4 px-4 py-3 bg-red-500/20 border border-red-500/40
                        text-red-400 rounded-lg text-sm">
          {erreur}
        </div>
      )}

      {/* ── Questions ── */}
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-24">
        {(cc.questions ?? []).map((q, idx) => {
          const reponseChoisie = reponses[q.id];
          return (
            <div
              key={q.id}
              className={`bg-[#161b22] border rounded-xl overflow-hidden transition-all
                ${reponseChoisie
                  ? 'border-blue-500/50'
                  : 'border-[#21262d]'
                }`}
            >
              {/* Énoncé */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400
                                   rounded text-xs font-black flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-white leading-relaxed">{q.enonce}</p>
                </div>
                <div className="text-xs text-[#8b949e] mt-1 ml-8">
                  {q.points} pt{q.points > 1 ? 's' : ''}
                </div>
              </div>

              {/* Choix */}
              <div className="px-4 pb-4 space-y-2">
                {(q.choix ?? []).map((c) => {
                  const selectionne = reponseChoisie === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectionner(q.id, c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm
                                  transition-all duration-150
                        ${selectionne
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                          : 'bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:border-[#8b949e]'
                        }`}
                    >
                      <span className={`inline-block w-4 h-4 rounded-full border mr-2
                                        align-middle transition-all
                        ${selectionne
                          ? 'bg-blue-500 border-blue-400'
                          : 'border-[#8b949e]'
                        }`}
                      />
                      {c.texte}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bouton soumettre bas de page */}
        <button
          onClick={() => soumettre(false)}
          disabled={submitting || nbRepondues === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500
                     disabled:bg-[#21262d] disabled:text-[#8b949e]
                     text-white font-bold rounded-xl transition-all"
        >
          {submitting
            ? 'Soumission en cours…'
            : `Soumettre l'évaluation (${nbRepondues}/${nbTotal})`
          }
        </button>
      </div>
    </div>
  );
}
