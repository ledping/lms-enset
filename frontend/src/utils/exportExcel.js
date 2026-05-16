// src/utils/exportExcel.js
import * as XLSX from 'xlsx';

export const exportSyntheseExcel = (synthese, filiere = 'TOUS') => {
  const rows = synthese.map((s, i) => ({
    'N°': i + 1,
    'Matricule': s.matricule,
    'Nom': s.nom,
    'Prénom': s.prenom,
    'Filière': s.filiere,
    'Nb CC Passés': s.nb_cc_passes,
    'Moyenne Générale /20': Number(s.moyenne_generale).toFixed(2),
    'Mention': getMention(s.moyenne_generale),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Largeurs de colonnes
  ws['!cols'] = [
    {wch:4}, {wch:14}, {wch:18}, {wch:18},
    {wch:8}, {wch:12}, {wch:18}, {wch:14}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Notes_${filiere}`);
  XLSX.writeFile(wb, `Synthese_Notes_${filiere}_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'')}.xlsx`);
};

const getMention = (note) => {
  if (note >= 16) return 'Très Bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez Bien';
  if (note >= 10) return 'Passable';
  return 'Insuffisant';
};