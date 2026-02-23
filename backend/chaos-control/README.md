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
- `dependencyFailure`
- `httpsError`
- `exception`
- `disconnect`
- `timeout`
- `badPayload`
- `highCpu`
- `highMemory`

## Safety guard for highMemory

- `maxMemoryHolds` limits concurrent memory holds per service (default: `2`)
- Optional env fallback: `CHAOS_HIGH_MEMORY_MAX_CONCURRENT`

## Backoffice configuration guide (per fault type)

### Common fields (apply to most faults)

- `Enabled`: turns the selected fault on/off for that service.
- `Probability`: value between `0` and `1`.
  - `1` = every matching request is affected.
  - `0.2` = ~20% of matching requests are affected.
- `HTTP Method`: limit to one verb (`GET`, `PATCH`, etc.) or `*` for all.
- `Path Prefix`: only requests whose path starts with this value are affected (example: `/api/parking/metrics`).
- `Error Message`: returned in fault responses where applicable.

### `latency`

- Main fields: `delayMs`, `probability`, `method`, `pathPattern`.
- Effect: adds response delay, then continues normal API flow.
- Good starter config:
  - `delayMs: 1500`
  - `probability: 0.5`

### `httpError`

- Main fields: `statusCode`, `errorMessage`, `probability`, `method`, `pathPattern`.
- Effect: immediately returns configured HTTP error JSON.
- Good starter config:
  - `statusCode: 503`
  - `errorMessage: Service unavailable (simulated)`

### `dependencyFailure`

- Main fields: `statusCode`, `errorMessage`, `probability`, `method`, `pathPattern`.
- Effect: simulates external/downstream dependency outage.
- Recommended for Paris dependency route: `pathPattern: /api/parking/dependency`.
- Good starter config:
  - `statusCode: 503`
  - `errorMessage: Dependency unavailable (simulated)`
  - `method: GET`
  - `probability: 1`

Paris-focused example:

- Service: `paris`
- Fault type: `dependencyFailure`
- `enabled: true`
- `method: GET`
- `pathPattern: /api/parking/dependency`
- `statusCode: 503`
- `errorMessage: WorldTime API unavailable (simulated)`

Expected response shape:

- `success: false`
- `chaos: true`
- `code: DEPENDENCY_FAILURE`
- `dependency: external-dependency`
- `statusCode: 503`

### `httpsError`

- Main fields: `statusCode`, `errorMessage`, `probability`, `method`, `pathPattern`.
- Effect: returns a TLS-style simulated error response (useful for handshake/SSL failure scenarios).
- Good starter config:
  - `statusCode: 525`
  - `errorMessage: SSL handshake failed (simulated)`

### `exception`

- Main fields: `errorMessage`, `probability`, `method`, `pathPattern`.
- Effect: throws an internal exception and is handled by API error middleware.
- Good starter config:
  - `errorMessage: Unhandled exception (simulated)`

### `disconnect`

- Main fields: `probability`, `method`, `pathPattern`.
- Effect: forcefully closes the socket to simulate dropped connections.
- Good starter config:
  - `probability: 0.3`

### `timeout`

- Main fields: `probability`, `method`, `pathPattern`.
- Effect: request is intentionally left without a response so upstream timeout handling is triggered.
- Good starter config:
  - `probability: 0.2`

### `badPayload`

- Main fields: `probability`, `method`, `pathPattern`.
- Effect: returns malformed JSON to test client parsing/error handling.
- Good starter config:
  - `probability: 0.2`

### `highCpu`

- Main fields: `cpuBurnMs`, `probability`, `method`, `pathPattern`.
- Effect: burns CPU in-process for the configured duration, then continues normal flow.
- Good starter config:
  - `cpuBurnMs: 2000`
  - `probability: 0.3`

### `highMemory`

- Main fields: `memoryMb`, `delayMs`, `maxMemoryHolds`, `probability`, `method`, `pathPattern`.
- Effect: allocates memory and keeps it for `delayMs`, then releases it.
- Guard behavior: if concurrent allocations for the same service exceed `maxMemoryHolds`, API returns `429` instead of allocating more.
- Good starter config:
  - `memoryMb: 128`
  - `delayMs: 5000`
  - `maxMemoryHolds: 2`

## Suggested safe rollout

1. Set `Global Chaos` ON, but keep one service at a time with low probability (`0.1` to `0.2`).
2. Start with non-destructive faults (`latency`) before moving to `disconnect`, `timeout`, `highMemory`.
3. Increase intensity gradually and monitor API/Frontend behavior and logs.
