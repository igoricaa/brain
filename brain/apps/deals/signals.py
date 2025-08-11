from django.dispatch import receiver

from django_mailbox.signals import message_received

__all__ = ['handle_mailbox_message']


@receiver(message_received)
def handle_mailbox_message(sender, message, **args):
    # check email has a deck that needs to be processed

    # import_deck_from_mailbox_message.delay(pk=message.id)
    pass
