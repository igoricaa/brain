from pathlib import Path

from django.core.files import File
from django.db import models


class MailboxDeckManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(is_from_mailbox=True)

    def import_message(self, message):
        # ignore outbound messages
        if message.outgoing:
            return

        attachments = message.attachments.all()

        for attachment in attachments:
            file_name = Path(attachment.get_filename() or Path(attachment.document.name).name)

            file_suffix = file_name.suffix
            if not file_suffix.lower().endswith(self.model.PDF_EXTENSION):
                continue

            # Truncate a long filename
            file_name = f'{file_name.stem[:100]}{file_suffix}'

            with attachment.document.open('rb') as attachment_file:
                deck = self.model(
                    file_format=self.model.PDF,
                    file=File(attachment_file, name=file_name),
                    is_from_mailbox=True,
                    extras={
                        'mailbox': {'id': message.mailbox_id, 'message_id': message.id, 'attachment_id': attachment.id}
                    },
                )
                deck.save()

                # create only one deck per message and return
                return deck
