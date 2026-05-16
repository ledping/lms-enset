# apps/accounts/views.py

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Etudiant, User
from .serializers import EtudiantRegisterSerializer, EtudiantSerializer


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Inscription d'un nouvel étudiant.
    Pas besoin d'être connecté pour accéder à cette vue.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EtudiantRegisterSerializer(data=request.data)
        if serializer.is_valid():
            etudiant = serializer.save()
            return Response(
                {
                    'message': 'Compte créé avec succès.',
                    'matricule': etudiant.matricule,
                    'filiere': etudiant.filiere,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """
    GET /api/auth/me/
    Retourne le profil de l'utilisateur connecté.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            etudiant = user.etudiant
            return Response({
                'role': 'etudiant',
                'nom': etudiant.nom,
                'prenom': etudiant.prenom,
                'matricule': etudiant.matricule,
                'filiere': etudiant.filiere,
                'avatar': etudiant.avatar,
                'badges': etudiant.badges,
            })
        except Exception:
            pass

        try:
            enseignant = user.enseignant
            return Response({
                'role': 'enseignant',
                'nom': enseignant.nom,
                'prenom': enseignant.prenom,
            })
        except Exception:
            pass

        return Response({'role': 'admin', 'username': user.username})