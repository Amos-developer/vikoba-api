# VIKOBA Platform

Node.js/PostgreSQL API and Vue web application for managing VICOBA group finances.

## Run the full stack with Docker

Create `vikoba-backend/.env` with `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and
`JWT_SECRET`. Docker Compose overrides `DB_HOST` to the PostgreSQL service name.

From `vikoba-backend` run:

```sh
docker compose up --build
```

The services are available at:

- Web application: http://localhost:8080
- API: http://localhost:3002/api
- API health check: http://localhost:3002/health
- PostgreSQL: localhost:5432

The API applies pending database migrations before it starts. PostgreSQL data is
stored in the named `postgres_data` volume.

Stop the stack without deleting database data:

```sh
docker compose down
```

View startup or migration logs:

```sh
docker compose logs -f api
```
