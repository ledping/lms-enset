from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Etudiant, Enseignant


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display  = ['username', 'email', 'role', 'is_staff', 'is_active']
    list_filter   = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email']
    fieldsets     = UserAdmin.fieldsets + (
        ('Rôle ENSET', {'fields': ('role',)}),
    )


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display  = ['matricule', 'nom', 'prenom', 'filiere', 'user']
    list_filter   = ['filiere']
    search_fields = ['matricule', 'nom', 'prenom']
    readonly_fields = ['badges']


@admin.register(Enseignant)
class EnseignantAdmin(admin.ModelAdmin):
    list_display  = ['nom', 'prenom', 'user']
    search_fields = ['nom', 'prenom']