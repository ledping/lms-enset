# apps/accounts/serializers.py

from rest_framework import serializers
from .models import Etudiant, User


class EtudiantRegisterSerializer(serializers.Serializer):
    """Inscription étudiant — crée User + Etudiant en une seule opération."""
    nom       = serializers.CharField(max_length=100)
    prenom    = serializers.CharField(max_length=100)
    email     = serializers.EmailField()
    matricule = serializers.CharField(max_length=20)
    filiere   = serializers.ChoiceField(choices=['TIC', 'II'])
    password  = serializers.CharField(write_only=True, min_length=6)

    def validate_matricule(self, value):
        if Etudiant.objects.filter(matricule=value).exists():
            raise serializers.ValidationError("Ce matricule est déjà utilisé.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà enregistré.")
        return value

    def create(self, validated_data):
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


class EtudiantSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model  = Etudiant
        fields = ['id', 'nom', 'prenom', 'matricule', 'filiere',
                  'avatar', 'badges', 'email']
        read_only_fields = ['badges']