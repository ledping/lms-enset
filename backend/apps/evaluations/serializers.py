# apps/evaluations/serializers.py
# ─── Serializers complets pour l'API Django REST Framework ───────────────────

from django.utils import timezone
from rest_framework import serializers
from .models import CC, Question, Choix, Tentative, Reponse, Resultat
from apps.accounts.models import Etudiant, Enseignant
from apps.cours.models import Cours


# ──────────────────────────────────────────────
#  ACCOUNTS
# ──────────────────────────────────────────────

class EtudiantSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Etudiant
        fields = ['id', 'nom', 'prenom', 'matricule', 'filiere', 'avatar', 'badges', 'email']
        read_only_fields = ['badges']


class EtudiantRegisterSerializer(serializers.Serializer):
    """Inscription étudiant : crée User + Etudiant en une seule opération."""
    nom       = serializers.CharField(max_length=100)
    prenom    = serializers.CharField(max_length=100)
    email     = serializers.EmailField()
    matricule = serializers.CharField(max_length=20)
    filiere   = serializers.ChoiceField(choices=['TIC', 'II'])
    password  = serializers.CharField(write_only=True, min_length=8)

    def validate_matricule(self, value):
        if Etudiant.objects.filter(matricule=value).exists():
            raise serializers.ValidationError("Ce matricule est déjà utilisé.")
        return value

    def validate_email(self, value):
        from apps.accounts.models import User
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà enregistré.")
        return value

    def create(self, validated_data):
        from apps.accounts.models import User
        user = User.objects.create_user(
            username=validated_data['matricule'],
            email=validated_data['email'],
            password=validated_data['password'],
            role='etudiant'
        )
        etudiant = Etudiant.objects.create(
            user=user,
            nom=validated_data['nom'],
            prenom=validated_data['prenom'],
            matricule=validated_data['matricule'],
            filiere=validated_data['filiere'],
        )
        return etudiant


# ──────────────────────────────────────────────
#  COURS
# ──────────────────────────────────────────────

class CoursListSerializer(serializers.ModelSerializer):
    """Vue allégée pour la liste des cours (dashboard étudiant)."""
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Cours
        fields = ['id', 'titre', 'description', 'filiere',
                  'fichier_url', 'enseignant_nom', 'date_creation']

    def get_enseignant_nom(self, obj):
        return f"{obj.enseignant.prenom} {obj.enseignant.nom}"


class CoursDetailSerializer(serializers.ModelSerializer):
    """Inclut le contenu HTML complet (cours interactifs)."""
    class Meta:
        model  = Cours
        fields = '__all__'


# ──────────────────────────────────────────────
#  CC & QUESTIONS
# ──────────────────────────────────────────────

class ChoixSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Choix
        fields = ['id', 'texte']
        # ⚠️ est_correct intentionnellement EXCLU → pas de fuite de réponses


class ChoixAvecReponseSerializer(serializers.ModelSerializer):
    """Utilisé uniquement dans les vues enseignant (correction)."""
    class Meta:
        model  = Choix
        fields = ['id', 'texte', 'est_correct']


class QuestionSerializer(serializers.ModelSerializer):
    choix = ChoixSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'enonce', 'points', 'ordre', 'choix']


