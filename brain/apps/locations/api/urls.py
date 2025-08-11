from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'states', views.StateViewSet, basename='state')
router.register(r'cities', views.CityViewSet, basename='city')
