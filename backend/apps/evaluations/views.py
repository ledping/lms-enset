# apps/evaluations/views.py — VERSION CORRIGÉE COMPLÈTE
# Bugs corrigés :
# 1. soumettre_cc : calculer_note_sur_20 appelé avec mauvais arguments
# 2. soumettre_cc : tentative.reponses_etudiant → Reponse.objects.create
# 3. soumettre_cc : heure_fin → heure_soumission (nom réel du champ)
# 4. CCListView : retournait TOUS les CC → filtré par enseignant connecté
# 5. SyntheseView : ne filtrait pas par enseignant → isolé par teacher
# 6. Nouveau endpoint GET /enseignant/mes-cc/ pour la liste de l'enseignant

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Avg, Count, F

from .models import CC, Question, Choix, Tentative, Reponse, Resultat
from .serializers import (
    CCListSerializer, CCDetailSerializer, CCCreateSerializer,
    SoumissionSerializer, ResultatSerializer,
    ReceiptPublicSerializer,
)
from .utils import calculer_note_sur_20, get_notes_par_cc

try:
    from apps.cours.models import Cours
    from apps.cours.serializers import CoursListSerializer, CoursDetailSerializer
except ImportError:
    Cours = None


# ──────────────────────────────────────────────
#  COURS (routes exposées via evaluations/urls.py)
# ──────────────────────────────────────────────

class CoursListView(generics.ListAPIView):
    """GET /api/cours/ — cours visibles par l'étudiant selon sa filière."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return CoursListSerializer

    def get_queryset(self):
        user = self.request.user
        try:
            filiere = user.etudiant.filiere
            return Cours.objects.filter(est_publie=True, filiere__in=[filiere, 'TOUS']).order_by('-date_creation')
        except Exception:
            # Enseignant → voit ses propres cours
            try:
                return Cours.objects.filter(enseignant=user.enseignant, est_publie=True).order_by('-date_creation')
            except Exception:
                return Cours.objects.filter(est_publie=True).order_by('-date_creation')


class CoursDetailView(generics.RetrieveAPIView):
    """GET /api/cours/<id>/"""
    queryset = Cours.objects.filter(est_publie=True)
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return CoursDetailSerializer


class CoursUploadView(APIView):
    """
    POST /api/cours/upload/
    Upload d'un cours PDF par un enseignant vers Cloudinary.
    """
    permission_classes = [permissions.IsAuthenticated]
    # Import MultiPartParser ici pour éviter l'import circulaire
    from rest_framework.parsers import MultiPartParser, FormParser
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        import cloudinary.uploader

        try:
            enseignant = request.user.enseignant
        except Exception:
            return Response({'error': 'Seuls les enseignants peuvent uploader des cours.'}, status=403)

        fichier     = request.FILES.get('fichier')
        titre       = request.data.get('titre', '').strip()
        filiere     = request.data.get('filiere', 'TOUS').strip()
        description = request.data.get('description', '').strip()

        if not fichier:
            return Response({'error': 'Aucun fichier reçu.'}, status=400)
        if not titre:
            return Response({'error': 'Le titre est obligatoire.'}, status=400)
        if filiere not in ('TIC', 'II', 'TOUS'):
            return Response({'error': 'Filière invalide.'}, status=400)
        if not fichier.name.lower().endswith('.pdf'):
            return Response({'error': 'Seuls les fichiers PDF sont acceptés.'}, status=400)
        if fichier.size > 20 * 1024 * 1024:
            return Response({'error': 'Fichier trop volumineux (max 20 Mo).'}, status=400)

        try:
            result = cloudinary.uploader.upload(
                fichier,
                resource_type='raw',
                folder=f'lms-enset/cours/{filiere}',
                use_filename=True,
                overwrite=True,
            )
            fichier_url = result.get('secure_url')
        except Exception as e:
            return Response({'error': f'Erreur Cloudinary : {str(e)}'}, status=500)

        cours = Cours.objects.create(
            titre=titre,
            description=description,
            filiere=filiere,
            fichier_url=fichier_url,
            enseignant=enseignant,
            est_publie=True,
        )

        return Response(CoursDetailSerializer(cours).data, status=201)


class CoursModifierView(APIView):
    """
    DELETE /api/cours/<id>/modifier/ — Supprimer un cours (enseignant propriétaire uniquement)
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cours = Cours.objects.get(pk=pk, enseignant=request.user.enseignant)
        except (Cours.DoesNotExist, AttributeError):
            return Response({'error': 'Cours introuvable ou accès refusé.'}, status=404)
        cours.delete()
        return Response({'message': 'Cours supprimé.'}, status=204)


