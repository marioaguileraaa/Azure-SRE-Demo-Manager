# Chaos Control Service

Central control plane for enabling/disabling chaos experiments across Lisbon, Madrid, Paris, and Berlin APIs.

## Run

```bash
npm install
npm run start
```

Default port: `3090`

## Run full local stack

From repository root:

```bash
./scripts/start-chaos-stack.sh
```

This starts chaos-control + all parking APIs + frontend proxy in one terminal.

## Endpoints

- `GET /health`
- `GET /api/chaos/state`
- `PATCH /api/chaos/global`
- `PATCH /api/chaos/services/:serviceName`
- `PUT /api/chaos/state`

## Supported fault types

- `latency`
- `httpError`
- `httpsError`
- `exception`
- `disconnect`
- `timeout`
- `badPayload`
