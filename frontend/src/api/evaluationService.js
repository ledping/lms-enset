// src/api/evaluationService.js
// Endpoints confirmés depuis apps/evaluations/urls.py + apps/cours/urls.py

import api from './axiosConfig';

export const evaluationService = {

  // ── Dashboard étudiant ──────────────────────────────────────────────────
  // GET /api/dashboard/
  // Retourne : { etudiant, statistiques, resultats }
  getDashboard: () =>
    api.get('/dashboard/').then(r => r.data),

  // ── Liste des CC disponibles ────────────────────────────────────────────
  // GET /api/cc/
  // Retourne : [{ id, titre, description, duree_minutes, nb_questions,
  //               est_actif, est_deja_passe, mon_resultat }]
  getCC: () =>
    api.get('/cc/').then(r => r.data),

  // ── Démarrer un CC (crée la tentative) ─────────────────────────────────
  // GET /api/cc/<id>/
  // Retourne : { id, titre, duree_minutes, tentative_id, questions }
  // tentative_id = null si déjà passé ou délai expiré
  startCC: (ccId) =>
    api.get(`/cc/${ccId}/`).then(r => r.data),

  // ── Soumettre un CC ─────────────────────────────────────────────────────
  // POST /api/evaluations/soumettre/<tentative_id>/
  // Corps   : { reponses: [{ question_id: N, choix_id: M }, ...] }
  // Retourne: ResultatSerializer + { hors_delai: bool }
  soumettre: (tentativeId, payload) =>
    api.post(`/evaluations/soumettre/${tentativeId}/`, payload).then(r => r.data),

  // ── Liste des cours ─────────────────────────────────────────────────────
  // GET /api/cours/
  // Retourne : [{ id, titre, description, filiere, fichier_url, enseignant_nom, date_creation }]
  getCours: () =>
    api.get('/cours/').then(r => r.data),

  // ── Détail d'un cours ───────────────────────────────────────────────────
  // GET /api/cours/<id>/
  // Retourne : CoursDetailSerializer (avec contenu_html + fichier_url)
  getCoursDetail: (coursId) =>
    api.get(`/cours/${coursId}/`).then(r => r.data),

};