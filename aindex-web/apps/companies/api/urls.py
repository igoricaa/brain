from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'companies', views.CompanyViewSet, basename='company')
router.register(r'grants', views.GrantViewSet, basename='grant')
router.register(r'clinical-studies', views.ClinicalStudyViewSet, basename='clinical-study')
router.register(r'patent-applications', views.PatentApplicationViewSet, basename='patent-application')
