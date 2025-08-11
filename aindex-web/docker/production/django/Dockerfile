FROM python:3.11.4-slim-bullseye as python

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    python3-dev \
    libpq-dev \
    gettext \
    libssl-dev \
    binutils \
    openssl \
    build-essential \
    libjpeg-dev \
    libfreetype6-dev \
    libtiff-dev \
    zlib1g-dev \
    libxslt1-dev \
    git


ARG APP_HOME=/aindexweb
WORKDIR ${APP_HOME}

ARG GOOGLE_APPLICATION_CREDENTIALS_SRC=.credentials/production-gcp-key.json
ARG GOOGLE_APPLICATION_CREDENTIALS=.credentials/gcp-key.json

RUN addgroup --system aindex \
    && adduser --system --ingroup aindex aindex

# copy google credentials
COPY ${GOOGLE_APPLICATION_CREDENTIALS_SRC} ${GOOGLE_APPLICATION_CREDENTIALS}

# Install Python requirements
COPY ./requirements.txt requirements.txt
COPY ./requirements_production.txt requirements_production.txt

RUN pip install --upgrade pip
RUN pip install -r ./requirements_production.txt

# Install aindex
COPY --from=aindex . tmp/aindex
RUN pip install tmp/aindex

COPY --chown=aindex:aindex ./docker/production/django/entrypoint /entrypoint
RUN sed -i 's/\r$//g' /entrypoint
RUN chmod +x /entrypoint

COPY ./docker/production/django/start /start
RUN sed -i 's/\r$//g' /start
RUN chmod +x /start

COPY ./docker/production/django/celery/worker/start /start-celery-worker
RUN sed -i 's/\r$//g' /start-celery-worker
RUN chmod +x /start-celery-worker


COPY ./docker/production/django/celery/beat/start /start-celery-beat
RUN sed -i 's/\r$//g' /start-celery-beat
RUN chmod +x /start-celery-beat


COPY ./docker/production/django/celery/flower/start /start-flower
RUN sed -i 's/\r$//g' /start-flower
RUN chmod +x /start-flower

COPY . $APP_HOME

RUN chown -R aindex:aindex ${APP_HOME}

ENTRYPOINT ["/entrypoint"]
