# apps/evaluations/serializers.py
# ─────────────────────────────────────────────────────────────────────────────
# Modification : CCListSerializer — ajout de enseignant_nom
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import serializers
from .models import CC, Question, Choix, Tentative, Resultat

try:
    from apps.cours.models import Cours
except ImportError:
    Cours = None


# ──────────────────────────────────────────────
#  ACCOUNT SERIALIZERS (réexportés ici pour éviter les imports circulaires)
# ──────────────────────────────────────────────

class EtudiantSerializer(serializers.Serializer):
    nom       = serializers.CharField()
    prenom    = serializers.CharField()
    matricule = serializers.CharField()
    filiere   = serializers.CharField()
    badges    = serializers.ListField(child=serializers.CharField(), required=False)


class EtudiantRegisterSerializer(serializers.Serializer):
    matricule = serializers.CharField(max_length=20)
    nom       = serializers.CharField(max_length=100)
    prenom    = serializers.CharField(max_length=100)
    filiere   = serializers.ChoiceField(choices=['TIC', 'II'])
    password  = serializers.CharField(write_only=True, min_length=6)

    def validate_matricule(self, value):
        from apps.accounts.models import Etudiant
        if Etudiant.objects.filter(matricule=value).exists():
            raise serializers.ValidationError('Ce matricule est déjà utilisé.')
        return value

    def create(self, validated_data):
        from apps.accounts.models import User, Etudiant
        matricule = validated_data['matricule']
        user = User.objects.create_user(
            username=matricule,
            password=validated_data['password'],
            role='etudiant',
        )
        etudiant = Etudiant.objects.create(
            user=user,
            matricule=matricule,
            nom=validated_data['nom'],
            prenom=validated_data['prenom'],
            filiere=validated_data['filiere'],
        )
        return etudiant


# ──────────────────────────────────────────────
#  COURS
# ──────────────────────────────────────────────

class CoursListSerializer(serializers.ModelSerializer):
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Cours
        fields = ['id', 'titre', 'description', 'filiere',
                  'fichier_url', 'enseignant_nom', 'date_creation']

    def get_enseignant_nom(self, obj):
        if obj.enseignant:
            return f"{obj.enseignant.prenom} {obj.enseignant.nom}"
        return None


class CoursDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Cours
        fields = ['id', 'titre', 'description', 'filiere',
                  'fichier_url', 'contenu_html', 'date_creation']


# ──────────────────────────────────────────────
#  CC — CHOIX / QUESTION
# ──────────────────────────────────────────────

class ChoixSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Choix
        fields = ['id', 'texte']   # ← PAS est_correct ici (sécurité)


class ChoixAvecReponseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Choix
        fields = ['id', 'texte', 'est_correct']   # ← utilisé seulement pour correction


class QuestionSerializer(serializers.ModelSerializer):
    choix = ChoixSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'enonce', 'points', 'ordre', 'choix']


# ──────────────────────────────────────────────
#  CC LIST — Vue allégée (dashboard étudiant + liste enseignant)
# ──────────────────────────────────────────────

class CCListSerializer(serializers.ModelSerializer):
    """
    Vue allégée pour la liste des CC.
    - est_deja_passe et mon_resultat : contextuels à l'étudiant connecté
    - enseignant_nom : affiché côté étudiant et côté enseignant
    """
    nb_questions    = serializers.IntegerField(source='nombre_questions', read_only=True)
    est_deja_passe  = serializers.SerializerMethodField()
    mon_resultat    = serializers.SerializerMethodField()
    enseignant_nom  = serializers.SerializerMethodField()   # ← AJOUT

    class Meta:
        model  = CC
        fields = [
            'id', 'titre', 'description', 'duree_minutes',
            'nb_questions', 'est_actif', 'date_debut', 'date_fin',
            'est_deja_passe', 'mon_resultat',
            'enseignant_nom',   # ← AJOUT
        ]

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
                'mention':     resultat.get_mention(),
            }
        except Resultat.DoesNotExist:
            return None

    def get_enseignant_nom(self, obj):             # ← AJOUT
        if obj.enseignant:
            return f"{obj.enseignant.prenom} {obj.enseignant.nom}"
        return None


# ──────────────────────────────────────────────
#  CC DETAIL — Inclut les questions mélangées
# ──────────────────────────────────────────────

