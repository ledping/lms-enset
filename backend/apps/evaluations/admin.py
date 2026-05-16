from django.contrib import admin
from .models import CC, Question, Choix, Tentative, Resultat


class ChoixInline(admin.TabularInline):
    model  = Choix
    extra  = 4
    fields = ['texte', 'est_correct']


class QuestionInline(admin.StackedInline):
    model       = Question
    extra       = 1
    fields      = ['enonce', 'points', 'ordre']
    show_change_link = True


@admin.register(CC)
class CCAdmin(admin.ModelAdmin):
    list_display  = ['titre', 'enseignant', 'duree_minutes', 'est_actif',
                     'nombre_questions', 'date_creation']
    list_filter   = ['est_actif']
    list_editable = ['est_actif']
    search_fields = ['titre']
    inlines       = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['enonce', 'cc', 'points', 'ordre']
    list_filter  = ['cc']
    inlines      = [ChoixInline]


@admin.register(Resultat)
class ResultatAdmin(admin.ModelAdmin):
    list_display  = ['etudiant', 'cc', 'note_sur_20', 'date_validation']
    list_filter   = ['cc']
    search_fields = ['etudiant__matricule', 'etudiant__nom']
    readonly_fields = ['receipt_token', 'note_brute', 'note_sur_20', 'date_validation']


@admin.register(Tentative)
class TentativeAdmin(admin.ModelAdmin):
    list_display = ['etudiant', 'cc', 'est_soumise', 'heure_debut']
    list_filter  = ['est_soumise', 'cc']