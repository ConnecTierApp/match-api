#!/bin/bash

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready! Running migrations..."

echo "DB: ${DATABASE_URL}"

# Run migrations
python manage.py migrate --noinput
if [ $? -ne 0 ]; then
    echo "Migration failed!"
    exit 1
fi

echo "Creating initial superuser..."
python manage.py create_initial_superuser
if [ $? -ne 0 ]; then
    echo "Failed to create superuser!"
    exit 1
fi

echo "Collecting static files..." # shouldn't be necessary
python manage.py collectstatic --noinput

echo "Starting Django development server..."

# Note: For Django Channels and ASGI support, you should use an ASGI server like Daphne or Uvicorn.
# The normal runserver is fine for basic development and will use ASGI if available,
# but it is not recommended for production or for full async support.

# Start Django development server (sufficient for simple local dev/testing)
exec python manage.py runserver 0.0.0.0:8000