class CCDetailSerializer(serializers.ModelSerializer):
    """Envoyé au démarrage du CC — crée ou récupère la tentative en cours."""
    questions    = serializers.SerializerMethodField()
    tentative_id = serializers.SerializerMethodField()

    class Meta:
        model  = CC
        fields = ['id', 'titre', 'duree_minutes', 'tentative_id', 'questions']

    def get_tentative_id(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        try:
            etudiant = request.user.etudiant
        except Exception:
            return None
        # Si déjà soumise → None (bloque le passage)
        if Tentative.objects.filter(etudiant=etudiant, cc=obj, est_soumise=True).exists():
            return None
        tentative, _ = Tentative.objects.get_or_create(
            etudiant=etudiant, cc=obj, est_soumise=False
        )
        tentative.heure_debut = tentative.heure_debut or __import__('django.utils.timezone', fromlist=['now']).now()
        tentative.save()
        return tentative.id

    def get_questions(self, obj):
        import random
        questions = list(obj.questions.prefetch_related('choix').all())
        if obj.melange_questions:
            random.shuffle(questions)
        return QuestionSerializer(questions, many=True).data


# ──────────────────────────────────────────────
#  CC CREATE
# ──────────────────────────────────────────────

class CCCreateSerializer(serializers.ModelSerializer):
    class QuestionCreateSerializer(serializers.Serializer):
        class ChoixCreateSerializer(serializers.Serializer):
            texte       = serializers.CharField()
            est_correct = serializers.BooleanField()

        enonce = serializers.CharField()
        points = serializers.FloatField(default=1.0)
        ordre  = serializers.IntegerField(default=0)
        choix  = ChoixCreateSerializer(many=True)

    questions = QuestionCreateSerializer(many=True, write_only=True)

    class Meta:
        model  = CC
        fields = ['id', 'titre', 'description', 'duree_minutes',
                  'melange_questions', 'cours', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        enseignant     = self.context['request'].user.enseignant
        cc = CC.objects.create(enseignant=enseignant, est_actif=False, **validated_data)
        for q_data in questions_data:
            choix_data = q_data.pop('choix')
            question   = Question.objects.create(cc=cc, **q_data)
            for c_data in choix_data:
                Choix.objects.create(question=question, **c_data)
        return cc


# ──────────────────────────────────────────────
#  SOUMISSION
# ──────────────────────────────────────────────

class ReponseSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choix_id    = serializers.IntegerField()


class SoumissionSerializer(serializers.Serializer):
    reponses = ReponseSubmitSerializer(many=True)


# ──────────────────────────────────────────────
#  RÉSULTAT
# ──────────────────────────────────────────────

class ResultatSerializer(serializers.ModelSerializer):
    cc_titre          = serializers.CharField(source='cc.titre', read_only=True)
    mention           = serializers.SerializerMethodField()
    etudiant_matricule= serializers.CharField(source='etudiant.matricule', read_only=True)
    etudiant_filiere  = serializers.CharField(source='etudiant.filiere',   read_only=True)

    class Meta:
        model  = Resultat
        fields = [
            'id', 'cc_titre', 'note_brute', 'note_sur_20',
            'mention', 'date_validation', 'receipt_token',
            'etudiant_matricule', 'etudiant_filiere',
        ]

    def get_mention(self, obj):
        return obj.get_mention()


# ──────────────────────────────────────────────
#  RÉCÉPISSÉ PUBLIC (vérification QR)
# ──────────────────────────────────────────────

class ReceiptVerifySerializer(serializers.Serializer):
    token = serializers.UUIDField()


class ReceiptPublicSerializer(serializers.ModelSerializer):
    cc_titre   = serializers.CharField(source='cc.titre',            read_only=True)
    nom        = serializers.CharField(source='etudiant.nom',         read_only=True)
    prenom     = serializers.CharField(source='etudiant.prenom',      read_only=True)
    matricule  = serializers.CharField(source='etudiant.matricule',   read_only=True)
    filiere    = serializers.CharField(source='etudiant.filiere',     read_only=True)
    mention    = serializers.SerializerMethodField()

    class Meta:
        model  = Resultat
        fields = [
            'cc_titre', 'nom', 'prenom', 'matricule', 'filiere',
            'note_sur_20', 'mention', 'date_validation', 'receipt_token',
        ]

    def get_mention(self, obj):
        return obj.get_mention()