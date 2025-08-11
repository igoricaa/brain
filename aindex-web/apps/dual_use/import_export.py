from django.db import transaction

from import_export import resources
from import_export.resources import modelresource_factory
from talents.models import Founder
from talents.tasks import pull_founder_data

from .models import Report


class BaseReportResource(resources.ModelResource):

    class Meta:
        model = Report
        clean_model_instances = True
        store_instance = True

    def __init__(self, user=None, **kwargs):
        super().__init__(**kwargs)
        self.user = user

    def before_save_instance(self, instance, row, **kwargs):
        super().before_save_instance(instance, row, **kwargs)

        if not instance.cb_url:
            instance.cb_url = None

        if self.user and not instance.id and not instance.creator:
            instance.creator = self.user

    def after_import_row(self, row, row_result, **kwargs):

        dry_run = kwargs.get('dry_run', True)

        # Create report's founders objects
        founders_list = row.get('founders', [])
        report = row_result.instance
        company = getattr(report, 'company', None)

        if founders_list and company and not dry_run:
            if isinstance(founders_list, str):
                founders = [f.strip() for f in founders_list.split(',')]

            founders = []
            for founder_name in founders_list:

                founder, founder_created = Founder.objects.update_or_create(
                    company=company,
                    name=founder_name,
                    defaults={
                        'company': company,
                        'name': founder_name,
                    }
                )
                founders.append(founder)

            transaction.on_commit(lambda: self.pull_extra_data(founders=founders))

    @classmethod
    def pull_founders_data(cls, founders):
        for founder in founders:
            pull_founder_data.delay(pk=founder.id)

    def pull_extra_data(self, founders):
        self.pull_founders_data(founders)


class ReportResource(BaseReportResource):

    class Meta(BaseReportResource.Meta):
        import_id_fields = ('cb_url', 'year_evaluated')


class ReportAdminResource(BaseReportResource):

    grants_count = resources.Field(readonly=True)
    technology_type_name = resources.Field(attribute='technology_type__name')
    ipo_status_name = resources.Field(attribute='ipo_status__name')
    funding_stage_name = resources.Field(attribute='funding_stage__name')
    last_funding_type_name = resources.Field(attribute='last_funding_type__name')
    last_equity_funding_type_name = resources.Field(attribute='last_equity_funding_type__name')
    industries_names = resources.Field(readonly=True)

    def dehydrate_grants_count(self, obj):
        try:
            return obj.grants_count
        except AttributeError:
            return None

    def dehydrate_industries_names(self, obj):
        try:
            return ','.join(industry.name for industry in obj.industries.all())
        except AttributeError:
            return None


class ImportMixin:
    resource_class = None

    def get_resource_kwargs(self, **kwargs):
        return kwargs

    def get_resource_class(self):
        model = getattr(self, 'model', None)
        if not self.resource_class and model:
            return modelresource_factory(model)

        return self.resource_class

    def get_resource(self, **kwargs):
        resource_class = self.get_resource_class()
        resource_kwargs = self.get_resource_kwargs(**kwargs)
        return resource_class(**resource_kwargs)