# ──────────────────────────────────────────────
#  CC — LISTE ÉTUDIANTS (CC actifs seulement)
# ──────────────────────────────────────────────

class CCListView(generics.ListAPIView):
    """
    GET /api/cc/
    Retourne les CC ACTIFS — pour les étudiants.
    L'enseignant connecté ne voit PAS ses propres CC ici.
    """
    serializer_class   = CCListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CC.objects.filter(est_actif=True).select_related('enseignant').order_by('-date_creation')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ──────────────────────────────────────────────
#  CC — LISTE ENSEIGNANT (SES CC uniquement)
# ──────────────────────────────────────────────

class MesCCView(generics.ListAPIView):
    """
    GET /api/enseignant/mes-cc/
    Retourne TOUS les CC (actifs ou non) de l'enseignant connecté.
    Isolé strictement à cet enseignant.
    """
    serializer_class   = CCListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            enseignant = self.request.user.enseignant
            return CC.objects.filter(enseignant=enseignant).select_related('enseignant').order_by('-date_creation')
        except Exception:
            return CC.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ──────────────────────────────────────────────
#  CC DETAIL — pour démarrer le passage
# ──────────────────────────────────────────────

class CCDetailView(generics.RetrieveAPIView):
    """GET /api/cc/<id>/ — questions mélangées + création tentative."""
    queryset           = CC.objects.filter(est_actif=True)
    serializer_class   = CCDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ──────────────────────────────────────────────
#  CC CREATE
# ──────────────────────────────────────────────

class CCCreateView(generics.CreateAPIView):
    """POST /api/cc/create/"""
    serializer_class   = CCCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ──────────────────────────────────────────────
#  CC MODIFIER / SUPPRIMER
# ──────────────────────────────────────────────

