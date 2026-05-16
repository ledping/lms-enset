# apps/evaluations/views.py
# ─── Vues API complètes ───────────────────────────────────────────────────────

from django.utils import timezone
from django.db.models import Avg
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CC, Tentative, Reponse, Resultat, Choix
from .serializers import (
    CCListSerializer, CCDetailSerializer, CCCreateSerializer,
    ResultatSerializer, ReceiptPublicSerializer,
    SoumissionSerializer,
)
from .utils import get_synthese_filiere, get_notes_par_cc, calculer_note_sur_20, attribuer_badge
from apps.cours.models import Cours
from apps.cours.serializers import CoursListSerializer, CoursDetailSerializer


# ──────────────────────────────────────────────
#  COURS
# ──────────────────────────────────────────────

class CoursListView(generics.ListAPIView):
    """GET /api/cours/ — tous les cours selon filière de l'étudiant."""
    serializer_class    = CoursListSerializer
    permission_classes  = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Cours.objects.filter(est_publie=True)
        try:
            filiere = self.request.user.etudiant.filiere
            # Afficher les cours de sa filière + cours communs (TOUS)
            qs = qs.filter(filiere__in=[filiere, 'TOUS'])
        except Exception:
            pass  # Enseignant : tous les cours
        return qs.order_by('-date_creation')


class CoursDetailView(generics.RetrieveAPIView):
    """GET /api/cours/<id>/ — détail avec contenu HTML."""
    queryset            = Cours.objects.filter(est_publie=True)
    serializer_class    = CoursDetailSerializer
    permission_classes  = [permissions.IsAuthenticated]


class CoursCreateView(generics.CreateAPIView):
    """POST /api/cours/ — création par enseignant (Cloudinary URL pour PDF)."""
    serializer_class    = CoursDetailSerializer
    permission_classes  = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(enseignant=self.request.user.enseignant)


# ──────────────────────────────────────────────
#  CC
# ──────────────────────────────────────────────

class CCListView(generics.ListAPIView):
    """GET /api/cc/ — liste des CC disponibles avec statut étudiant."""
    serializer_class    = CCListSerializer
    permission_classes  = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CC.objects.filter(est_actif=True).order_by('-date_creation')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CCDetailView(generics.RetrieveAPIView):
    """GET /api/cc/<id>/ — détail avec questions mélangées + création tentative."""
    queryset            = CC.objects.filter(est_actif=True)
    serializer_class    = CCDetailSerializer
    permission_classes  = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CCCreateView(generics.CreateAPIView):
    """POST /api/cc/create/ — création CC par enseignant."""
    serializer_class    = CCCreateSerializer
    permission_classes  = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ──────────────────────────────────────────────
