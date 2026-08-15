# VIKOBA Platform

Node.js/PostgreSQL API and Vue web application for managing VICOBA group finances.

## Run the full stack with Docker

Create `vikoba-backend/.env` from `.env.example`. Use different strong values for
`DB_ADMIN_PASSWORD` and `DB_PASSWORD`. Docker Compose overrides `DB_HOST` to the
PostgreSQL service name.

From `vikoba-backend` run:

```sh
docker compose up --build
```

The services are available at:

- Web application: http://localhost:8080
- API: http://localhost:3002/api
- API health check: http://localhost:3002/health
- PostgreSQL: localhost:5432

The one-shot `migrate` service applies pending migrations with the database-owner
role. The API starts afterward with the restricted application role. PostgreSQL
data is stored in the named `postgres_data` volume.

Stop the stack without deleting database data:

```sh
docker compose down
```

View startup or migration logs:

```sh
docker compose logs -f migrate api
```

# Subscriptions and tenant security

Each VICOBA group is an isolated organization with its own subscription. New groups start with a seven-day Professional trial. After expiry, financial data stays readable and exportable, while all mutations are rejected by the API until payment activates a plan. Paid periods include a three-day grace period unless renewal was explicitly cancelled.

Isolation is enforced in PostgreSQL with row-level security, organization-scoped foreign keys, and server-side session context. The API intentionally refuses to start with a PostgreSQL `SUPERUSER` or `BYPASSRLS` role. Use the owner account only for `npm run db:migrate`, then run the API with `DB_USER=vikoba_user` (or another restricted role with equivalent grants).

Billing configuration is documented in `.env.example`. A payment provider must return a signed webhook to `POST /api/billing/webhook` with header `x-billing-signature: t=<unix-seconds>,v1=<hex-hmac-sha256>`. The signed message is `<timestamp>.<raw-json-body>`. Its JSON body must contain a unique event `id`, a `type`, and:

```json
{
  "data": {
    "organization_id": 1,
    "reference": "VKB-1-...",
    "status": "paid",
    "amount": 35000,
    "provider_payment_id": "provider-id",
    "payment_method": "mobile_money"
  }
}
```

The API verifies the signature, timestamp, event uniqueness, organization, reference, and exact invoice amount before activation. A browser redirect or client-side success response never activates a subscription.

For Docker, set separate `DB_ADMIN_PASSWORD` and `DB_PASSWORD` values. The `migrate` service uses the owner role once; the API service starts only after migrations complete and uses the restricted application role.
