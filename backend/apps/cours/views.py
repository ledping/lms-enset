# apps/cours/views.py — VERSION CORRIGÉE
# Ce fichier gère uniquement les routes cours/ définies dans cours/urls.py
# Les vues CoursUploadView et CoursModifierView sont aussi dans evaluations/views.py
# mais elles peuvent être centralisées ici si vous préférez.

from rest_framework import generics, permissions
from .models import Cours
from .serializers import CoursListSerializer, CoursDetailSerializer


class CoursListView(generics.ListAPIView):
    """
    GET /api/cours/
    - Étudiant : cours de sa filière + cours communs (TOUS)
    - Enseignant : ses propres cours uniquement
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return CoursListSerializer

    def get_queryset(self):
        user = self.request.user
        # Étudiant
        try:
            filiere = user.etudiant.filiere
            return Cours.objects.filter(
                est_publie=True,
                filiere__in=[filiere, 'TOUS']
            ).select_related('enseignant').order_by('-date_creation')
        except Exception:
            pass
        # Enseignant : uniquement ses cours
        try:
            return Cours.objects.filter(
                enseignant=user.enseignant,
                est_publie=True
            ).select_related('enseignant').order_by('-date_creation')
        except Exception:
            pass
        return Cours.objects.none()


class CoursDetailView(generics.RetrieveAPIView):
    """GET /api/cours/<id>/"""
    queryset           = Cours.objects.filter(est_publie=True)
    serializer_class   = CoursDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
