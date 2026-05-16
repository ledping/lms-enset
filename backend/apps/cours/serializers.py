# apps/cours/serializers.py
# ─── Serializers pour l'application Cours ────────────────────────────────────

from rest_framework import serializers
from .models import Cours


class CoursListSerializer(serializers.ModelSerializer):
    """
    Vue allégée — utilisée dans la liste des cours (dashboard étudiant).
    Ne renvoie PAS le contenu HTML complet pour alléger la réponse.
    """
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Cours
        fields = [
            'id',
            'titre',
            'description',
            'filiere',
            'fichier_url',
            'enseignant_nom',
            'date_creation',
            'est_publie',
        ]

    def get_enseignant_nom(self, obj):
        return f"{obj.enseignant.prenom} {obj.enseignant.nom}"


class CoursDetailSerializer(serializers.ModelSerializer):
    """
    Vue complète — inclut le contenu HTML interactif.
    Utilisée quand l'étudiant clique sur un cours pour l'ouvrir.
    Aussi utilisée par l'enseignant pour créer/modifier un cours.
    """
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Cours
        fields = [
            'id',
            'titre',
            'description',
            'contenu_html',     # ← Contenu des fichiers HTML existants
            'fichier_url',      # ← URL Cloudinary du PDF
            'filiere',
            'enseignant',
            'enseignant_nom',
            'date_creation',
            'est_publie',
        ]
        read_only_fields = ['enseignant', 'enseignant_nom', 'date_creation']

    def get_enseignant_nom(self, obj):
        return f"{obj.enseignant.prenom} {obj.enseignant.nom}"