class CCListSerializer(serializers.ModelSerializer):
    """Vue allégée pour la liste des CC (dashboard étudiant)."""
    nb_questions    = serializers.IntegerField(source='nombre_questions', read_only=True)
    est_deja_passe  = serializers.SerializerMethodField()
    mon_resultat    = serializers.SerializerMethodField()

    class Meta:
        model  = CC
        fields = ['id', 'titre', 'description', 'duree_minutes',
                  'nb_questions', 'est_actif', 'date_debut', 'date_fin',
                  'est_deja_passe', 'mon_resultat']

    def get_est_deja_passe(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            etudiant = request.user.etudiant
        except Exception:
            return False
        return Tentative.objects.filter(
            etudiant=etudiant, cc=obj, est_soumise=True
        ).exists()

    def get_mon_resultat(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            etudiant = request.user.etudiant
            resultat = Resultat.objects.get(tentative__etudiant=etudiant, cc=obj)
            return {
                'note_sur_20': resultat.note_sur_20,
                'mention': resultat.get_mention(),
            }
        except Resultat.DoesNotExist:
            return None


class CCDetailSerializer(serializers.ModelSerializer):
    """Inclut les questions mélangées — envoyé au démarrage du CC."""
    questions = serializers.SerializerMethodField()
    tentative_id = serializers.SerializerMethodField()

    class Meta:
        model  = CC
        fields = ['id', 'titre', 'duree_minutes', 'tentative_id', 'questions']

    def get_questions(self, obj):
        import random
        qs = list(obj.questions.prefetch_related('choix').all())
        if obj.melange_questions:
            random.shuffle(qs)
        return QuestionSerializer(qs, many=True).data

    def get_tentative_id(self, obj):
        """Crée ou récupère la tentative en cours."""
        request = self.context.get('request')
        if not request:
            return None
        try:
            etudiant = request.user.etudiant
            tentative, created = Tentative.objects.get_or_create(
                etudiant=etudiant, cc=obj,
                defaults={}
            )
            if tentative.est_soumise:
                return None  # Déjà soumise, pas de nouvel accès
            if tentative.est_expiree:
                return None  # Délai dépassé
            return tentative.id
        except Exception:
            return None


class CCCreateSerializer(serializers.ModelSerializer):
    """Création d'un CC par l'enseignant avec ses questions."""

    class QuestionCreateSerializer(serializers.Serializer):
        enonce = serializers.CharField()
        points = serializers.FloatField(default=1.0)
        choix  = serializers.ListField(child=serializers.DictField())

    questions = QuestionCreateSerializer(many=True, write_only=True)

    class Meta:
        model  = CC
        fields = ['id', 'titre', 'description', 'cours', 'duree_minutes',
                  'date_debut', 'date_fin', 'melange_questions', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        request = self.context.get('request')
        cc = CC.objects.create(
            enseignant=request.user.enseignant,
            **validated_data
        )
        for i, q_data in enumerate(questions_data):
            choix_data = q_data.pop('choix', [])
            question = Question.objects.create(cc=cc, ordre=i, **q_data)
            for c_data in choix_data:
                Choix.objects.create(question=question, **c_data)
        return cc


# ──────────────────────────────────────────────
#  SOUMISSION & RÉSULTAT
# ──────────────────────────────────────────────

class ReponseSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choix_id    = serializers.IntegerField()


class SoumissionSerializer(serializers.Serializer):
    """Corps de la requête POST /api/evaluations/soumettre/<tentative_id>/"""
    reponses = ReponseSubmitSerializer(many=True)


class ResultatSerializer(serializers.ModelSerializer):
    mention              = serializers.SerializerMethodField()
    etudiant_nom         = serializers.SerializerMethodField()
    etudiant_matricule   = serializers.CharField(source='etudiant.matricule', read_only=True)
    etudiant_filiere     = serializers.CharField(source='etudiant.filiere', read_only=True)
    cc_titre             = serializers.CharField(source='cc.titre', read_only=True)
    signature_url        = serializers.SerializerMethodField()

    class Meta:
        model  = Resultat
        fields = [
            'id', 'note_sur_20', 'mention', 'date_validation',
            'receipt_token',
            'etudiant_nom', 'etudiant_matricule', 'etudiant_filiere',
            'cc_titre', 'signature_url',
        ]

    def get_mention(self, obj):
        return obj.get_mention()

    def get_etudiant_nom(self, obj):
        return f"{obj.etudiant.prenom} {obj.etudiant.nom}"

    def get_signature_url(self, obj):
        return obj.cc.enseignant.signature or None


# ──────────────────────────────────────────────
#  VÉRIFICATION QR CODE
# ──────────────────────────────────────────────

class ReceiptVerifySerializer(serializers.Serializer):
    """
    GET /api/receipts/verify/<token>/
    Retourne les infos du résultat pour vérification du QR Code.
    """
    token = serializers.UUIDField()


class ReceiptPublicSerializer(serializers.ModelSerializer):
    """Données exposées publiquement via le QR Code (pas de note brute)."""
    nom_etudiant = serializers.SerializerMethodField()
    cc_titre     = serializers.CharField(source='cc.titre', read_only=True)
    mention      = serializers.SerializerMethodField()

    class Meta:
        model  = Resultat
        fields = ['nom_etudiant', 'cc_titre', 'note_sur_20', 'mention', 'date_validation']

    def get_nom_etudiant(self, obj):
        return f"{obj.etudiant.prenom} {obj.etudiant.nom.upper()}"

    def get_mention(self, obj):
        return obj.get_mention()


# ──────────────────────────────────────────────
#  SYNTHÈSE ENSEIGNANT
# ──────────────────────────────────────────────

class SyntheseEtudiantSerializer(serializers.Serializer):
    """Retourné par utils.get_synthese_filiere() — exportable en Excel."""
    matricule         = serializers.CharField()
    nom               = serializers.CharField()
    prenom            = serializers.CharField()
    filiere           = serializers.CharField()
    moyenne_generale  = serializers.FloatField()
    nb_cc_passes      = serializers.IntegerField()
    mention           = serializers.SerializerMethodField()

    def get_mention(self, obj):
        n = obj.get('moyenne_generale', 0) or 0
        if n >= 16: return "Très Bien"
        if n >= 14: return "Bien"
        if n >= 12: return "Assez Bien"
        if n >= 10: return "Passable"
        return "Insuffisant"