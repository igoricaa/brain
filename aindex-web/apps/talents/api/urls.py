from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'founders', views.FounderViewSet, basename='founder')
