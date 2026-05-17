// src/pages/TeacherPage.jsx
// Dashboard enseignant complet — Notes | Mes CC | Créer CC | Cours
// FINAL — converge TeacherPage + CCBuilder + CoursManager en un seul fichier autonome
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import * as XLSX from 'xlsx';

const Icon = {
  notes:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  cc:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  plus:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  cours:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
  trash:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  upload: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
  excel:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  eye:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
};
const getMention = n => { if(!n) return '—'; if(n>=16) return 'Très Bien'; if(n>=14) return 'Bien'; if(n>=12) return 'Assez Bien'; if(n>=10) return 'Passable'; return 'Insuffisant'; };
const noteColor = n => { if(!n) return 'text-gray-500'; if(n>=14) return 'text-emerald-400'; if(n>=10) return 'text-amber-400'; return 'text-red-400'; };

export default function TeacherPage() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState('notes');
  const [profil, setProfil] = useState(null);
  const [synthese, setSynthese] = useState([]);
  const [filiere, setFiliere] = useState('TOUS');
  const [ccList, setCCList] = useState([]);
  const [coursList, setCoursList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ccDetail, setCCDetail] = useState(null);

  useEffect(() => { chargerProfil(); chargerSynthese('TOUS'); chargerCC(); chargerCours(); }, []);

  const chargerProfil = async () => { try { const r = await api.get('/auth/me/'); setProfil(r.data); } catch {} };
  const chargerSynthese = async f => { setLoading(true); try { const r = await api.get(`/enseignant/synthese/?filiere=${f}`); setSynthese(r.data.synthese||[]); } catch { setSynthese([]); } finally { setLoading(false); } };
  const chargerCC = async () => { try { const r = await api.get('/cc/'); setCCList(r.data.results??r.data); } catch {} };
  const chargerCours = async () => { try { const r = await api.get('/cours/'); setCoursList(r.data.results??r.data); } catch {} };

  const voirNotesCC = async ccId => { try { const r = await api.get(`/enseignant/cc/${ccId}/notes/`); setCCDetail({ccId,data:r.data}); setOnglet('notes-cc'); } catch {} };
  const toggleCC = async cc => { try { await api.patch(`/cc/${cc.id}/modifier/`,{est_actif:!cc.est_actif}); chargerCC(); } catch {} };
  const supprimerCC = async id => { if(!confirm('Supprimer ce CC ?')) return; try { await api.delete(`/cc/${id}/modifier/`); chargerCC(); } catch {} };
  const supprimerCours = async id => { if(!confirm('Supprimer ce cours ?')) return; try { await api.delete(`/cours/${id}/modifier/`); chargerCours(); } catch {} };

  const exportExcel = () => {
    const rows = synthese.map((s,i) => ({'N°':i+1,'Matricule':s.matricule,'Nom':s.nom?.toUpperCase(),'Prénom':s.prenom,'Filière':s.filiere,'CC passés':s.nb_cc_passes,'Moyenne /20':Number(s.moyenne_generale||0).toFixed(2),'Mention':getMention(s.moyenne_generale)}));
    const ws = XLSX.utils.json_to_sheet(rows); ws['!cols']=[{wch:4},{wch:14},{wch:18},{wch:18},{wch:8},{wch:10},{wch:12},{wch:14}];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,`Notes_${filiere}`);
    XLSX.writeFile(wb,`Notes_${filiere}_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'')}.xlsx`);
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };
  const tabs = [{id:'notes',label:'Synthèse Notes',icon:Icon.notes},{id:'mes-cc',label:'Mes CC',icon:Icon.cc},{id:'creer-cc',label:'Créer un CC',icon:Icon.plus},{id:'cours',label:'Cours',icon:Icon.cours}];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <nav className="bg-[#161b22] border-b border-[#21262d] px-4 py-0 flex items-center">
        <span className="font-black text-blue-500 py-3 mr-6 text-sm">ENSET LMS</span>
        <div className="flex gap-1 flex-1">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setOnglet(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all ${onglet===t.id?'border-blue-500 text-blue-400':'border-transparent text-[#8b949e] hover:text-white hover:border-[#30363d]'}`}>
              <t.icon/>{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 py-3">
          <span className="text-xs text-[#8b949e]">{profil?.prenom} {profil?.nom}</span>
          <button onClick={handleLogout} className="text-xs text-[#8b949e] hover:text-red-400 transition-colors">Déconnexion</button>
        </div>
      </nav>

      <div className="p-5 max-w-6xl mx-auto">

        {onglet==='notes' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="text-lg font-black">Synthèse des notes</h1><p className="text-xs text-[#8b949e] mt-0.5">Tous les étudiants ayant passé au moins un CC</p></div>
              <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"><Icon.excel/>Exporter Excel</button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[{v:synthese.length,l:'Étudiants',c:'text-blue-400'},{v:synthese.length?(synthese.reduce((a,s)=>a+(s.moyenne_generale||0),0)/synthese.length).toFixed(2)+'/20':'—',l:'Moyenne promo',c:'text-emerald-400'},{v:synthese.filter(s=>(s.moyenne_generale||0)>=10).length,l:'Admis (≥10)',c:'text-amber-400'},{v:synthese.filter(s=>s.moyenne_generale!=null&&s.moyenne_generale<10).length,l:'Non admis',c:'text-red-400'}].map(s=>(
                <div key={s.l} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4"><div className={`text-2xl font-black ${s.c}`}>{s.v}</div><div className="text-xs text-[#8b949e] mt-1">{s.l}</div></div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              {['TOUS','TIC','II'].map(f=>(
                <button key={f} onClick={()=>{setFiliere(f);chargerSynthese(f);}}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${filiere===f?'bg-blue-600/30 text-blue-400 border-blue-500/50':'bg-transparent text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'}`}>
                  {f==='TOUS'?'Toutes filières':`Filière ${f}`}
                </button>
              ))}
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#21262d]">
                  {['#','Matricule','Nom & Prénom','Filière','CC passés','Moyenne /20','Mention'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8b949e] uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading?(<tr><td colSpan={7} className="text-center py-8 text-[#8b949e] text-sm">Chargement…</td></tr>)
                  :synthese.length===0?(<tr><td colSpan={7} className="text-center py-8 text-[#8b949e] text-sm">Aucun résultat — les étudiants n'ont pas encore passé de CC.</td></tr>)
                  :synthese.map((s,i)=>(
                    <tr key={s.matricule} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/40 transition-colors">
                      <td className="px-4 py-3 text-[#8b949e] text-xs">{i+1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#8b949e]">{s.matricule}</td>
                      <td className="px-4 py-3 font-semibold">{s.prenom} {s.nom?.toUpperCase()}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.filiere==='TIC'?'bg-blue-500/20 text-blue-400':'bg-violet-500/20 text-violet-400'}`}>{s.filiere}</span></td>
                      <td className="px-4 py-3 text-[#8b949e]">{s.nb_cc_passes}</td>
                      <td className={`px-4 py-3 font-black text-base ${noteColor(s.moyenne_generale)}`}>{s.moyenne_generale?Number(s.moyenne_generale).toFixed(2):'—'}</td>
                      <td className="px-4 py-3 text-xs text-[#8b949e]">{getMention(s.moyenne_generale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {synthese.length>0&&(<div className="px-4 py-3 border-t border-[#21262d] flex justify-between text-xs text-[#8b949e]"><span>{synthese.length} étudiant(s)</span><span className="font-bold text-blue-400">Moyenne promo : {synthese.length?(synthese.reduce((a,s)=>a+(s.moyenne_generale||0),0)/synthese.length).toFixed(2)+'/20':'—'}</span></div>)}
            </div>
          </div>
        )}

        {onglet==='mes-cc' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="text-lg font-black">Mes CC</h1><p className="text-xs text-[#8b949e] mt-0.5">Gérez vos contrôles continus</p></div>
              <button onClick={()=>setOnglet('creer-cc')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"><Icon.plus/>Nouveau CC</button>
            </div>
            <div className="space-y-3">
              {ccList.length===0?(
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 text-center">
                  <p className="text-[#8b949e] text-sm mb-3">Aucun CC créé pour l'instant.</p>
                  <button onClick={()=>setOnglet('creer-cc')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all">Créer mon premier CC</button>
                </div>
              ):ccList.map(cc=>(
                <div key={cc.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${cc.est_actif?'bg-emerald-500':'bg-[#30363d]'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">{cc.titre}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${cc.est_actif?'bg-emerald-500/20 text-emerald-400':'bg-[#21262d] text-[#8b949e]'}`}>{cc.est_actif?'Actif':'Inactif'}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-[#8b949e]"><span>⏱ {cc.duree_minutes} min</span><span>❓ {cc.nb_questions} questions</span></div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={()=>voirNotesCC(cc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs rounded-lg transition-all"><Icon.eye/>Notes</button>
                    <button onClick={()=>toggleCC(cc)} className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${cc.est_actif?'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30':'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>{cc.est_actif?'Désactiver':'Activer'}</button>
                    <button onClick={()=>supprimerCC(cc.id)} className="p-1.5 text-[#8b949e] hover:text-red-400 transition-colors"><Icon.trash/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {onglet==='notes-cc'&&ccDetail&&(
          <div>
            <button onClick={()=>setOnglet('mes-cc')} className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-white mb-4 transition-colors">← Retour à mes CC</button>
            <h1 className="text-lg font-black mb-5">Notes détaillées</h1>
            {['TIC','II'].map(f=>(
              <div key={f} className="mb-6">
                <h2 className="text-sm font-bold text-[#8b949e] uppercase tracking-wide mb-3">Filière {f} — Moyenne : <span className={noteColor(ccDetail.data[f]?.moyenne)}>{ccDetail.data[f]?.moyenne?Number(ccDetail.data[f].moyenne).toFixed(2)+'/20':'—'}</span></h2>
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#21262d]">{['Matricule','Nom','Prénom','Note /20','Mention'].map(h=>(<th key={h} className="text-left px-4 py-2 text-xs text-[#8b949e] uppercase">{h}</th>))}</tr></thead>
                    <tbody>
                      {(ccDetail.data[f]?.notes||[]).length===0?(<tr><td colSpan={5} className="text-center py-4 text-[#8b949e] text-xs">Aucun étudiant {f} n'a encore passé ce CC.</td></tr>)
                      :(ccDetail.data[f]?.notes||[]).map((n,i)=>(
                        <tr key={i} className="border-b border-[#21262d]/50">
                          <td className="px-4 py-2 font-mono text-xs text-[#8b949e]">{n.etudiant__matricule}</td>
                          <td className="px-4 py-2 font-semibold">{n.etudiant__nom?.toUpperCase()}</td>
                          <td className="px-4 py-2">{n.etudiant__prenom}</td>
                          <td className={`px-4 py-2 font-black ${noteColor(n.note_sur_20)}`}>{Number(n.note_sur_20).toFixed(2)}</td>
                          <td className="px-4 py-2 text-xs text-[#8b949e]">{getMention(n.note_sur_20)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet==='creer-cc'&&<CCBuilder onSuccess={()=>{chargerCC();setOnglet('mes-cc');}}/>}
        {onglet==='cours'&&<CoursManager coursList={coursList} onRefresh={chargerCours} onDelete={supprimerCours}/>}
      </div>
    </div>
  );
}

function CCBuilder({onSuccess}){
  const [titre,setTitre]=useState(''); const [duree,setDuree]=useState(20); const [melange,setMelange]=useState(true);
  const [questions,setQuestions]=useState([creerQ()]); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  function creerQ(){return{enonce:'',points:1,choix:[{texte:'',est_correct:true},{texte:'',est_correct:false},{texte:'',est_correct:false},{texte:'',est_correct:false}]};}
  const ajouterQ=()=>setQuestions(p=>[...p,creerQ()]);
  const suppQ=i=>setQuestions(p=>p.filter((_,j)=>j!==i));
  const majQ=(qi,field,val)=>setQuestions(p=>p.map((q,i)=>i===qi?{...q,[field]:val}:q));
  const majC=(qi,ci,field,val)=>setQuestions(p=>p.map((q,i)=>{if(i!==qi)return q;const choix=q.choix.map((c,j)=>{if(field==='est_correct')return{...c,est_correct:j===ci};return j===ci?{...c,[field]:val}:c;});return{...q,choix};}));
  const handleSubmit=async e=>{
    e.preventDefault();setError('');
    if(!titre.trim()){setError('Le titre est obligatoire.');return;}
    for(const[i,q]of questions.entries()){
      if(!q.enonce.trim()){setError(`Question ${i+1} : l'énoncé est vide.`);return;}
      if(q.choix.filter(c=>c.texte.trim()).length<2){setError(`Question ${i+1} : il faut au moins 2 choix remplis.`);return;}
    }
    setLoading(true);
    try{await api.post('/cc/create/',{titre,duree_minutes:duree,melange_questions:melange,questions:questions.map(q=>({enonce:q.enonce,points:q.points,choix:q.choix.filter(c=>c.texte.trim())}))});onSuccess();}
    catch(err){setError(err.response?.data?.error||'Erreur lors de la création.');}
    finally{setLoading(false);}
  };
  return(
    <div>
      <h1 className="text-lg font-black mb-1">Créer un CC</h1>
      <p className="text-xs text-[#8b949e] mb-5">Le CC sera créé <span className="text-amber-400 font-bold">inactif</span> — activez-le depuis "Mes CC".</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#8b949e] uppercase tracking-wide">Paramètres</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">Titre *</label><input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Ex: Systèmes Logiques — CC 3" className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm placeholder-[#484f58] outline-none focus:border-blue-500 transition-all"/></div>
            <div><label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5">Durée (min) *</label><input type="number" min={5} max={180} value={duree} onChange={e=>setDuree(Number(e.target.value))} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-all"/></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={melange} onChange={e=>setMelange(e.target.checked)} className="w-4 h-4 accent-blue-600"/><span className="text-sm text-[#8b949e]">Mélanger les questions aléatoirement</span></label>
        </div>
        {questions.map((q,qi)=>(
          <div key={qi} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Question {qi+1}</span>
              {questions.length>1&&<button type="button" onClick={()=>suppQ(qi)} className="text-[#8b949e] hover:text-red-400 transition-colors"><Icon.trash/></button>}
            </div>
            <textarea value={q.enonce} onChange={e=>majQ(qi,'enonce',e.target.value)} placeholder="Rédigez l'énoncé de la question..." rows={2} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm placeholder-[#484f58] outline-none resize-none focus:border-blue-500 transition-all mb-3"/>
            <div className="space-y-2">
              <p className="text-xs text-[#8b949e]">Choix (rond vert = bonne réponse) :</p>
              {q.choix.map((c,ci)=>(
                <div key={ci} className="flex items-center gap-2">
                  <button type="button" onClick={()=>majC(qi,ci,'est_correct',true)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${c.est_correct?'border-emerald-500 bg-emerald-500':'border-[#30363d] bg-transparent hover:border-emerald-500/50'}`}/>
                  <input value={c.texte} onChange={e=>majC(qi,ci,'texte',e.target.value)} placeholder={`Choix ${String.fromCharCode(65+ci)}…`} className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-white text-sm placeholder-[#484f58] outline-none focus:border-blue-500 transition-all"/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={ajouterQ} className="w-full py-2.5 border border-dashed border-[#30363d] rounded-xl text-[#8b949e] text-sm hover:border-blue-500/50 hover:text-blue-400 transition-all flex items-center justify-center gap-2"><Icon.plus/>Ajouter une question</button>
        {error&&<div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">⚠️ {error}</div>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">{loading?'Création...':`✓ Créer le CC (${questions.length} question${questions.length>1?'s':''})`}</button>
      </form>
    </div>
  );
}

function CoursManager({coursList,onRefresh,onDelete}){
  const [fichier,setFichier]=useState(null); const [titre,setTitre]=useState(''); const [filiere,setFiliere]=useState('TOUS');
  const [description,setDesc]=useState(''); const [uploading,setUploading]=useState(false); const [progress,setProgress]=useState(0);
  const [error,setError]=useState(''); const [success,setSuccess]=useState('');
  const handleUpload=async e=>{
    e.preventDefault();
    if(!fichier){setError('Sélectionnez un fichier PDF.');return;} if(!titre.trim()){setError('Le titre est obligatoire.');return;}
    setError('');setUploading(true);setProgress(0);
    const form=new FormData(); form.append('fichier',fichier); form.append('titre',titre.trim()); form.append('filiere',filiere); form.append('description',description.trim());
    try{await api.post('/cours/upload/',form,{headers:{'Content-Type':'multipart/form-data'},onUploadProgress:p=>setProgress(Math.round(p.loaded*100/p.total))});setSuccess('Cours publié avec succès !');setFichier(null);setTitre('');setDesc('');setProgress(0);onRefresh();setTimeout(()=>setSuccess(''),3000);}
    catch(err){setError(err.response?.data?.error||"Erreur lors de l'upload.");}
    finally{setUploading(false);}
  };
  return(
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <h2 className="text-sm font-bold mb-4">Ajouter un cours PDF</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div onClick={()=>document.getElementById('pdf-input').click()} className="border-2 border-dashed border-[#30363d] rounded-xl p-5 text-center cursor-pointer hover:border-blue-500/50 transition-all">
            <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={e=>{setFichier(e.target.files[0]);setTitre(e.target.files[0]?.name.replace('.pdf','').replace(/_/g,' ')||'');}}/>
            {fichier?<p className="text-sm font-medium text-white">📄 {fichier.name}</p>:<><div className="flex justify-center mb-2"><Icon.upload/></div><p className="text-xs text-[#8b949e]">Cliquez pour choisir un PDF</p></>}
          </div>
          <input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Titre du cours *" className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-all"/>
          <div className="flex gap-2">{['TOUS','TIC','II'].map(f=>(<button key={f} type="button" onClick={()=>setFiliere(f)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${filiere===f?'border-blue-500 bg-blue-500/15 text-blue-400':'border-[#30363d] text-[#8b949e]'}`}>{f}</button>))}</div>
          <textarea value={description} onChange={e=>setDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-blue-500"/>
          {uploading&&(<div><div className="flex justify-between text-xs text-[#8b949e] mb-1"><span>Upload…</span><span className="text-blue-400">{progress}%</span></div><div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div></div>)}
          {error&&<p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">⚠️ {error}</p>}
          {success&&<p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">✅ {success}</p>}
          <button type="submit" disabled={uploading||!fichier} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-40 transition-all">{uploading?'Upload...':'↑ Publier le cours'}</button>
        </form>
      </div>
      <div>
        <h2 className="text-sm font-bold mb-4">Cours publiés ({coursList.length})</h2>
        <div className="space-y-2">
          {coursList.length===0?(<div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 text-center text-[#8b949e] text-sm">Aucun cours publié.</div>)
          :coursList.map(c=>(<div key={c.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex items-center gap-3"><span className="text-2xl flex-shrink-0">📄</span><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{c.titre}</p><p className="text-xs text-[#8b949e]">Filière : {c.filiere}</p></div><div className="flex gap-2 flex-shrink-0"><a href={c.fichier_url} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs rounded-lg transition-all text-[#8b949e] hover:text-white">Voir ↗</a><button onClick={()=>onDelete(c.id)} className="p-1.5 text-[#8b949e] hover:text-red-400 transition-colors"><Icon.trash/></button></div></div>))}
        </div>
      </div>
    </div>
  );
}
