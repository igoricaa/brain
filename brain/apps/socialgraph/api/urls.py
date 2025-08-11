from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'experiences', views.ExperienceViewSet, basename='experience')
router.register(r'educations', views.EducationViewSet, basename='education')
