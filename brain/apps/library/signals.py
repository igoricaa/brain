from django.dispatch import Signal

#: Signal emitted after text has been extracted from a paper.
#: Provides ``sender`` class (Paper) and corresponding ``instance`` object.
paper_text_extraction_done = Signal()
