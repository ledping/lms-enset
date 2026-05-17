# apps/evaluations/utils.py — VERSION CORRIGÉE
# CORRECTION PRINCIPALE : calculer_note_sur_20(points_obtenus, total_points) → float
# L'ancienne version prenait (cc, reponses) ce qui causait l'erreur de soumission

from django.db.models import Avg, Count, F
from .models import Resultat


def calculer_note_sur_20(points_obtenus: float, total_points: float) -> float:
    """
    Convertit les points obtenus en note sur 20.
    Protection division par zéro incluse.

    Usage : note = calculer_note_sur_20(points_obtenus, cc.total_points)
    """
    if not total_points or total_points == 0:
        return 0.0
    return round((points_obtenus / total_points) * 20, 2)


def get_synthese_filiere(filiere: str = None, enseignant=None) -> list[dict]:
    """
    Retourne la synthèse des notes.
    - Si enseignant est fourni : filtre par les CC de cet enseignant uniquement.
    - Si filiere est fourni : filtre par filière (TIC ou II).
    """
    qs = Resultat.objects.select_related('etudiant', 'cc')

    if enseignant is not None:
        qs = qs.filter(cc__enseignant=enseignant)

    if filiere in ('TIC', 'II'):
        qs = qs.filter(etudiant__filiere=filiere)

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
    Pour un CC donné, retourne les notes séparées par filière TIC et II.
    """
    qs = Resultat.objects.filter(cc_id=cc_id).select_related('etudiant')
    result = {}
    for filiere in ('TIC', 'II'):
        notes_filiere = qs.filter(etudiant__filiere=filiere)
        result[filiere] = {
            'notes': list(notes_filiere.values(
                'etudiant__matricule',
                'etudiant__nom',
                'etudiant__prenom',
                'note_sur_20',
            )),
            'moyenne':  notes_filiere.aggregate(Avg('note_sur_20'))['note_sur_20__avg'],
            'effectif': notes_filiere.count(),
        }
    return result


def attribuer_badge(etudiant, note_sur_20: float):
    """Badge Excellent si note ≥ 16/20."""
    try:
        if note_sur_20 >= 16 and "Excellent" not in etudiant.badges:
            etudiant.badges.append("Excellent")
            etudiant.save(update_fields=['badges'])
    except Exception:
        pass  # Silencieux si le champ badges n'existe pas
