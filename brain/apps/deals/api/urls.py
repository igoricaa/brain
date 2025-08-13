from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'deals', views.DealViewSet, basename='deal')
router.register(r'drafts', views.DraftDealViewSet, basename='draft-deal')
router.register(r'assessments', views.DealAssessmentViewSet, basename='deal-assessment')
router.register(r'files', views.DealFileViewSet, basename='deal-file')
router.register(r'decks', views.DeckViewSet, basename='deal-deck')
router.register(r'papers', views.PaperViewSet, basename='deal-paper')
router.register(r'du-signals', views.DualUseSignalViewSet, basename='deals-du-signals')