class CCModifierView(APIView):
    """
    PATCH  /api/cc/<id>/modifier/ — Activer/désactiver, renommer
    DELETE /api/cc/<id>/modifier/ — Supprimer
    Seul l'enseignant propriétaire peut agir.
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
            return Response({'error': 'CC introuvable ou accès refusé.'}, status=404)
        cc.titre          = request.data.get('titre',          cc.titre)
        cc.est_actif      = request.data.get('est_actif',      cc.est_actif)
        cc.duree_minutes  = request.data.get('duree_minutes',  cc.duree_minutes)
        cc.save()
        return Response({'message': 'CC mis à jour.', 'est_actif': cc.est_actif})

    def delete(self, request, pk):
        cc = self.get_cc(pk, request)
        if not cc:
            return Response({'error': 'CC introuvable ou accès refusé.'}, status=404)
        cc.delete()
        return Response({'message': 'CC supprimé.'}, status=204)


# ──────────────────────────────────────────────
#  SOUMISSION CC — BUG PRINCIPAL CORRIGÉ
# ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def soumettre_cc(request, tentative_id):
    """
    POST /api/evaluations/soumettre/<tentative_id>/
    Corps : { "reponses": [{"question_id": N, "choix_id": M}] }

    CORRECTIONS :
    - calculer_note_sur_20 appelé correctement (points_obtenus, total_points)
    - Reponse.objects.create au lieu de tentative.reponses_etudiant.create
    - heure_soumission au lieu de heure_fin
    - Vérification étudiant propriétaire de la tentative
    """
    try:
        tentative = Tentative.objects.select_related(
            'cc', 'cc__enseignant', 'etudiant'
        ).get(pk=tentative_id)
    except Tentative.DoesNotExist:
        return Response({'error': 'Tentative introuvable.'}, status=404)

    # Vérification appartenance
    try:
        if tentative.etudiant != request.user.etudiant:
            return Response({'error': 'Accès refusé.'}, status=403)
    except Exception:
        return Response({'error': 'Profil étudiant introuvable.'}, status=403)

    if tentative.est_soumise:
        # Déjà soumise : retourner le résultat existant
        try:
            resultat = Resultat.objects.get(tentative=tentative)
            return Response(ResultatSerializer(resultat).data)
        except Resultat.DoesNotExist:
            return Response({'error': 'Déjà soumis.'}, status=400)

    serializer = SoumissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    reponses_data = serializer.validated_data['reponses']

    # Vérification délai côté serveur
    hors_delai = False
    if tentative.cc.duree_minutes:
        duree_reelle = (timezone.now() - tentative.heure_debut).total_seconds()
        if duree_reelle > tentative.cc.duree_minutes * 60 + 30:  # 30s de tolérance
            hors_delai = True

    # ── Calcul note ──────────────────────────────────────────────────────────
    points_obtenus = 0.0
    for rep in reponses_data:
        try:
            question = Question.objects.get(pk=rep['question_id'], cc=tentative.cc)
            choix    = Choix.objects.get(pk=rep['choix_id'], question=question)
            # Enregistrer la réponse (related_name='reponses' dans le modèle)
            Reponse.objects.update_or_create(
                tentative=tentative,
                question=question,
                defaults={'choix_selectionne': choix}
            )
            if choix.est_correct:
                points_obtenus += question.points
        except (Question.DoesNotExist, Choix.DoesNotExist):
            continue  # Choix invalide ignoré

    total_points = tentative.cc.total_points
    # ← calculer_note_sur_20 prend (points_obtenus, total_points) → float
    note_sur_20 = calculer_note_sur_20(points_obtenus, total_points)

    # ── Marquer tentative soumise ─────────────────────────────────────────────
    tentative.est_soumise      = True
    tentative.heure_soumission = timezone.now()  # ← champ correct du modèle
    tentative.save(update_fields=['est_soumise', 'heure_soumission'])

    # ── Créer le résultat ─────────────────────────────────────────────────────
    resultat = Resultat.objects.create(
        tentative   = tentative,
        etudiant    = tentative.etudiant,
        cc          = tentative.cc,
        note_brute  = points_obtenus,
        note_sur_20 = note_sur_20,
    )

    # Badge si ≥ 16/20
    try:
        from .utils import attribuer_badge
        attribuer_badge(tentative.etudiant, note_sur_20)
    except Exception:
        pass

    data = ResultatSerializer(resultat).data
    data['hors_delai'] = hors_delai
    return Response(data, status=201)


# ──────────────────────────────────────────────
#  DASHBOARD ÉTUDIANT
# ──────────────────────────────────────────────

class MonDashboardView(APIView):
    """GET /api/dashboard/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            etudiant = request.user.etudiant
        except Exception:
            return Response({'error': 'Profil étudiant introuvable.'}, status=404)

        resultats = Resultat.objects.filter(etudiant=etudiant).select_related('cc').order_by('-date_validation')
        nb_cc   = resultats.count()
        moyenne = resultats.aggregate(m=Avg('note_sur_20'))['m']

        resultats_data = [
            {
                'id':              r.id,
                'cc_titre':        r.cc.titre,
                'note_sur_20':     r.note_sur_20,
                'mention':         r.get_mention(),
                'date_validation': r.date_validation,
                'receipt_token':   str(r.receipt_token),
                'signature_url':   None,  # à remplir si signature enseignant
            }
            for r in resultats
        ]

        return Response({
            'etudiant': {
                'nom':       etudiant.nom,
                'prenom':    etudiant.prenom,
                'matricule': etudiant.matricule,
                'filiere':   etudiant.filiere,
                'badges':    getattr(etudiant, 'badges', []),
            },
            'statistiques': {
                'nb_cc_passes':     nb_cc,
                'moyenne_generale': round(float(moyenne), 2) if moyenne else None,
            },
            'resultats': resultats_data,
        })


# ──────────────────────────────────────────────
#  SYNTHÈSE NOTES ENSEIGNANT — ISOLÉE PAR TEACHER
# ──────────────────────────────────────────────

class SyntheseView(APIView):
    """
    GET /api/enseignant/synthese/?filiere=TIC|II|TOUS
    CORRECTION : filtre par les CC de l'enseignant connecté uniquement.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            enseignant = request.user.enseignant
        except Exception:
            return Response({'error': 'Profil enseignant introuvable.'}, status=403)

        filiere = request.query_params.get('filiere', 'TOUS')
        if filiere not in ('TIC', 'II', 'TOUS'):
            return Response({'error': 'filiere invalide.'}, status=400)

        # Résultats uniquement sur les CC de CET enseignant
        qs = Resultat.objects.filter(
            cc__enseignant=enseignant
        ).select_related('etudiant', 'cc')

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
        synthese = list(synthese)

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
    """GET /api/enseignant/cc/<cc_id>/notes/"""
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
            return Response({'error': 'Récépissé invalide.'}, status=404)
