#!/usr/bin/env python

"""The setup script."""

from setuptools import find_packages, setup

with open('README.rst') as readme_file:
    readme = readme_file.read()

with open('HISTORY.rst') as history_file:
    history = history_file.read()

requirements = [
    'Click>=7.0',
    'pydantic',
    'pydantic-settings',
    'google-cloud-documentai',
    'google-cloud-storage',
    'google-cloud-documentai-toolbox',
    'google-cloud-aiplatform',
    'pdfminer.six',
    'pdf2image',
    'openai',
    'tiktoken',
    'requests',
    'jinja2',
    'Pillow',
    'pycountry',
    'python-dateutil',
]

test_requirements = ['pytest>=3', ]

setup(
    author="AIN Ventures",
    author_email='hello@ainventures.com',
    python_requires='>=3.6',
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Intended Audience :: Developers',
        'Natural Language :: English',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
    ],
    description="Pitch decks processing",
    entry_points={
        'console_scripts': [
            'aindex=aindex.cli:main',
        ],
    },
    install_requires=requirements,
    long_description=readme + '\n\n' + history,
    include_package_data=True,
    keywords='aindex',
    name='aindex',
    packages=find_packages(include=['aindex', 'aindex.*']),
    test_suite='tests',
    tests_require=test_requirements,
    url='https://github.com/AIN-ventures/aindex',
    version='0.2.1',
    zip_safe=False,
)
