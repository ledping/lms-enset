# apps/cours/views.py
# ─── Vues Cours avec upload PDF vers Cloudinary ───────────────────────────────

import cloudinary.uploader
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Cours
from .serializers import CoursListSerializer, CoursDetailSerializer


# ──────────────────────────────────────────────────────────────────────────────
#  LISTE DES COURS (étudiant)
# ──────────────────────────────────────────────────────────────────────────────

class CoursListView(generics.ListAPIView):
    """
    GET /api/cours/
    Retourne les cours selon la filière de l'étudiant connecté.
    Les enseignants voient tous les cours.
    """
    serializer_class   = CoursListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Cours.objects.filter(est_publie=True).select_related('enseignant')
        try:
            filiere = self.request.user.etudiant.filiere
            qs = qs.filter(filiere__in=[filiere, 'TOUS'])
        except Exception:
            pass  # Enseignant → tous les cours
        return qs.order_by('-date_creation')


# ──────────────────────────────────────────────────────────────────────────────
#  DÉTAIL D'UN COURS
# ──────────────────────────────────────────────────────────────────────────────

class CoursDetailView(generics.RetrieveAPIView):
    """
    GET /api/cours/<id>/
    Retourne le détail complet d'un cours (avec contenu HTML ou URL PDF).
    """
    queryset           = Cours.objects.filter(est_publie=True)
    serializer_class   = CoursDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


# ──────────────────────────────────────────────────────────────────────────────
#  UPLOAD PDF — ENSEIGNANT
# ──────────────────────────────────────────────────────────────────────────────

