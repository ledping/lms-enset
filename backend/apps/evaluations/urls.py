# apps/evaluations/urls.py
# ─────────────────────────────────────────────────────────────────────────────
# Toutes les routes du frontend — CC + Cours + Dashboard + Enseignant + Récépissés
# ─────────────────────────────────────────────────────────────────────────────

from django.urls import path
from . import views

urlpatterns = [

    # ── Cours ────────────────────────────────────────────────────────────────
    path('cours/',                views.CoursListView.as_view(),   name='cours-list'),
    path('cours/<int:pk>/',       views.CoursDetailView.as_view(), name='cours-detail'),
    path('cours/upload/',         views.CoursCreateView.as_view(), name='cours-upload'),

    # ── CC ───────────────────────────────────────────────────────────────────
    path('cc/',                   views.CCListView.as_view(),      name='cc-list'),
    path('cc/create/',            views.CCCreateView.as_view(),    name='cc-create'),
    path('cc/<int:pk>/',          views.CCDetailView.as_view(),    name='cc-detail'),
    path('cc/<int:pk>/modifier/', views.CCModifierView.as_view(),  name='cc-modifier'),   # ← NOUVEAU

    # ── Passage CC ───────────────────────────────────────────────────────────
    path('evaluations/soumettre/<int:tentative_id>/',
         views.soumettre_cc, name='soumettre-cc'),

    # ── Dashboard étudiant ───────────────────────────────────────────────────
    path('dashboard/',            views.MonDashboardView.as_view(), name='dashboard'),

    # ── Synthèse enseignant ──────────────────────────────────────────────────
    path('enseignant/synthese/',              views.SyntheseView.as_view(),     name='synthese'),
    path('enseignant/cc/<int:cc_id>/notes/',  views.NotesParCCView.as_view(),   name='notes-par-cc'),

    # ── Vérification récépissé (QR code) ────────────────────────────────────
    path('receipts/verify/<uuid:token>/',    views.VerifyReceiptView.as_view(), name='verify-receipt'),
]