from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'deals', views.DealViewSet, basename='deal')
router.register(r'decks', views.DeckViewSet, basename='deck')
router.register(r'industries', views.IndustryViewSet, basename='deals-industry')
router.register(r'du-signals', views.DualUseSignalViewSet, basename='deals-du-signals')
