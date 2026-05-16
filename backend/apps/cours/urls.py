# apps/cours/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('cours/',                   views.CoursListView.as_view(),   name='cours-list'),
    path('cours/<int:pk>/',          views.CoursDetailView.as_view(), name='cours-detail'),
    path('cours/upload/',            views.CoursUploadView.as_view(), name='cours-upload'),
    path('cours/<int:pk>/modifier/', views.CoursUpdateView.as_view(), name='cours-update'),
]