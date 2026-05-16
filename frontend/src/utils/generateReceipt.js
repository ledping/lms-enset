// src/utils/generateReceipt.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Génère et télécharge le récépissé PDF après confirmation du serveur.
 * @param {Object} data - Données reçues de l'API Django après soumission
 */
export const generateReceipt = async (data) => {
  const {
    nom, prenom, matricule, filiere,
    titreCC, note, mention,
    dateValidation, receiptToken,
    signatureUrl,
  } = data;

  // Format A5 portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = 148;

  // ── En-tête bleue ────────────────────────────────────────────────────────
  doc.setFillColor(26, 42, 108);
  doc.rect(0, 0, W, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ENSET DE DOUALA', W / 2, 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("École Nationale Supérieure d'Enseignement Technique", W / 2, 20, { align: 'center' });
  doc.text('Département Informatique & Télécommunications', W / 2, 25, { align: 'center' });

  doc.setFillColor(42, 82, 152);
  doc.rect(0, 38, W, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCÉPISSÉ DE CONTRÔLE CONTINU', W / 2, 45, { align: 'center' });

  // ── Infos étudiant ───────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: 54,
    head: [['Informations Étudiant', '']],
    body: [
      ['Nom & Prénom', `${prenom} ${nom.toUpperCase()}`],
      ['Matricule',    matricule],
      ['Filière',      filiere],
    ],
    theme: 'grid',
    headStyles: { fillColor: [26, 42, 108], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    margin: { left: 10, right: 10 },
  });

  // ── Résultat ─────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: [["Résultat de l'Évaluation", '']],
    body: [
      ['Intitulé du CC',  titreCC],
      ['Date & Heure',    new Date(dateValidation).toLocaleString('fr-FR')],
      ['Note Obtenue',    `${Number(note).toFixed(2)} / 20`],
      ['Mention',         mention],
    ],
    theme: 'grid',
    headStyles: { fillColor: [26, 42, 108], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { fontStyle: 'bold', textColor: note >= 10 ? [0, 128, 0] : [200, 0, 0] },
    },
    margin: { left: 10, right: 10 },
  });

  // ── QR Code ──────────────────────────────────────────────────────────────
  const qrY = doc.lastAutoTable.finalY + 6;
  const qrData = JSON.stringify({ token: receiptToken, matricule, cc: titreCC, note: Number(note).toFixed(2) });
  const qrUrl  = await QRCode.toDataURL(qrData, { width: 90, margin: 1, color: { dark: '#1a2a6c' } });
  doc.addImage(qrUrl, 'PNG', 108, qrY, 28, 28);
  doc.setFontSize(6);
  doc.setTextColor(100);
  doc.text('Scanner pour vérification', 122, qrY + 30, { align: 'center' });

  // ── Signature enseignant ──────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(50);
  doc.text("Signature de l'enseignant :", 12, qrY + 10);
  doc.setDrawColor(180);
  doc.rect(12, qrY + 12, 55, 18);
  if (signatureUrl) {
    try { doc.addImage(signatureUrl, 'PNG', 13, qrY + 13, 53, 16); } catch {}
  }

  // ── Pied de page ─────────────────────────────────────────────────────────
  doc.setFillColor(26, 42, 108);
  doc.rect(0, 194, W, 16, 'F');
  doc.setTextColor(255);
  doc.setFontSize(6.5);
  doc.text('Document généré automatiquement — enregistré en base de données.', W / 2, 199, { align: 'center' });
  doc.text(`Token : ${receiptToken}`, W / 2, 204, { align: 'center' });
  doc.text('Ce document constitue une preuve officielle de participation au CC.', W / 2, 208, { align: 'center' });

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  const filename = `Recepisse_${matricule}_${titreCC.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(filename);
};
