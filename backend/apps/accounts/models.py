import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [('etudiant', 'Étudiant'), ('enseignant', 'Enseignant')]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='etudiant')

    class Meta:
        verbose_name = "Utilisateur"


class Etudiant(models.Model):
    FILIERE_CHOICES = [('TIC', 'TIC'), ('II', 'Informatique Industrielle')]

    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='etudiant')
    nom        = models.CharField(max_length=100)
    prenom     = models.CharField(max_length=100)
    matricule  = models.CharField(max_length=20, unique=True)
    filiere    = models.CharField(max_length=3, choices=FILIERE_CHOICES)
    avatar     = models.URLField(blank=True)        # Cloudinary
    badges     = models.JSONField(default=list)     # Ex: ["Excellent", "Assidu"]

    def __str__(self):
        return f"{self.matricule} — {self.nom} {self.prenom} ({self.filiere})"


class Enseignant(models.Model):
    user      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='enseignant')
    nom       = models.CharField(max_length=100)
    prenom    = models.CharField(max_length=100)
    signature = models.URLField(blank=True)         # Cloudinary — signature numérique PDF

    def __str__(self):
        return f"Prof. {self.nom} {self.prenom}"