class CoursUploadView(APIView):
    """
    POST /api/cours/upload/
    L'enseignant envoie un fichier PDF + métadonnées.
    Le PDF est uploadé sur Cloudinary, l'URL est sauvegardée en base.

    Format de la requête : multipart/form-data
    Champs :
        - fichier   : le fichier PDF (obligatoire)
        - titre     : nom du cours (obligatoire)
        - description : résumé du cours (optionnel)
        - filiere   : TIC | II | TOUS (obligatoire)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        # ── 1. Vérifier que c'est bien un enseignant ────────────────────────
        try:
            enseignant = request.user.enseignant
        except Exception:
            return Response(
                {'error': 'Seuls les enseignants peuvent uploader des cours.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # ── 2. Vérifier les champs obligatoires ──────────────────────────────
        fichier   = request.FILES.get('fichier')
        titre     = request.data.get('titre', '').strip()
        filiere   = request.data.get('filiere', 'TOUS').strip()
        description = request.data.get('description', '').strip()

        if not fichier:
            return Response(
                {'error': 'Aucun fichier reçu. Ajoutez un PDF.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not titre:
            return Response(
                {'error': 'Le titre du cours est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if filiere not in ('TIC', 'II', 'TOUS'):
            return Response(
                {'error': 'La filière doit être TIC, II ou TOUS.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 3. Vérifier que c'est bien un PDF ───────────────────────────────
        if not fichier.name.lower().endswith('.pdf'):
            return Response(
                {'error': 'Seuls les fichiers PDF sont acceptés.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limite de taille : 20 Mo
        if fichier.size > 20 * 1024 * 1024:
            return Response(
                {'error': 'Le fichier est trop volumineux (max 20 Mo).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 4. Upload vers Cloudinary ────────────────────────────────────────
        try:
            # On utilise resource_type='raw' pour les PDF
            upload_result = cloudinary.uploader.upload(
                fichier,
                resource_type='raw',
                folder=f'lms-enset/cours/{filiere}',
                public_id=f"{filiere}_{titre.replace(' ', '_')}",
                overwrite=True,
                use_filename=True,
            )
            fichier_url = upload_result.get('secure_url')
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'upload Cloudinary : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ── 5. Sauvegarder en base de données ────────────────────────────────
        cours = Cours.objects.create(
            titre=titre,
            description=description,
            filiere=filiere,
            fichier_url=fichier_url,
            enseignant=enseignant,
            est_publie=True,
        )

        return Response(
            {
                'message': 'Cours uploadé avec succès.',
                'cours': CoursDetailSerializer(cours).data,
            },
            status=status.HTTP_201_CREATED
        )


# ──────────────────────────────────────────────────────────────────────────────
#  MODIFIER / SUPPRIMER UN COURS — ENSEIGNANT
# ──────────────────────────────────────────────────────────────────────────────

class CoursUpdateView(APIView):
    """
    PATCH /api/cours/<id>/modifier/
    Modifier le titre, description, filière ou remplacer le PDF d'un cours.

    DELETE /api/cours/<id>/modifier/
    Supprimer un cours (et son fichier sur Cloudinary).
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_cours(self, pk, enseignant):
        try:
            return Cours.objects.get(pk=pk, enseignant=enseignant)
        except Cours.DoesNotExist:
            return None

    def patch(self, request, pk):
        try:
            enseignant = request.user.enseignant
        except Exception:
            return Response({'error': 'Accès refusé.'}, status=403)

        cours = self.get_cours(pk, enseignant)
        if not cours:
            return Response({'error': 'Cours introuvable.'}, status=404)

        # Mise à jour des champs texte
        cours.titre       = request.data.get('titre', cours.titre)
        cours.description = request.data.get('description', cours.description)
        cours.filiere     = request.data.get('filiere', cours.filiere)
        cours.est_publie  = request.data.get('est_publie', cours.est_publie)

        # Remplacement du PDF si un nouveau fichier est envoyé
        nouveau_fichier = request.FILES.get('fichier')
        if nouveau_fichier:
            if not nouveau_fichier.name.lower().endswith('.pdf'):
                return Response({'error': 'Seuls les PDF sont acceptés.'}, status=400)
            try:
                upload_result = cloudinary.uploader.upload(
                    nouveau_fichier,
                    resource_type='raw',
                    folder=f'lms-enset/cours/{cours.filiere}',
                    overwrite=True,
                )
                cours.fichier_url = upload_result.get('secure_url')
            except Exception as e:
                return Response({'error': f'Erreur upload : {str(e)}'}, status=500)

        cours.save()
        return Response(CoursDetailSerializer(cours).data)

    def delete(self, request, pk):
        try:
            enseignant = request.user.enseignant
        except Exception:
            return Response({'error': 'Accès refusé.'}, status=403)

        cours = self.get_cours(pk, enseignant)
        if not cours:
            return Response({'error': 'Cours introuvable.'}, status=404)

        # Supprimer de Cloudinary si une URL existe
        if cours.fichier_url:
            try:
                # Extraire le public_id depuis l'URL Cloudinary
                # Ex: https://res.cloudinary.com/mon-cloud/raw/upload/v123/lms-enset/cours/TIC/mon_cours.pdf
                public_id = '/'.join(cours.fichier_url.split('/upload/')[1].split('/')[1:])
                public_id = public_id.rsplit('.', 1)[0]  # Retirer l'extension
                cloudinary.uploader.destroy(public_id, resource_type='raw')
            except Exception:
                pass  # Si l'URL est invalide, on supprime quand même de la base

        cours.delete()
        return Response({'message': 'Cours supprimé avec succès.'}, status=204)


# ──────────────────────────────────────────────────────────────────────────────
#  apps/cours/urls.py
# ──────────────────────────────────────────────────────────────────────────────
"""
from django.urls import path
from . import views

urlpatterns = [
    path('cours/',                      views.CoursListView.as_view(),   name='cours-list'),
    path('cours/<int:pk>/',             views.CoursDetailView.as_view(), name='cours-detail'),
    path('cours/upload/',               views.CoursUploadView.as_view(), name='cours-upload'),
    path('cours/<int:pk>/modifier/',    views.CoursUpdateView.as_view(), name='cours-update'),
]
"""