from django.contrib import admin
from .models import Cours


@admin.register(Cours)
class CoursAdmin(admin.ModelAdmin):
    list_display  = ['titre', 'enseignant', 'filiere', 'est_publie', 'date_creation']
    list_filter   = ['filiere', 'est_publie']
    search_fields = ['titre']
    list_editable = ['est_publie']