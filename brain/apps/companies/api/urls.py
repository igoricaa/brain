from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'companies', views.CompanyViewSet, basename='company')
router.register(r'founders', views.FounderViewSet, basename='founder')
router.register(r'advisors', views.AdvisorViewSet, basename='advisor')
router.register(r'grants', views.GrantViewSet, basename='grant')
router.register(r'clinical-studies', views.ClinicalStudyViewSet, basename='clinical-study')
router.register(r'patent-applications', views.PatentApplicationViewSet, basename='patent-application')
router.register(r'ipo-statuses', views.IPOStatusViewSet, basename='ipo-status')
router.register(r'investor-types', views.InvestorTypeViewSet, basename='investor-type')
router.register(r'funding-types', views.FundingTypeViewSet, basename='funding-type')
router.register(r'funding-stages', views.FundingStageViewSet, basename='funding-stage')
router.register(r'technology-types', views.TechnologyTypeViewSet, basename='technology-type')
router.register(r'industries', views.IndustryViewSet, basename='industry')
