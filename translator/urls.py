from django.urls import path
from . import views

app_name = 'translator'

urlpatterns = [
    path('', views.home, name='home'),
    path('translate/', views.translate_text, name='translate'),
    path('history/', views.history, name='history'),
]