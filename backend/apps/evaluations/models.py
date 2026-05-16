import uuid
from django.db import models
from django.utils import timezone
from apps.accounts.models import Etudiant, Enseignant
from apps.cours.models import Cours


class CC(models.Model):
    """Contrôle Continu — QCM avec chronomètre."""
    titre          = models.CharField(max_length=200)
    description    = models.TextField(blank=True)
    cours          = models.ForeignKey(Cours, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='cc_list')
    enseignant     = models.ForeignKey(Enseignant, on_delete=models.CASCADE)
    duree_minutes  = models.PositiveIntegerField(default=30)
    date_debut     = models.DateTimeField(null=True, blank=True)  # Activation planifiée
    date_fin       = models.DateTimeField(null=True, blank=True)  # Clôture planifiée
    est_actif      = models.BooleanField(default=False)
    melange_questions = models.BooleanField(default=True)         # Questions aléatoires
    date_creation  = models.DateTimeField(auto_now_add=True)

    @property
    def total_points(self):
        return sum(q.points for q in self.questions.all())

    @property
    def nombre_questions(self):
        return self.questions.count()

    def __str__(self):
        return f"CC — {self.titre}"


class Question(models.Model):
    cc      = models.ForeignKey(CC, on_delete=models.CASCADE, related_name='questions')
    enonce  = models.TextField()
    points  = models.FloatField(default=1.0)
    ordre   = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordre']


class Choix(models.Model):
    question    = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choix')
    texte       = models.CharField(max_length=500)
    est_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']


class Tentative(models.Model):
    """Une session d'examen — une seule par étudiant/CC."""
    etudiant         = models.ForeignKey(Etudiant, on_delete=models.CASCADE)
    cc               = models.ForeignKey(CC, on_delete=models.CASCADE)
    heure_debut      = models.DateTimeField(auto_now_add=True)
    heure_soumission = models.DateTimeField(null=True, blank=True)
    est_soumise      = models.BooleanField(default=False)
    # Délai limite côté serveur : heure_debut + cc.duree_minutes
    # ⚠️  La soumission est rejetée si heure_soumission > deadline

    class Meta:
        unique_together = ['etudiant', 'cc']   # Un seul passage autorisé
        verbose_name = "Tentative"

    @property
    def deadline(self):
        from datetime import timedelta
        return self.heure_debut + timedelta(minutes=self.cc.duree_minutes)

    @property
    def est_expiree(self):
        return timezone.now() > self.deadline


class Reponse(models.Model):
    tentative        = models.ForeignKey(Tentative, on_delete=models.CASCADE, related_name='reponses')
    question         = models.ForeignKey(Question, on_delete=models.CASCADE)
    choix_selectionne = models.ForeignKey(Choix, on_delete=models.SET_NULL,
                                          null=True, blank=True)

    class Meta:
        unique_together = ['tentative', 'question']


class Resultat(models.Model):
    """Résultat final calculé côté serveur — source de vérité."""
    tentative        = models.OneToOneField(Tentative, on_delete=models.CASCADE)
    etudiant         = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='resultats')
    cc               = models.ForeignKey(CC, on_delete=models.CASCADE, related_name='resultats')
    note_brute       = models.FloatField()    # Points obtenus / total_points
    note_sur_20      = models.FloatField()    # Ramenée sur 20
    date_validation  = models.DateTimeField(auto_now_add=True)

    # Token unique pour vérification QR Code
    receipt_token    = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        ordering = ['-date_validation']

    def __str__(self):
        return f"{self.etudiant.matricule} | {self.cc.titre} | {self.note_sur_20:.2f}/20"

    def get_mention(self):
        n = self.note_sur_20
        if n >= 16: return "Très Bien"
        if n >= 14: return "Bien"
        if n >= 12: return "Assez Bien"
        if n >= 10: return "Passable"
        return "Insuffisant"