======
AINdex
======

Pitch decks processing.

Mostly based on Python and GCP.

Installation
============
This package can be installed using typical procedures used to install a standard
Python packages.

It is highly recommended for the installation to be done within a Python
virtual environment in order to simplify dependency management.

Dependencies
------------

You may need to install system dependencies for building some Python dependencies.

For example on Ubuntu run

.. code-block:: bash

    sudo apt install build-essential python3-dev

You may also need to install some `image processing dependencies`_

.. code-block: bash

    sudo apt-get install libtiff5-dev libjpeg8-dev zlib1g-dev libfreetype6-dev



Installing the packaage
-----------------------

1. Download the source code.
   If you are Git you can do something like ...

.. code-block:: bash

    git clone git@github.com:AIN-ventures/monorepo.git

2. Go to the AINdex root directory

.. code-block:: bash

    cd monorepo/aindex/

3. Install aindex

.. code-block:: bash

    pip install -e .



Configuration
=============

Some settings need to be configured in order for some functionalities to work properly.
This include configuration related to GCP authentication.

These configuration can be set by setting system environment variables or by adding them to a
`.env` file at the project base directory.

.env content could look like

.. code-block:: bash

    GOOGLE_APPLICATION_CREDENTIALS="/path/to/gcp-key.json"
    GOOGLE_OCR_PROJECT_ID="your-gcp-project-id"
    GOOGLE_OCR_REGION="us"
    GOOGLE_OCR_PROCESSOR_ID="your-documentai-processor-id"
    GOOGLE_OCR_PREDICTION_ENDPOINT="https://us-documentai.googleapis.com/v1/projects/blah.../..:process"
    GOOGLE_OCR_INPUT_GCS='gs://bucket-name/default/path/to/input/'
    GOOGLE_OCR_OUTPUT_GCS='gs://bucket-name/default/path/to/output/'


Basic Usage
===========

Usage as a Python library
-------------------------
After installation, ``aindex`` can be imported and used from external
python code as a python library.

For example

.. code-block:: python

    from aindex.parsers import DocAIPDFDeckParser, # PDFMinerDeckParser, get_pdf_parser_class

    deck_source = '/path/to/dec.pdf'  # OR 'gs://bucket-name/path/to/deck.pdf'

    parser = DocAIPDFDeckParser(deck_source)
    # parser = PDFMinerDeckParser(deck_source)
    # OR
    # parser_class = get_pdf_parser_class('documentai')
    # parser_class = get_pdf_parser_class('pdfminer')
    # parser = parser_class(deck_source)

    # extract text
    text = parser.extract_text()
    print(text)

    # extract text per page
    for page_data in parser.read_pages():
         print(page_data)


Usage through Command Line Interface (CLI)
-------------------------------------------

After installation a command line interface will be available via ``aindex`` command on  the terminal.
To get more details on any sub-command you can just add  ``--help`` on that sub-command.

.. code-block:: bash

    aindex --help

To extract text from PDF use ``aindex pdf extraxt-text``

.. code-block:: bash

    aindex pdf extract-text /path/to/deck.pdf

By default documentAI is used as a PDF parser, but optionally you can use `pdfminer`.

.. code-block:: bash

    aindex pdf extract-text /path/to/deck.pdf --parser pdfminer

To extract text per page use ``aindex pdf read-pages`` . This will be produced in JSON lines format.

.. code-block:: bash

    aindex pdf read-pages /path/to/deck.pdf

To write text extraction results to a file use ``-o`` or ``--output-path`` option.

.. code-block:: bash

    aindex pdf read-pages /path/to/deck.pdf --parser pdfminer -o my-output.json
    aindex pdf extract-text /path/to/deck.pdf -o my-output.txt

To get page images use ``aindex pdf screenshot-pages``

.. code-block:: bash

    aindex pdf screenshot-pages /path/to/deck.pdf /path/to/output/dir/

    # OR using pdfminer as a parser

    aindex pdf screenshot-pages /path/to/deck.pdf /path/to/output/dir/ --parser pdfminer



Development
============
Additional development dependencies can be installed by using

.. code-block:: bash

    pip install -r requirements_dev.txt

Before committing changes it is also recommend to check for PEP8 coding style guidelines and sorting python import
using something like ...

.. code-block:: bash
    flake8 .
    isort .


Testing
=======

Running tests
-------------

`Pytest`_ is as a Python unit test framework.

You can run tests using

.. code-block:: bash

    pytest

For more broad testing you can use `tox`_.

.. code-block:: bash

    tox


Documentation
=============
The project uses Sphinx_ for managing and compiling documentation.

To build the HTML documentation, make sure documentation dependencies are installed:

.. code:: bash

    pip install -r requirements_docs.txt

Then build the documentation:

.. code:: bash

    make docs

The HTML docs will be created in ``docs/_build/html/`` folder


.. _contributing: contributing.html
.. _Pytest: https://pytest.org
.. _Sphinx: https://www.sphinx-doc.org/
.. _Tox: https://tox.readthedocs.io/en/latest/
.. _image processing dependencies: https://pillow.readthedocs.io/en/stable/installation.html#external-libraries
