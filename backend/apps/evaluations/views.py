# apps/evaluations/views.py
# ─────────────────────────────────────────────────────────────────────────────
# Fichier complet — CCModifierView ajouté après CCCreateView
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Avg

from .models import CC, Question, Choix, Tentative, Resultat
from .serializers import (
    CoursListSerializer, CoursDetailSerializer,
    CCListSerializer, CCDetailSerializer, CCCreateSerializer,
    SoumissionSerializer, ResultatSerializer,
    ReceiptPublicSerializer,
)
from .utils import calculer_note, get_synthese_filiere, get_notes_par_cc

try:
    from apps.cours.models import Cours
except ImportError:
    Cours = None


# ──────────────────────────────────────────────
#  COURS
# ──────────────────────────────────────────────

class CoursListView(generics.ListAPIView):
    serializer_class   = CoursListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            filiere = user.etudiant.filiere
            return Cours.objects.filter(est_publie=True).filter(
                filiere__in=[filiere, 'TOUS']
            ).order_by('-date_creation')
        except Exception:
            return Cours.objects.filter(est_publie=True).order_by('-date_creation')


class CoursDetailView(generics.RetrieveAPIView):
    queryset           = Cours.objects.filter(est_publie=True)
    serializer_class   = CoursDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


class CoursCreateView(generics.CreateAPIView):
    queryset           = Cours.objects.all()
    serializer_class   = CoursDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            enseignant = self.request.user.enseignant
        except Exception:
            enseignant = None
        serializer.save(enseignant=enseignant)


# ──────────────────────────────────────────────
#  CC — LIST / DETAIL / CREATE / MODIFIER
# ──────────────────────────────────────────────

class CCListView(generics.ListAPIView):
    serializer_class   = CCListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CC.objects.filter(est_actif=True).order_by('-date_creation')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CCDetailView(generics.RetrieveAPIView):
    queryset           = CC.objects.filter(est_actif=True)
    serializer_class   = CCDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CCCreateView(generics.CreateAPIView):
    queryset           = CC.objects.all()
    serializer_class   = CCCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        try:
            enseignant = self.request.user.enseignant
        except Exception:
            enseignant = None
        serializer.save(enseignant=enseignant)


class CCModifierView(APIView):
    """
    PATCH  /api/cc/<id>/modifier/ — Activer/désactiver ou renommer un CC
    DELETE /api/cc/<id>/modifier/ — Supprimer un CC (et ses questions/résultats)
    Seul l'enseignant propriétaire du CC peut agir.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_cc(self, pk, request):
        try:
            return CC.objects.get(pk=pk, enseignant=request.user.enseignant)
        except (CC.DoesNotExist, AttributeError):
            return None

    def patch(self, request, pk):
        cc = self.get_cc(pk, request)
        if not cc:
            return Response(
                {'error': 'CC introuvable ou accès refusé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        cc.titre         = request.data.get('titre',         cc.titre)
        cc.est_actif     = request.data.get('est_actif',     cc.est_actif)
        cc.duree_minutes = request.data.get('duree_minutes', cc.duree_minutes)
        cc.save()
        return Response({'message': 'CC mis à jour.', 'est_actif': cc.est_actif})

    def delete(self, request, pk):
        cc = self.get_cc(pk, request)
        if not cc:
            return Response(
                {'error': 'CC introuvable ou accès refusé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        cc.delete()
        return Response({'message': 'CC supprimé.'}, status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
#  SOUMISSION CC
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def soumettre_cc(request, tentative_id):
    try:
        tentative = Tentative.objects.get(pk=tentative_id)
    except Tentative.DoesNotExist:
        return Response({'error': 'Tentative introuvable.'}, status=404)

    if tentative.etudiant != request.user.etudiant:
        return Response({'error': 'Accès refusé.'}, status=403)

    if tentative.est_soumise:
        return Response({'error': 'Cette tentative a déjà été soumise.'}, status=400)

    serializer = SoumissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    reponses = serializer.validated_data['reponses']
    hors_delai = False

    if tentative.cc.duree_minutes:
        delai = timezone.now() - tentative.heure_debut
        if delai.total_seconds() > tentative.cc.duree_minutes * 60 + 30:
            hors_delai = True

    # Calcul de la note
    note_brute, note_sur_20 = calculer_note(tentative.cc, reponses)

    # Enregistrer les réponses
    for rep in reponses:
        try:
            question = Question.objects.get(pk=rep['question_id'], cc=tentative.cc)
            choix    = Choix.objects.get(pk=rep['choix_id'], question=question)
            tentative.reponses_etudiant.create(question=question, choix=choix)
        except (Question.DoesNotExist, Choix.DoesNotExist):
            pass

    tentative.est_soumise = True
    tentative.heure_fin   = timezone.now()
    tentative.save()

    resultat = Resultat.objects.create(
        tentative  = tentative,
        etudiant   = tentative.etudiant,
        cc         = tentative.cc,
        note_brute = note_brute,
        note_sur_20= note_sur_20,
    )

    data = ResultatSerializer(resultat).data
    data['hors_delai'] = hors_delai
    return Response(data, status=201)


# ──────────────────────────────────────────────
#  DASHBOARD ÉTUDIANT
# ──────────────────────────────────────────────

class MonDashboardView(APIView):
    """
    GET /api/dashboard/
    Retourne le profil étudiant, ses statistiques et ses résultats.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            etudiant = request.user.etudiant
        except Exception:
            return Response({'error': 'Profil étudiant introuvable.'}, status=404)

        resultats = Resultat.objects.filter(etudiant=etudiant).select_related('cc')
        nb_cc     = resultats.count()
        moyenne   = resultats.aggregate(m=Avg('note_sur_20'))['m']

        resultats_data = [
            {
                'id':              r.id,
                'cc_titre':        r.cc.titre,
                'note_sur_20':     r.note_sur_20,
                'mention':         r.get_mention(),
                'date_validation': r.date_validation,
                'receipt_token':   str(r.receipt_token),
                'signature_url':   r.signature_url if hasattr(r, 'signature_url') else None,
            }
            for r in resultats.order_by('-date_validation')
        ]

        return Response({
            'etudiant': {
                'nom':       etudiant.nom,
                'prenom':    etudiant.prenom,
                'matricule': etudiant.matricule,
                'filiere':   etudiant.filiere,
                'badges':    etudiant.badges if hasattr(etudiant, 'badges') else [],
            },
            'statistiques': {
                'nb_cc_passes':    nb_cc,
                'moyenne_generale': round(float(moyenne), 2) if moyenne else None,
            },
            'resultats': resultats_data,
        })


# ──────────────────────────────────────────────
#  SYNTHÈSE NOTES (enseignant)
# ──────────────────────────────────────────────

class SyntheseView(APIView):
    """
    GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
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
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            resultat = Resultat.objects.get(receipt_token=token)
            return Response(ReceiptPublicSerializer(resultat).data)
        except Resultat.DoesNotExist:
            return Response({'error': 'Récépissé invalide ou introuvable.'}, status=404)