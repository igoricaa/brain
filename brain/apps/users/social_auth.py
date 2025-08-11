from allauth.socialaccount.models import SocialAccount as AllauthSocialAccount
from social_django.models import UserSocialAuth


def copy_allauth_account_to_social_auth(email):
    """Copy login details from allauth to django social app (python-social-auth)"""
    allauth_account = AllauthSocialAccount.objects.get(provider='google', user__email=email)

    allauth_token = allauth_account.socialtoken_set.order_by('-expires_at').first()

    if not allauth_token:
        raise ValueError('Allauth token not found.')

    user_social_auth, created = UserSocialAuth.objects.update_or_create(
        provider='google-oauth2',
        uid=allauth_account.user.email,
        defaults={
            'user': allauth_account.user,
            'extra_data': {
                'access_token': allauth_token.token,
                'refresh_token': allauth_token.token_secret,
            },
        },
    )

    return user_social_auth
