from django.db import models
from apps.accounts.models import Enseignant


class Cours(models.Model):
    FILIERE_CHOICES = [('TIC', 'TIC'), ('II', 'II'), ('TOUS', 'Tous')]

    titre        = models.CharField(max_length=200)
    description  = models.TextField(blank=True)
    contenu_html = models.TextField(blank=True)    # ← Contenu des HTML existants
    fichier_url  = models.URLField(blank=True)     # PDF Cloudinary
    enseignant   = models.ForeignKey(Enseignant, on_delete=models.CASCADE)
    filiere      = models.CharField(max_length=4, choices=FILIERE_CHOICES, default='TOUS')
    date_creation = models.DateTimeField(auto_now_add=True)
    est_publie   = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name_plural = "Cours"

    def __str__(self):
        return self.titre