# Branch Locations API

A serverless REST API for storing and querying branch locations, built with AWS CDK (TypeScript). Given a branch's city, state, and country, the API geocodes and stores its coordinates using the [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) API.

## Architecture

- **API Gateway** (`Branch Locations Service`) — REST API, proxying each route to its own Lambda.
- **Lambda** (Node.js 22.x, one function per operation) — `list`, `get`, `create`, `update`, each with least-privilege DynamoDB IAM grants.
- **DynamoDB** (`BranchLocations`) — single table, partition key `locationId` (string), on-demand billing.
- **Zod** — request validation (`lambdas/shared/validation.ts`), shared across handlers.

## API

| Method | Path                     | Description                                                   |
|--------|--------------------------|----------------------------------------------------------------|
| GET    | `/locations`             | List all branch locations                                     |
| POST   | `/locations`             | Create a branch location (geocodes city/state/country)        |
| GET    | `/locations/{locationId}`| Get a single branch location                                  |
| PUT    | `/locations/{locationId}`| Update a branch location (re-geocodes on address change)       |

### Data model

```ts
{
  locationId: string;  // caller-supplied, 6-12 characters
  name: string;        // max 50 chars
  city: string;         // max 50 chars
  state: string;        // max 50 chars
  country: string;      // max 50 chars
  latitude: number;     // resolved via Nominatim
  longitude: number;    // resolved via Nominatim
}
```

## Getting started

```bash
npm install
npm run build   # compile TypeScript
npm test        # run the Jest test suite (unit tests + CDK infrastructure assertions)
```

## Deployment

Deploys run automatically via GitHub Actions on every push to `main` (see `.github/workflows/deploy.yml`): the pipeline runs the test suite, then — if it passes — assumes an AWS IAM role via GitHub OIDC and runs `cdk deploy`.

To deploy manually:

```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/<REGION>   # one-time per account/region
npx cdk deploy
```

## Future enhancements (production readiness)

This project is a functional proof of concept. Before running it in production, address:

- **Pagination for `list`** — `dynamoDb.list()` performs a single `Scan` and returns whatever fits in one page. It needs to loop on `LastEvaluatedKey` (or better, expose `limit`/`cursor` query params on `GET /locations` and paginate at the API level) so it doesn't silently truncate results as the table grows.
- **API key** — none of the routes currently require authentication. Add a `UsagePlan` + `ApiKey` in the CDK stack, require it on every method (`apiKeyRequired: true`), and issue/rotate keys per consumer.
- **CORS** — the API has no CORS configuration, so it can't safely be called from a browser-based client yet. Add `defaultCorsPreflightOptions` scoped to the specific origins that should be allowed.
- **Observability** — no CloudWatch alarms, dashboards, or structured logging are configured yet. Add alarms on Lambda errors/throttles and API Gateway 4xx/5xx rates at minimum.
