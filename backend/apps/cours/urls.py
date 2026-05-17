# apps/cours/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('cours/',          views.CoursListView.as_view(),   name='cours-list'),
    path('cours/<int:pk>/', views.CoursDetailView.as_view(), name='cours-detail'),
]