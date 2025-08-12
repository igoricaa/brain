from rest_framework import routers

from .views import DualUseSummaryViewSet

router = routers.SimpleRouter()
router.register(r'', DualUseSummaryViewSet, basename='dual-use')

