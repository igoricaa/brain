from rest_framework import routers

from . import views

router = routers.SimpleRouter()
router.register(r'files', views.FileViewSet, basename='file')
router.register(r'papers', views.PaperViewSet, basename='paper')
router.register(r'papers-authors', views.PaperAuthorViewSet, basename='paper-author')
router.register(r'sources', views.SourceViewSet, basename='source')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'document-types', views.DocumentTypeViewSet, basename='document-type')
