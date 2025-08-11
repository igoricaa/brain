from companies.api.urls import router as companies_router
from deals.api.urls import router as deals_router
from locations.api.urls import router as locations_router
from rest_framework import routers
from talents.api.urls import router as talents_router


class DefaultRouter(routers.DefaultRouter):
    """A custom DefaultRouter which allows adding URLS from other routers with under common prefix"""

    def include_router(self, prefix, router):
        """

        Args
            prefix (str):
                Path prefix for the added URLs

            router (routers.BaseRouter):
                A router instance to be included.
        """
        self.registry.extend([(prefix + url, viewset, basename) for url, viewset, basename in router.registry])


router = DefaultRouter()
router.include_router(r'companies/', companies_router)
router.include_router(r'deals/', deals_router)
router.include_router(r'locations/', locations_router)
router.include_router(r'talents/', talents_router)
