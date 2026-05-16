// src/components/teacher/ListeEtudiants.jsx
// GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
// Affiche la liste complète des étudiants inscrits avec leurs résultats

import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const getMentionColor = (note) => {
  if (note == null) return 'text-[#8b949e]';
  if (note >= 16)  return 'text-blue-400';
  if (note >= 14)  return 'text-emerald-400';
  if (note >= 12)  return 'text-teal-400';
  if (note >= 10)  return 'text-amber-400';
  return 'text-red-400';
};

const getMention = (note) => {
  if (note == null) return '—';
  if (note >= 16)  return 'Très Bien';
  if (note >= 14)  return 'Bien';
  if (note >= 12)  return 'Assez Bien';
  if (note >= 10)  return 'Passable';
  return 'Insuffisant';
};

export default function ListeEtudiants() {
  const [filiere,    setFiliere]    = useState('TOUS');
  const [etudiants,  setEtudiants]  = useState([]);
  const [recherche,  setRecherche]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [erreur,     setErreur]     = useState('');
  const [stats,      setStats]      = useState(null);

  useEffect(() => {
    charger();
  }, [filiere]);

  const charger = async () => {
    setLoading(true);
    setErreur('');
    try {
      // GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
      const res = await api.get(`/enseignant/synthese/?filiere=${filiere}`);
      const data = res.data;
      setEtudiants(data.synthese ?? []);
      setStats({
        total:         data.total,
        moyenne_promo: data.moyenne_promo,
      });
    } catch (err) {
      setErreur(err.response?.data?.error || 'Impossible de charger la liste des étudiants.');
    } finally {
      setLoading(false);
    }
  };

  // Filtre recherche local
  const etudiantsFiltres = etudiants.filter(e => {
    const q = recherche.toLowerCase();
    return (
      e.matricule?.toLowerCase().includes(q) ||
      e.nom?.toLowerCase().includes(q) ||
      e.prenom?.toLowerCase().includes(q)
    );
  });

  const reussis   = etudiantsFiltres.filter(e => (e.moyenne_generale ?? 0) >= 10).length;
  const echoues   = etudiantsFiltres.filter(e => e.moyenne_generale != null && e.moyenne_generale < 10).length;
  const sans_note = etudiantsFiltres.filter(e => e.moyenne_generale == null).length;

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Filière */}
        <div className="flex gap-1.5">
          {['TOUS', 'TIC', 'II'].map(f => (
            <button
              key={f}
              onClick={() => setFiliere(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${filiere === f
                  ? 'bg-[#21262d] text-white border border-[#8b949e]'
                  : 'bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-white'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Recherche */}
        <input
          type="text"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou matricule…"
          className="flex-1 min-w-48 bg-[#161b22] border border-[#21262d] rounded-lg
                     px-3 py-1.5 text-sm text-white placeholder-[#8b949e]
                     focus:outline-none focus:border-blue-500 transition-colors"
        />

        <button
          onClick={charger}
          disabled={loading}
          className="px-3 py-1.5 bg-[#161b22] border border-[#21262d]
                     text-[#8b949e] hover:text-white rounded-lg text-xs transition-all"
        >
          {loading ? '…' : '↻ Actualiser'}
        </button>
      </div>

      {/* ── Stats rapides ── */}
      {stats && etudiantsFiltres.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { val: etudiantsFiltres.length, lbl: 'Étudiants',    color: 'text-white' },
            { val: reussis,                 lbl: 'Admis ≥10',     color: 'text-emerald-400' },
            { val: echoues,                 lbl: 'En dessous',    color: 'text-red-400' },
            {
              val: stats.moyenne_promo != null
                ? Number(stats.moyenne_promo).toFixed(2)
                : '—',
              lbl: 'Moy. promo',
              color: getMentionColor(stats.moyenne_promo)
            },
          ].map(s => (
            <div key={s.lbl}
                 className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 text-center">
              <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-[#8b949e] mt-0.5">{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Erreur ── */}
      {erreur && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/40
                        text-red-400 rounded-lg text-sm">
          {erreur}
        </div>
      )}

      {/* ── Chargement ── */}
      {loading && (
        <div className="text-center py-12 text-[#8b949e] text-sm">
          Chargement…
        </div>
      )}

      {/* ── Tableau ── */}
      {!loading && etudiantsFiltres.length === 0 && (
        <div className="text-center py-12 text-[#8b949e] text-sm">
          {recherche
            ? 'Aucun étudiant ne correspond à la recherche.'
            : 'Aucun étudiant inscrit pour cette filière.'
          }
        </div>
      )}

      {!loading && etudiantsFiltres.length > 0 && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">

          {/* En-tête */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#21262d]
                          text-xs font-bold text-[#8b949e] uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Matricule</div>
            <div className="col-span-3">Nom & Prénom</div>
            <div className="col-span-1 text-center">Filière</div>
            <div className="col-span-2 text-right">Moyenne</div>
            <div className="col-span-1 text-center">CC</div>
            <div className="col-span-1 text-right">Mention</div>
          </div>

          {/* Lignes */}
          <div className="divide-y divide-[#21262d]">
            {etudiantsFiltres.map((e, idx) => {
              const moy = e.moyenne_generale;
              return (
                <div
                  key={e.matricule}
                  className="grid grid-cols-12 gap-2 px-4 py-3
                             hover:bg-[#21262d]/40 transition-colors"
                >
                  <div className="col-span-1 text-[#8b949e] text-xs self-center">
                    {idx + 1}
                  </div>

                  <div className="col-span-3 self-center">
                    <span className="text-xs font-mono text-[#8b949e]">
                      {e.matricule}
                    </span>
                  </div>

                  <div className="col-span-3 self-center">
                    <span className="text-sm font-semibold text-white">
                      {e.prenom} {e.nom?.toUpperCase()}
                    </span>
                  </div>

                  <div className="col-span-1 self-center flex justify-center">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400
                                     text-xs font-bold rounded">
                      {e.filiere}
                    </span>
                  </div>

                  <div className={`col-span-2 text-right font-black self-center
                                   ${getMentionColor(moy)}`}>
                    {moy != null ? Number(moy).toFixed(2) : (
                      <span className="text-[#8b949e] font-normal text-xs">Aucun CC</span>
                    )}
                    {moy != null && (
                      <span className="text-[#8b949e] font-normal text-xs">/20</span>
                    )}
                  </div>

                  <div className="col-span-1 text-center text-xs text-[#8b949e] self-center">
                    {e.nb_cc_passes ?? 0}
                  </div>

                  <div className={`col-span-1 text-right text-xs font-bold self-center
                                   ${getMentionColor(moy)}`}>
                    {moy != null ? getMention(moy) : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pied */}
          <div className="px-4 py-3 bg-[#21262d] flex justify-between items-center">
            <span className="text-xs text-[#8b949e]">
              {etudiantsFiltres.length} / {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''}
              {recherche && ' (filtrés)'}
            </span>
            {sans_note > 0 && (
              <span className="text-xs text-[#8b949e]">
                {sans_note} sans note
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
