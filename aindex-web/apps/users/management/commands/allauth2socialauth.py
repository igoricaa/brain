from django.core.management.base import BaseCommand
from django.utils.translation import gettext_lazy as _

from users.social_auth import copy_allauth_account_to_social_auth


class Command(BaseCommand):
    help = "Copy allauth account details to python-social-auth"

    def add_arguments(self, parser):
        parser.add_argument('email', nargs="+", type=str)

    def handle(self, *args, **options):
        for email in options['email']:
            copy_allauth_account_to_social_auth(email)

            self.stdout.write(
                self.style.SUCCESS(_('Successfully copied "%(email)s" account info') % {'email': email})
            )
