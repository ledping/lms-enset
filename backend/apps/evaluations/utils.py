# apps/evaluations/utils.py
from django.db.models import Avg, Count, F
from .models import Resultat


def get_synthese_filiere(filiere: str = None) -> list[dict]:
    """
    Retourne la synthèse des notes de tous les étudiants.
    Si filiere='TIC' ou 'II', filtre par filière.
    Utilisé par le tableau de bord enseignant.
    """
    qs = Resultat.objects.select_related('etudiant', 'cc')

    if filiere in ('TIC', 'II'):
        qs = qs.filter(etudiant__filiere=filiere)

    # Grouper par étudiant → calcul de la moyenne générale semestrielle
    synthese = (
        qs
        .values(
            matricule=F('etudiant__matricule'),
            nom=F('etudiant__nom'),
            prenom=F('etudiant__prenom'),
            filiere=F('etudiant__filiere'),
        )
        .annotate(
            moyenne_generale=Avg('note_sur_20'),
            nb_cc_passes=Count('cc', distinct=True),
        )
        .order_by('filiere', '-moyenne_generale')
    )
    return list(synthese)


def get_notes_par_cc(cc_id: int) -> dict:
    """
    Pour un CC donné, retourne les notes séparées par filière.
    Utile pour la vue synthèse de l'enseignant.
    """
    qs = Resultat.objects.filter(cc_id=cc_id).select_related('etudiant')
    result = {}
    for filiere in ('TIC', 'II'):
        notes_filiere = qs.filter(etudiant__filiere=filiere)
        result[filiere] = {
            'notes': list(notes_filiere.values(
                'etudiant__matricule', 'etudiant__nom',
                'etudiant__prenom', 'note_sur_20'
            )),
            'moyenne': notes_filiere.aggregate(Avg('note_sur_20'))['note_sur_20__avg'],
            'effectif': notes_filiere.count(),
        }
    return result


def calculer_note_sur_20(points_obtenus: float, total_points: float) -> float:
    """Conversion vers /20 avec protection division par zéro."""
    if total_points == 0:
        return 0.0
    return round((points_obtenus / total_points) * 20, 2)


def attribuer_badge(etudiant, note_sur_20: float):
    """Système de gamification : badge si ≥ 16/20."""
    if note_sur_20 >= 16 and "Excellent" not in etudiant.badges:
        etudiant.badges.append("Excellent")
        etudiant.save(update_fields=['badges'])