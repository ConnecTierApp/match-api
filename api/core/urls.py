from rest_framework.routers import DefaultRouter

from .views import (
    DocumentChunkViewSet,
    DocumentViewSet,
    EntityViewSet,
    MatchFeatureViewSet,
    MatchViewSet,
    MatchingJobTargetViewSet,
    MatchingJobViewSet,
    MatchingTemplateViewSet,
)

app_name = "core"

router = DefaultRouter()
router.register(r"entities", EntityViewSet)
router.register(r"documents", DocumentViewSet)
router.register(r"chunks", DocumentChunkViewSet)
router.register(r"matching-templates", MatchingTemplateViewSet)
router.register(r"matching-jobs", MatchingJobViewSet)
router.register(r"matching-job-targets", MatchingJobTargetViewSet)
router.register(r"matches", MatchViewSet)
router.register(r"match-features", MatchFeatureViewSet)

urlpatterns = router.urls