#  SOUMISSION & RÉSULTAT
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def soumettre_cc(request, tentative_id):
    """
    POST /api/evaluations/soumettre/<tentative_id>/
    Corps : { "reponses": [{"question_id": N, "choix_id": M}, ...] }

    Sécurité :
    - Vérifie que la tentative appartient à l'étudiant connecté
    - Vérifie le délai côté serveur (anti-triche chronomètre)
    - Calcule la note et persiste le Résultat
    - Retourne le receipt_token uniquement si tout est OK
    """
    try:
        tentative = Tentative.objects.select_related('cc', 'cc__enseignant', 'etudiant').get(
            id=tentative_id,
            etudiant=request.user.etudiant,
        )
    except (Tentative.DoesNotExist, AttributeError):
        return Response({'error': 'Tentative introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if tentative.est_soumise:
        # Déjà soumise → retourner le résultat existant
        try:
            resultat = Resultat.objects.get(tentative=tentative)
            return Response(ResultatSerializer(resultat).data)
        except Resultat.DoesNotExist:
            return Response({'error': 'Résultat déjà enregistré mais introuvable.'}, status=500)

    serializer = SoumissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    hors_delai = tentative.est_expiree
    reponses_data = serializer.validated_data['reponses']

    # ── Calcul de la note ────────────────────────────────────────────────────
    points_obtenus = 0.0
    for rep in reponses_data:
        try:
            choix = Choix.objects.select_related('question').get(
                id=rep['choix_id'],
                question__id=rep['question_id'],
                question__cc=tentative.cc
            )
            Reponse.objects.update_or_create(
                tentative=tentative,
                question_id=rep['question_id'],
                defaults={'choix_selectionne': choix}
            )
            if choix.est_correct:
                points_obtenus += choix.question.points
        except Choix.DoesNotExist:
            continue  # Choix ou question invalide → ignoré silencieusement

    total_points = tentative.cc.total_points
    note_20 = calculer_note_sur_20(points_obtenus, total_points)

    # ── Persistance ──────────────────────────────────────────────────────────
    resultat, created = Resultat.objects.get_or_create(
        tentative=tentative,
        defaults={
            'etudiant':   tentative.etudiant,
            'cc':         tentative.cc,
            'note_brute': points_obtenus,
            'note_sur_20': note_20,
        }
    )

    tentative.est_soumise = True
    tentative.heure_soumission = timezone.now()
    tentative.save(update_fields=['est_soumise', 'heure_soumission'])

    attribuer_badge(tentative.etudiant, note_20)

    data = ResultatSerializer(resultat).data
    data['hors_delai'] = hors_delai
    return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MonDashboardView(APIView):
    """
    GET /api/dashboard/
    Vue unifiée : profil étudiant + liste CC + résultats + moyenne générale.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            etudiant = request.user.etudiant
        except Exception:
            return Response({'error': 'Profil étudiant introuvable.'}, status=404)

        resultats = Resultat.objects.filter(
            etudiant=etudiant
        ).select_related('cc').order_by('-date_validation')

        moyenne = resultats.aggregate(Avg('note_sur_20'))['note_sur_20__avg']

        return Response({
            'etudiant': {
                'nom':       etudiant.nom,
                'prenom':    etudiant.prenom,
                'matricule': etudiant.matricule,
                'filiere':   etudiant.filiere,
                'avatar':    etudiant.avatar,
                'badges':    etudiant.badges,
            },
            'statistiques': {
                'moyenne_generale': round(moyenne, 2) if moyenne else None,
                'nb_cc_passes':     resultats.count(),
            },
            'resultats': ResultatSerializer(resultats, many=True).data,
        })


# ──────────────────────────────────────────────
#  VUES ENSEIGNANT
# ──────────────────────────────────────────────

class SyntheseView(APIView):
    """
    GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
    Tableau de bord notes avec filtrage par filière.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        filiere = request.query_params.get('filiere', 'TOUS')
        if filiere not in ('TIC', 'II', 'TOUS'):
            return Response({'error': 'filiere doit être TIC, II ou TOUS.'}, status=400)

        synthese = get_synthese_filiere(None if filiere == 'TOUS' else filiere)
        return Response({
            'filiere':  filiere,
            'synthese': synthese,
            'total':    len(synthese),
            'moyenne_promo': (
                round(sum(s['moyenne_generale'] or 0 for s in synthese) / len(synthese), 2)
                if synthese else None
            ),
        })


class NotesParCCView(APIView):
    """
    GET /api/enseignant/cc/<cc_id>/notes/
    Notes d'un CC spécifique séparées par filière.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cc_id):
        try:
            CC.objects.get(id=cc_id, enseignant=request.user.enseignant)
        except (CC.DoesNotExist, AttributeError):
            return Response({'error': 'CC introuvable ou accès refusé.'}, status=404)
        return Response(get_notes_par_cc(cc_id))


# ──────────────────────────────────────────────
#  VÉRIFICATION RÉCÉPISSÉ (QR Code)
# ──────────────────────────────────────────────

class VerifyReceiptView(APIView):
    """
    GET /api/receipts/verify/<token>/
    Endpoint public — vérifie l'authenticité d'un récépissé via son token UUID.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            resultat = Resultat.objects.select_related(
                'etudiant', 'cc'
            ).get(receipt_token=token)
        except (Resultat.DoesNotExist, Exception):
            return Response(
                {'valide': False, 'message': 'Récépissé invalide ou introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'valide': True,
            'data': ReceiptPublicSerializer(resultat).data
        })

