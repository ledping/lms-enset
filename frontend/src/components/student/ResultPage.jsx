// src/components/student/ResultPage.jsx
import { useState } from 'react';
import { generateReceipt } from '../../utils/generateReceipt';

export default function ResultPage({ resultat, ccTitre, etudiant, onRetour }) {
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const note = resultat?.note_sur_20 ?? 0;
  const isAdmis = note >= 10;

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await generateReceipt({
        nom:            etudiant.nom,
        prenom:         etudiant.prenom,
        matricule:      etudiant.matricule,
        filiere:        etudiant.filiere,
        titreCC:        ccTitre,
        note:           note,
        mention:        resultat.mention,
        dateValidation: resultat.date_validation,
        receiptToken:   resultat.receipt_token,
        signatureUrl:   resultat.signature_url ?? null,
      });
      setDownloaded(true);
    } catch (err) {
      console.error('Erreur génération PDF :', err);
    } finally {
      setGenerating(false);
    }
  };

  // Le bouton n'est actif QUE si le serveur a confirmé (receipt_token présent)
  const canDownload = !!resultat?.receipt_token;

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Score */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 mb-4 text-center">

          <p className="text-xs text-[#8b949e] uppercase tracking-widest mb-4 font-semibold">
            Résultat enregistré ✓
          </p>

          {/* Anneau de score */}
          <div className={`w-28 h-28 rounded-full border-4 mx-auto mb-4
                           flex flex-col items-center justify-center
            ${isAdmis
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-red-500 bg-red-500/10'
            }`}>
            <span className={`text-3xl font-black ${isAdmis ? 'text-emerald-400' : 'text-red-400'}`}>
              {note.toFixed(2)}
            </span>
            <span className="text-[#8b949e] text-xs">/ 20</span>
          </div>

          {/* Mention */}
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4
            ${isAdmis
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
            {resultat?.mention}
          </div>

          {/* Badge gamification si ≥ 16 */}
          {note >= 16 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg
                             p-3 mb-4 text-center">
              <span className="text-2xl">🏆</span>
              <p className="text-yellow-400 text-xs font-bold mt-1">
                Badge "Excellent" débloqué !
              </p>
            </div>
          )}

          {/* Infos CC */}
          <p className="text-[#8b949e] text-xs mb-1">{ccTitre}</p>
          <p className="text-[#484f58] text-xs">
            {resultat?.date_validation
              ? new Date(resultat.date_validation).toLocaleString('fr-FR')
              : ''}
          </p>
        </div>

        {/* Bouton PDF — actif seulement après confirmation serveur */}
        <button
          onClick={handleDownload}
          disabled={!canDownload || generating}
          className="w-full py-3 rounded-xl font-bold text-sm text-white mb-3
                     bg-gradient-to-r from-blue-600 to-violet-600
                     hover:from-blue-500 hover:to-violet-500
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all flex items-center justify-center gap-2"
        >
          {generating
            ? <><Spinner /> Génération du PDF...</>
            : downloaded
              ? '✅ PDF téléchargé'
              : '📄 Télécharger le Récépissé PDF'
          }
        </button>

        {!canDownload && (
          <p className="text-xs text-[#484f58] text-center mb-3">
            En attente de confirmation du serveur…
          </p>
        )}

        {/* Retour dashboard */}
        <button
          onClick={onRetour}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-[#8b949e]
                     border border-[#21262d] hover:border-[#30363d]
                     hover:text-white transition-all"
        >
          ← Retour au dashboard
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
