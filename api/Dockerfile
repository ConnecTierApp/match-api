# Dockerfile for Django API/Worker
FROM python:3.11-slim

# install curl and postgresql-client (for pg_isready)
RUN apt-get update && apt-get install -y curl postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

RUN chmod +x run.sh

CMD ["./run.sh"]
