// src/components/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { evaluationService } from '../../api/evaluationService';
import CCInterface from './CCInterface';

export default function StudentDashboard({ onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [ccList, setCCList]       = useState([]);
  const [coursList, setCoursList]  = useState([]);
  const [loading, setLoading]     = useState(true);
  const [ccActif, setCCActif]     = useState(null); // CC en cours de passage

  useEffect(() => {
    chargerDashboard();
  }, []);

  const chargerDashboard = async () => {
    setLoading(true);
    try {
      const [dash, cc] = await Promise.all([
        evaluationService.getDashboard(),
        evaluationService.getCC(),
      ]);
      setDashboard(dash);
      setCCList(cc.results ?? cc);
    } catch (err) {
      console.error('Erreur chargement dashboard :', err);
    } finally {
      setLoading(false);
    }
  };

  const demarrerCC = async (ccId) => {
    try {
      const detail = await evaluationService.startCC(ccId);
      if (!detail.tentative_id) {
        alert('Ce CC a déjà été passé ou le délai est expiré.');
        return;
      }
      setCCActif(detail);
    } catch {
      alert('Impossible de démarrer ce CC pour le moment.');
    }
  };

  // Si un CC est en cours → afficher CCInterface
  if (ccActif) {
    return (
      <CCInterface
        cc={ccActif}
        etudiant={dashboard?.etudiant}
        onExit={() => { setCCActif(null); chargerDashboard(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-[#8b949e] text-sm">Chargement...</div>
      </div>
    );
  }

  const etudiant = dashboard?.etudiant;
  const stats    = dashboard?.statistiques;
  const resultats = dashboard?.resultats ?? [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">

      {/* ── Navbar ── */}
      <nav className="bg-[#161b22] border-b border-[#21262d] px-4 py-3
                       flex items-center gap-3">
        <span className="font-black text-blue-500 flex-1"
              style={{ fontFamily: 'sans-serif' }}>
          ENSET LMS
        </span>
        <span className="text-xs text-[#8b949e]">
          {etudiant?.filiere && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400
                              border border-blue-500/40 rounded text-xs font-bold mr-2">
              {etudiant.filiere}
            </span>
          )}
          {etudiant?.prenom} {etudiant?.nom}
        </span>
        <button
          onClick={onLogout}
          className="text-xs text-[#8b949e] hover:text-red-400 transition-colors"
        >
          Déconnexion
        </button>
      </nav>

      <div className="p-4 max-w-2xl mx-auto space-y-5">

        {/* ── Statistiques ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: stats?.moyenne_generale != null
                ? Number(stats.moyenne_generale).toFixed(2) : '—',
              lbl: 'Moyenne générale', color: 'text-blue-400' },
            { val: stats?.nb_cc_passes ?? 0,
              lbl: 'CC complétés', color: 'text-emerald-400' },
            { val: ccList.filter(c => !c.est_deja_passe).length,
              lbl: 'CC disponibles', color: 'text-amber-400' },
          ].map(s => (
            <div key={s.lbl}
                 className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-[#8b949e] mt-1">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Badges ── */}
        {etudiant?.badges?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {etudiant.badges.map(b => (
              <span key={b}
                    className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40
                               text-yellow-400 rounded-full text-xs font-bold">
                🏆 {b}
              </span>
            ))}
          </div>
        )}

        {/* ── Liste des CC ── */}
        <div>
          <h2 className="text-xs font-bold text-[#8b949e] uppercase tracking-widest mb-3">
            Évaluations (CC)
          </h2>
          <div className="space-y-3">
            {ccList.length === 0 && (
              <p className="text-[#8b949e] text-sm text-center py-6">
                Aucun CC disponible pour le moment.
              </p>
            )}
            {ccList.map(cc => {
              const deja = cc.est_deja_passe;
              const note = cc.mon_resultat?.note_sur_20;
              return (
                <div key={cc.id}
                     className="bg-[#161b22] border border-[#21262d] rounded-xl p-4
                                relative overflow-hidden">
                  {/* Bandeau couleur */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5
                    ${deja ? 'bg-emerald-500' : 'bg-blue-600'}`} />

                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {cc.titre}
                      </h3>
                      <p className="text-xs text-[#8b949e] mt-0.5">{cc.description}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#21262d] text-[#8b949e]
                                          rounded text-xs">
                          ⏱ {cc.duree_minutes} min
                        </span>
                        <span className="px-2 py-0.5 bg-[#21262d] text-[#8b949e]
                                          rounded text-xs">
                          {cc.nb_questions} questions
                        </span>
                        {deja && (
                          <span className="px-2 py-0.5 bg-emerald-500/20
                                            text-emerald-400 rounded text-xs font-bold">
                            ✓ {Number(note).toFixed(2)}/20 — {cc.mon_resultat?.mention}
                          </span>
                        )}
                      </div>
                    </div>

                    {!deja ? (
                      <button
                        onClick={() => demarrerCC(cc.id)}
                        className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500
                                   text-white text-xs font-bold rounded-lg transition-all"
                      >
                        ▶ Démarrer
                      </button>
                    ) : (
                      <span className="flex-shrink-0 text-emerald-400 text-xl">✅</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
