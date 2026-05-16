// src/components/teacher/SyntheseNotes.jsx
// GET /api/enseignant/synthese/?filiere=TIC|II|TOUS  → synthèse générale
// GET /api/enseignant/cc/<id>/notes/                 → notes d'un CC spécifique

import { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getMentionStyle = (note) => {
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

// ─────────────────────────────────────────────────────────────────────────────
export default function SyntheseNotes() {
  const [vue,       setVue]       = useState('generale');   // 'generale' | 'par-cc'
  const [filiere,   setFiliere]   = useState('TOUS');
  const [synthese,  setSynthese]  = useState([]);
  const [ccList,    setCCList]    = useState([]);
  const [ccChoisi,  setCCChoisi]  = useState(null);
  const [notesCc,   setNotesCc]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [erreur,    setErreur]    = useState('');

  // ── Chargement synthèse générale ──────────────────────────────────────────
  useEffect(() => {
    if (vue !== 'generale') return;
    chargerSynthese();
  }, [vue, filiere]);

  // ── Chargement liste CC (pour vue par-cc) ────────────────────────────────
  useEffect(() => {
    if (vue !== 'par-cc') return;
    chargerCCList();
  }, [vue]);

  const chargerSynthese = async () => {
    setLoading(true);
    setErreur('');
    try {
      // GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
      const res = await api.get(`/enseignant/synthese/?filiere=${filiere}`);
      setSynthese(res.data.synthese ?? []);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors du chargement de la synthèse.');
    } finally {
      setLoading(false);
    }
  };

  const chargerCCList = async () => {
    setLoading(true);
    setErreur('');
    try {
      // GET /api/cc/ — liste des CC (enseignant voit tous)
      const res = await api.get('/cc/');
      setCCList(res.data.results ?? res.data);
    } catch {
      setErreur('Impossible de charger la liste des CC.');
    } finally {
      setLoading(false);
    }
  };

  const chargerNotesCc = async (ccId) => {
    setLoading(true);
    setErreur('');
    setCCChoisi(ccId);
    try {
      // GET /api/enseignant/cc/<cc_id>/notes/
      const res = await api.get(`/enseignant/cc/${ccId}/notes/`);
      setNotesCc(res.data);
    } catch {
      setErreur('Impossible de charger les notes de ce CC.');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Onglets vue ── */}
      <div className="flex gap-2">
        {[
          { id: 'generale', label: '📊 Synthèse générale' },
          { id: 'par-cc',   label: '🎯 Notes par CC'      },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setVue(tab.id); setErreur(''); setNotesCc(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all
              ${vue === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-white'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VUE SYNTHÈSE GÉNÉRALE
      ════════════════════════════════════════════════════════════════════ */}
      {vue === 'generale' && (
        <>
          {/* Filtre filière */}
          <div className="flex gap-2">
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
            <button
              onClick={chargerSynthese}
              disabled={loading}
              className="ml-auto px-3 py-1.5 bg-[#161b22] border border-[#21262d]
                         text-[#8b949e] hover:text-white rounded-lg text-xs transition-all"
            >
              {loading ? '…' : '↻ Actualiser'}
            </button>
          </div>

          {erreur && (
            <div className="px-4 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm">
              {erreur}
            </div>
          )}

          {/* Tableau */}
          {!loading && synthese.length === 0 && (
            <div className="text-center py-12 text-[#8b949e] text-sm">
              Aucune donnée disponible pour cette filière.
            </div>
          )}

          {synthese.length > 0 && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              {/* En-tête */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#21262d]
                              text-xs font-bold text-[#8b949e] uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Matricule</div>
                <div className="col-span-3">Nom & Prénom</div>
                <div className="col-span-1">Filière</div>
                <div className="col-span-2 text-right">Moyenne</div>
                <div className="col-span-1 text-center">CC</div>
                <div className="col-span-2 text-right">Mention</div>
              </div>

              {/* Lignes */}
              <div className="divide-y divide-[#21262d]">
                {synthese.map((s, idx) => {
                  const moy = s.moyenne_generale;
                  return (
                    <div
                      key={s.matricule}
                      className="grid grid-cols-12 gap-2 px-4 py-3 text-sm
                                 hover:bg-[#21262d]/50 transition-colors"
                    >
                      <div className="col-span-1 text-[#8b949e] text-xs self-center">
                        {idx + 1}
                      </div>
                      <div className="col-span-2 text-xs text-[#8b949e] font-mono self-center">
                        {s.matricule}
                      </div>
                      <div className="col-span-3 font-semibold text-white self-center truncate">
                        {s.prenom} {s.nom?.toUpperCase()}
                      </div>
                      <div className="col-span-1 self-center">
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400
                                         text-xs font-bold rounded">
                          {s.filiere}
                        </span>
                      </div>
                      <div className={`col-span-2 text-right font-black self-center
                                       ${getMentionStyle(moy)}`}>
                        {moy != null ? Number(moy).toFixed(2) : '—'}
                        <span className="text-[#8b949e] font-normal text-xs">/20</span>
                      </div>
                      <div className="col-span-1 text-center text-xs text-[#8b949e] self-center">
                        {s.nb_cc_passes}
                      </div>
                      <div className={`col-span-2 text-right text-xs font-bold self-center
                                       ${getMentionStyle(moy)}`}>
                        {getMention(moy)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pied : stats globales */}
              <div className="px-4 py-3 bg-[#21262d] flex items-center justify-between">
                <span className="text-xs text-[#8b949e]">
                  {synthese.length} étudiant{synthese.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold text-white">
                  Moyenne promo :{' '}
                  <span className={getMentionStyle(
                    synthese.reduce((acc, s) => acc + (s.moyenne_generale ?? 0), 0) / synthese.length
                  )}>
                    {synthese.length > 0
                      ? (synthese.reduce((acc, s) => acc + (s.moyenne_generale ?? 0), 0) / synthese.length).toFixed(2)
                      : '—'
                    }/20
                  </span>
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VUE NOTES PAR CC
      ════════════════════════════════════════════════════════════════════ */}
      {vue === 'par-cc' && (
        <>
          {erreur && (
            <div className="px-4 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm">
              {erreur}
            </div>
          )}

          {/* Sélecteur CC */}
          {loading && !notesCc && (
            <div className="text-[#8b949e] text-sm text-center py-8">Chargement des CC…</div>
          )}

          {!loading && ccList.length === 0 && (
            <div className="text-center py-12 text-[#8b949e] text-sm">
              Aucun CC disponible.
            </div>
          )}

          {ccList.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {ccList.map(cc => (
                <button
                  key={cc.id}
                  onClick={() => chargerNotesCc(cc.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all
                    ${ccChoisi === cc.id
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-[#161b22] border-[#21262d] hover:border-[#8b949e]'
                    }`}
                >
                  <div className="text-sm font-bold text-white">{cc.titre}</div>
                  <div className="text-xs text-[#8b949e] mt-0.5">
                    {cc.nb_questions} questions · {cc.duree_minutes} min
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Résultats du CC sélectionné */}
          {notesCc && (
            <div className="space-y-4 mt-2">
              {['TIC', 'II'].map(fil => {
                const data = notesCc[fil];
                if (!data || data.effectif === 0) return null;
                return (
                  <div key={fil} className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                    {/* En-tête filière */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#21262d]">
                      <span className="text-xs font-black text-white uppercase">
                        Filière {fil}
                      </span>
                      <div className="flex gap-4 text-xs text-[#8b949e]">
                        <span>{data.effectif} étudiant{data.effectif > 1 ? 's' : ''}</span>
                        <span className={`font-bold ${getMentionStyle(data.moyenne)}`}>
                          Moy. {data.moyenne != null ? Number(data.moyenne).toFixed(2) : '—'}/20
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="divide-y divide-[#21262d]">
                      {data.notes.map(n => (
                        <div
                          key={n.etudiant__matricule}
                          className="flex items-center gap-3 px-4 py-2.5
                                     hover:bg-[#21262d]/50 transition-colors"
                        >
                          <span className="text-xs text-[#8b949e] font-mono w-24 flex-shrink-0">
                            {n.etudiant__matricule}
                          </span>
                          <span className="text-sm text-white flex-1">
                            {n.etudiant__prenom} {n.etudiant__nom?.toUpperCase()}
                          </span>
                          <span className={`text-sm font-black ${getMentionStyle(n.note_sur_20)}`}>
                            {Number(n.note_sur_20).toFixed(2)}/20
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
