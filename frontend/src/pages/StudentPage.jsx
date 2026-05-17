// src/pages/StudentPage.jsx — VERSION CORRIGÉE COMPLÈTE
// Corrections :
// 1. Soumission CC : appel API correct, gestion erreur propre
// 2. Cours : affichage avec lien direct Cloudinary (target=_blank)
// 3. Récépissé : fonctionne depuis la liste résultats
// 4. Choix dupliqués : affichage limité aux choix uniques
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { generateReceipt } from '../utils/generateReceipt';

const getMention = (n) => {
  if (n == null) return '—';
  if (n >= 16) return 'Très Bien';
  if (n >= 14) return 'Bien';
  if (n >= 12) return 'Assez Bien';
  if (n >= 10) return 'Passable';
  return 'Insuffisant';
};
const noteColor = (n) => {
  if (n >= 14) return 'text-emerald-400';
  if (n >= 10) return 'text-amber-400';
  return 'text-red-400';
};
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function StudentPage() {
  const navigate = useNavigate();
  const [onglet, setOnglet]     = useState('cc');
  const [profil, setProfil]     = useState(null);
  const [ccList, setCCList]     = useState([]);
  const [cours, setCours]       = useState([]);
  const [resultats, setResultats] = useState([]);
  const [stats, setStats]       = useState(null);
  const [ccActif, setCCActif]   = useState(null);
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [erreur, setErreur]     = useState('');

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    setLoading(true);
    setErreur('');
    try {
      const [dash, ccRes, coursRes] = await Promise.all([
        api.get('/dashboard/'),
        api.get('/cc/'),
        api.get('/cours/'),
      ]);
      setProfil(dash.data.etudiant);
      setStats(dash.data.statistiques);
      setResultats(dash.data.resultats || []);
      setCCList(ccRes.data.results ?? ccRes.data);
      setCours(coursRes.data.results ?? coursRes.data);
    } catch (err) {
      setErreur('Erreur de chargement. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const demarrerCC = async (ccId) => {
    try {
      const r = await api.get(`/cc/${ccId}/`);
      if (!r.data.tentative_id) {
        alert('Ce CC a déjà été passé ou n\'est plus disponible.');
        return;
      }
      setCCActif(r.data);
      setResultat(null);
    } catch (err) {
      alert('Impossible de démarrer ce CC. Veuillez réessayer.');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  // ── Mode CC actif ─────────────────────────────────────────────────────────
  if (ccActif && !resultat) {
    return (
      <CCPassage
        cc={ccActif}
        etudiant={profil}
        onResultat={(r) => { setResultat(r); setCCActif(null); chargerTout(); }}
        onAbandon={() => setCCActif(null)}
      />
    );
  }

  if (resultat) {
    return (
      <PageResultat
        resultat={resultat}
        etudiant={profil}
        onRetour={() => { setResultat(null); setOnglet('resultats'); }}
      />
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <p className="text-[#8b949e] text-sm">Chargement…</p>
    </div>
  );

  const tabs = [
    { id: 'cc',        label: 'Évaluations (CC)' },
    { id: 'cours',     label: `Cours (${cours.length})` },
    { id: 'resultats', label: `Mes résultats (${resultats.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <nav className="bg-[#161b22] border-b border-[#21262d] px-4 flex items-center">
        <span className="font-black text-blue-500 text-sm py-3 mr-6">ENSET LMS</span>
        <div className="flex gap-1 flex-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setOnglet(t.id)}
              className={`px-3 py-3 text-xs font-medium border-b-2 transition-all
                ${onglet === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[#8b949e] hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 py-3">
          {profil?.badges?.includes('Excellent') && <span title="Badge Excellent">🏆</span>}
          <span className="text-xs text-[#8b949e]">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold mr-1
              ${profil?.filiere === 'TIC'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-violet-500/20 text-violet-400'}`}>
              {profil?.filiere}
            </span>
            {profil?.prenom} {profil?.nom?.toUpperCase()}
          </span>
          <button onClick={handleLogout}
            className="text-xs text-[#8b949e] hover:text-red-400 transition-colors">
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="p-4 max-w-3xl mx-auto">
        {erreur && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30
                           rounded-lg text-red-400 text-sm">
            ⚠️ {erreur}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { v: stats?.moyenne_generale != null
                ? `${Number(stats.moyenne_generale).toFixed(2)}/20` : '—',
              l: 'Moyenne générale', c: 'text-blue-400' },
            { v: stats?.nb_cc_passes ?? 0,
              l: 'CC complétés', c: 'text-emerald-400' },
            { v: ccList.filter(c => !c.est_deja_passe).length,
              l: 'CC disponibles', c: 'text-amber-400' },
          ].map(s => (
            <div key={s.l} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-xs text-[#8b949e] mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* ══ ONGLET CC ══ */}
        {onglet === 'cc' && (
          <div className="space-y-3">
            {ccList.length === 0 ? (
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 text-center">
                <p className="text-[#8b949e] text-sm">Aucun CC disponible pour le moment.</p>
              </div>
            ) : ccList.map(cc => {
              const deja = cc.est_deja_passe;
              const note = cc.mon_resultat?.note_sur_20;
              return (
                <div key={cc.id}
                     className="bg-[#161b22] border border-[#21262d] rounded-xl p-4
                                relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5
                    ${deja ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate mb-0.5">
                        {cc.titre}
                      </h3>
                      {cc.enseignant_nom && (
                        <p className="text-xs text-[#8b949e] mb-1.5">
                          👤 {cc.enseignant_nom}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#21262d] text-[#8b949e] rounded text-xs">
                          ⏱ {cc.duree_minutes} min
                        </span>
                        <span className="px-2 py-0.5 bg-[#21262d] text-[#8b949e] rounded text-xs">
                          {cc.nb_questions} questions
                        </span>
                        {deja && note != null && (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold
                            ${note >= 10
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'}`}>
                            ✓ {Number(note).toFixed(2)}/20 — {cc.mon_resultat?.mention}
                          </span>
                        )}
                      </div>
                    </div>
                    {!deja ? (
                      <button onClick={() => demarrerCC(cc.id)}
                        className="flex-shrink-0 px-4 py-2 bg-blue-600
                                   hover:bg-blue-500 text-white text-xs
                                   font-bold rounded-lg transition-all">
                        ▶ Démarrer
                      </button>
                    ) : (
                      <span className="flex-shrink-0 text-emerald-400 text-xl mt-1">✅</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ ONGLET COURS ══ */}
        {onglet === 'cours' && (
          <div className="space-y-3">
            {cours.length === 0 ? (
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 text-center">
                <p className="text-[#8b949e] text-sm">
                  Aucun cours disponible pour le moment.
                </p>
              </div>
            ) : cours.map(c => (
              <div key={c.id}
                   className="bg-[#161b22] border border-[#21262d] rounded-xl p-4
                              flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center
                                justify-center flex-shrink-0 text-lg">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{c.titre}</h3>
                  {c.enseignant_nom && (
                    <p className="text-xs text-[#8b949e] mt-0.5">👤 {c.enseignant_nom}</p>
                  )}
                  {c.description && (
                    <p className="text-xs text-[#484f58] mt-0.5 truncate">{c.description}</p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold
                    ${c.filiere === 'TIC'
                      ? 'bg-blue-500/20 text-blue-400'
                      : c.filiere === 'II'
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-[#21262d] text-[#8b949e]'}`}>
                    {c.filiere}
                  </span>
                </div>
                {/* CORRECTION : ouverture dans nouvel onglet directement */}
                {c.fichier_url ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={c.fichier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500
                                 text-white text-xs font-bold rounded-lg
                                 transition-all"
                    >
                      📖 Ouvrir
                    </a>
                    <a
                      href={c.fichier_url}
                      download
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d]
                                 text-[#8b949e] hover:text-white text-xs
                                 rounded-lg transition-all"
                    >
                      ↓ PDF
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-[#484f58]">Pas de fichier</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ ONGLET RÉSULTATS ══ */}
        {onglet === 'resultats' && (
          <div className="space-y-3">
            {resultats.length === 0 ? (
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 text-center">
                <p className="text-[#8b949e] text-sm">
                  Vous n'avez encore passé aucun CC.
                </p>
                <button onClick={() => setOnglet('cc')}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500
                             text-white text-xs font-bold rounded-lg transition-all">
                  Voir les CC disponibles
                </button>
              </div>
            ) : resultats.map(r => (
              <div key={r.id}
                   className="bg-[#161b22] border border-[#21262d] rounded-xl p-4
                              flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full border-2 flex-shrink-0
                                 flex flex-col items-center justify-center
                  ${r.note_sur_20 >= 10
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-red-500 bg-red-500/10'}`}>
                  <span className={`text-sm font-black ${noteColor(r.note_sur_20)}`}>
                    {Number(r.note_sur_20).toFixed(1)}
                  </span>
                  <span className="text-[#8b949e] text-[9px]">/20</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{r.cc_titre}</h3>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Mention : <span className={`font-medium ${noteColor(r.note_sur_20)}`}>
                      {r.mention}
                    </span>
                  </p>
                  <p className="text-xs text-[#484f58] mt-0.5">
                    {r.date_validation
                      ? new Date(r.date_validation).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })
                      : ''}
                  </p>
                </div>
                {/* Bouton récépissé depuis la liste */}
                <BoutonRecepisse resultat={r} etudiant={profil} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSAGE CC — Mode Focus
// ─────────────────────────────────────────────────────────────────────────────
function CCPassage({ cc, etudiant, onResultat, onAbandon }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState({});
  const [timeLeft, setTimeLeft]     = useState(cc.duree_minutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur]         = useState('');
  const [warnings, setWarnings]     = useState(0);
  const timerRef   = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const totalTime  = cc.duree_minutes * 60;

  // Dédupliquer les choix (bug migration HTML)
  const questions = cc.questions?.map(q => ({
    ...q,
    choix: q.choix?.filter((c, i, arr) =>
      arr.findIndex(x => x.texte.trim() === c.texte.trim()) === i
    ) || []
  })) || [];

  // Chrono
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          soumettre(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Surveillance onglet
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        setWarnings(w => {
          const next = w + 1;
          if (next >= 3) soumettre(false);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const soumettre = useCallback(async (auto = false) => {
    if (submitting) return;
    const currentAnswers = answersRef.current;
    const nbSansReponse = questions.length - Object.keys(currentAnswers).length;
    if (!auto && nbSansReponse > 0) {
      if (!confirm(`${nbSansReponse} question(s) sans réponse. Soumettre quand même ?`))
        return;
    }
    clearInterval(timerRef.current);
    setSubmitting(true);
    setErreur('');

    const reponses = Object.entries(currentAnswers).map(([qid, cid]) => ({
      question_id: Number(qid),
      choix_id:    Number(cid),
    }));

    try {
      const r = await api.post(
        `/evaluations/soumettre/${cc.tentative_id}/`,
        { reponses }
      );
      onResultat(r.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la soumission.';
      setErreur(msg);
      setSubmitting(false);
    }
  }, [submitting, questions.length, cc.tentative_id]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = ((totalTime - timeLeft) / totalTime) * 100;
  const timerCls = timeLeft <= 60
    ? 'text-red-400 border-red-500/50 bg-red-500/10 animate-pulse'
    : timeLeft <= 300
      ? 'text-amber-400 border-amber-500/50 bg-amber-500/10'
      : 'text-blue-400 border-blue-500/50 bg-blue-500/10';
  const barCls = timeLeft <= 60 ? 'bg-red-500'
    : timeLeft <= 300 ? 'bg-amber-500' : 'bg-blue-600';

  const q = questions[currentIdx];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#21262d] px-4 py-3
                          flex items-center gap-3 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm truncate">{cc.titre}</h1>
          <p className="text-xs text-[#8b949e]">
            {currentIdx + 1}/{questions.length} · {Object.keys(answers).length} répondues
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold
                         text-base tracking-wider transition-all ${timerCls}`}>
          {fmt(timeLeft)}
        </div>
      </header>

      {/* Barre de progression */}
      <div className="h-1 bg-[#21262d]">
        <div className={`h-full transition-all duration-1000 ${barCls}`}
             style={{ width: `${pct}%` }} />
      </div>

      {/* Avertissement */}
      {warnings > 0 && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30
                         rounded-lg text-red-400 text-xs">
          ⚠️ Changement d'onglet — avertissement {warnings}/3
          {warnings >= 3 ? ' — Soumission en cours…' : ''}
        </div>
      )}

      {/* Pastilles navigation */}
      <div className="px-4 pt-4 flex gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentIdx(i)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-all
              ${i === currentIdx ? 'bg-blue-600 text-white scale-110'
                : answers[questions[i]?.id]
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50'
                  : 'bg-[#21262d] text-[#8b949e]'}`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Zone question */}
      <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full">
        <p className="text-white text-sm leading-relaxed mb-5 font-medium">
          {q.enonce}
        </p>
        <div className="space-y-2.5">
          {q.choix.map((c, i) => (
            <button key={c.id}
              onClick={() => setAnswers(p => ({ ...p, [q.id]: c.id }))}
              className={`w-full text-left p-3 rounded-xl border text-sm
                           flex items-start gap-3 transition-all
                ${answers[q.id] === c.id
                  ? 'border-blue-500/70 bg-blue-500/15 text-blue-300'
                  : 'border-[#30363d] bg-[#161b22] text-white hover:border-blue-500/40'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center
                               text-xs font-bold flex-shrink-0 mt-0.5
                ${answers[q.id] === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#21262d] text-[#8b949e]'}`}>
                {LETTERS[i] || i + 1}
              </div>
              <span className="leading-relaxed">{c.texte}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="bg-[#161b22] border-t border-[#21262d] px-4 py-3
                          flex gap-3 sticky bottom-0">
        {erreur && (
          <p className="text-red-400 text-xs self-center flex-1">{erreur}</p>
        )}
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(i => i - 1)}
          className="px-4 py-2 rounded-lg border border-[#30363d] text-[#8b949e]
                     text-xs font-medium disabled:opacity-40 hover:border-[#8b949e]
                     transition-all">
          ← Précédent
        </button>
        {currentIdx < questions.length - 1 && (
          <button onClick={() => setCurrentIdx(i => i + 1)}
            className="px-4 py-2 rounded-lg border border-[#30363d] text-[#8b949e]
                       text-xs font-medium hover:border-[#8b949e] transition-all">
            Suivant →
          </button>
        )}
        <button onClick={() => soumettre(false)} disabled={submitting}
          className="ml-auto px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                     text-white text-xs font-bold transition-all disabled:opacity-50">
          {submitting ? '⏳ Envoi…' : '✓ Soumettre'}
        </button>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE RÉSULTAT après soumission
// ─────────────────────────────────────────────────────────────────────────────
function PageResultat({ resultat, etudiant, onRetour }) {
  const [gen, setGen]   = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr]   = useState('');
  const note = resultat?.note_sur_20 ?? 0;

  const telecharger = async () => {
    if (!resultat?.receipt_token) {
      setErr('Token de vérification manquant. Contactez l\'enseignant.');
      return;
    }
    setGen(true);
    setErr('');
    try {
      await generateReceipt({
        nom:            etudiant?.nom         || '',
        prenom:         etudiant?.prenom      || '',
        matricule:      etudiant?.matricule   || '',
        filiere:        etudiant?.filiere     || '',
        titreCC:        resultat?.cc_titre    || 'CC',
        note,
        mention:        resultat?.mention     || getMention(note),
        dateValidation: resultat?.date_validation || new Date().toISOString(),
        receiptToken:   resultat?.receipt_token,
        signatureUrl:   resultat?.signature_url || null,
      });
      setDone(true);
    } catch (e) {
      setErr('Erreur lors de la génération du PDF.');
    } finally {
      setGen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 text-center">
          <p className="text-xs text-[#8b949e] uppercase tracking-widest mb-4 font-semibold">
            Résultat enregistré ✓
          </p>
          <div className={`w-28 h-28 rounded-full border-4 mx-auto mb-4
                           flex flex-col items-center justify-center
            ${note >= 10
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-red-500 bg-red-500/10'}`}>
            <span className={`text-3xl font-black ${noteColor(note)}`}>
              {note.toFixed(2)}
            </span>
            <span className="text-[#8b949e] text-xs">/ 20</span>
          </div>
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-3
            ${note >= 10
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'}`}>
            {resultat?.mention || getMention(note)}
          </div>
          {note >= 16 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3">
              <p className="text-yellow-400 text-xs font-bold">
                🏆 Badge "Excellent" débloqué !
              </p>
            </div>
          )}
          <p className="text-xs text-[#484f58]">{resultat?.cc_titre}</p>
        </div>

        {err && (
          <p className="text-red-400 text-xs text-center bg-red-500/10
                         border border-red-500/30 rounded-lg px-3 py-2">
            ⚠️ {err}
          </p>
        )}

        <button
          onClick={telecharger}
          disabled={gen}
          className="w-full py-3 rounded-xl font-bold text-sm text-white
                     bg-gradient-to-r from-blue-600 to-violet-600
                     hover:from-blue-500 hover:to-violet-500
                     disabled:opacity-50 transition-all
                     flex items-center justify-center gap-2">
          {gen ? '⏳ Génération…'
            : done ? '✅ PDF téléchargé'
            : '📄 Télécharger le Récépissé PDF'}
        </button>

        <button onClick={onRetour}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-[#8b949e]
                     border border-[#21262d] hover:border-[#30363d] hover:text-white
                     transition-all">
          ← Voir tous mes résultats
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUTON RÉCÉPISSÉ depuis la liste résultats
// ─────────────────────────────────────────────────────────────────────────────
function BoutonRecepisse({ resultat, etudiant }) {
  const [gen, setGen] = useState(false);
  const [err, setErr] = useState('');

  const telecharger = async () => {
    if (!resultat?.receipt_token) { setErr('Token manquant'); return; }
    setGen(true); setErr('');
    try {
      await generateReceipt({
        nom:            etudiant?.nom         || '',
        prenom:         etudiant?.prenom      || '',
        matricule:      etudiant?.matricule   || '',
        filiere:        etudiant?.filiere     || '',
        titreCC:        resultat?.cc_titre    || 'CC',
        note:           resultat?.note_sur_20 || 0,
        mention:        resultat?.mention     || '',
        dateValidation: resultat?.date_validation || new Date().toISOString(),
        receiptToken:   resultat?.receipt_token,
        signatureUrl:   null,
      });
    } catch { setErr('Erreur PDF'); }
    finally { setGen(false); }
  };

  return (
    <div className="flex-shrink-0 text-right">
      <button onClick={telecharger} disabled={gen}
        className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs
                   rounded-lg transition-all text-[#8b949e] hover:text-white
                   disabled:opacity-40">
        {gen ? '…' : '📄 Récépissé'}
      </button>
      {err && <p className="text-red-400 text-[10px] mt-0.5">{err}</p>}
    </div>
  );
}
