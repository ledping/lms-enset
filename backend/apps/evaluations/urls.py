# apps/evaluations/urls.py — VERSION CORRIGÉE
# Corrections :
# - cours/upload/ pointe vers CoursUploadView (gère multipart)
# - cours/<id>/modifier/ pour suppression
# - enseignant/mes-cc/ nouvel endpoint isolé par teacher

from django.urls import path
from . import views

urlpatterns = [

    # ── Cours ─────────────────────────────────────────────────────────────────
    path('cours/',                    views.CoursListView.as_view(),    name='cours-list'),
    path('cours/upload/',             views.CoursUploadView.as_view(),  name='cours-upload'),
    path('cours/<int:pk>/',           views.CoursDetailView.as_view(),  name='cours-detail'),
    path('cours/<int:pk>/modifier/',  views.CoursModifierView.as_view(),name='cours-modifier'),

    # ── CC (étudiants — actifs uniquement) ────────────────────────────────────
    path('cc/',                       views.CCListView.as_view(),       name='cc-list'),
    path('cc/create/',                views.CCCreateView.as_view(),     name='cc-create'),
    path('cc/<int:pk>/',              views.CCDetailView.as_view(),     name='cc-detail'),
    path('cc/<int:pk>/modifier/',     views.CCModifierView.as_view(),   name='cc-modifier'),

    # ── Passage CC ────────────────────────────────────────────────────────────
    path('evaluations/soumettre/<int:tentative_id>/',
         views.soumettre_cc, name='soumettre-cc'),

    # ── Dashboard étudiant ────────────────────────────────────────────────────
    path('dashboard/',                views.MonDashboardView.as_view(), name='dashboard'),

    # ── Enseignant — isolé par teacher ────────────────────────────────────────
    path('enseignant/mes-cc/',                   views.MesCCView.as_view(),       name='mes-cc'),
    path('enseignant/synthese/',                 views.SyntheseView.as_view(),    name='synthese'),
    path('enseignant/cc/<int:cc_id>/notes/',     views.NotesParCCView.as_view(),  name='notes-par-cc'),

    # ── Récépissé ─────────────────────────────────────────────────────────────
    path('receipts/verify/<uuid:token>/',        views.VerifyReceiptView.as_view(), name='verify-receipt'),
]
