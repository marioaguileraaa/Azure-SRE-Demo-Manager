# Demo instructions

## Demo agenda (60 min)

- 15min - What is Azure SRE? What Azure SRE is not.
	- Azure Docs
	- Azure SRE Console
		- Resources assigned
		- Monitor + resource mapping
		- requirements - azure log analytics workspaces
		- Um SRE por aplication
	- Settings
	- Daily Reports
	- Builder
		- Subagent builder to show that i can create agents
	- Scheduled tasks
		- Creata a task with text and refine with AI
- 5min - Demo App Showroom - Use cases (Linux, Windows, App Insights. 3rd Pary Monitor)
- 20min - Azure SRE Chat Demo
	- Chat #1 - Generic - Daily Report + promp "valida tambem o backend com as tools que tens"
	- Chat #2 - Alerts - Open Alert, check results + promp "abre issue no github"
	- Chat #3 - App Dependencies - prompt "conhecer as dependencias da aplicacao"
	- Chat #4 - Windows Logs
	- Chat #5 - Linux Logs
	- Chat #6 - 3rd Party API - prompt "call 3rd party service to know status"

## Chat 1 - Generic - Daily Report + promp "valida tambem o backend com as tools que tens"

```prompt
Validate backend APIs for /subscriptions/748249dd-5217-464b-a3f4-91dfa5abc2f4/resourceGroups/rg-parking-frontend-dev/providers/microsoft.insights/components/appi-parking-frontend over the last 24h. Return a table by dependency target with: calls, failures, success rate (%), avg latency (ms), p95 (ms), max (ms). Highlight top 5 by failures and call out any >2s spikes.
```

## Chat 2 - Alerts - Open Alert, check results + promp "abre issue no github"

```prompt
Use the learnings from this issue to create a github issue on the connected repository and assign it to github copilot.
```

## Chat 3 - App Dependencies - prompt "conhecer as dependencias da aplicacao"

```prompt
Generate a diagram for the application dependencies of the frontend app-parking-frontend-x6z6kgmn65dc4 from the backend APIs. Analyze Application Insights dependency telemetry of the last 24h to infer the backend APIs if required. The output should be a pretty visual Mermaid diagram with aggregatted total number of calls and average response time.

Summarize this in a table.
```

## Chat 4 - Madrid API (Windows Logs - Event)
    
```prompt
Check Madrid API response status codes, errors and response time in the last 24h. Format the results in a more visual table.

Get me a summary table of the calls per operation.
```

## Chat 5 - Paris API (Linux Logs - Syslog)

```prompt
Check Paris API response status codes, errors and response time in the last 24h.

Format the output results in a table.

Also check external dependencies status of Paris API in the last 24h and summarize the results in a table.
```

## Chat 6 - 3rd Party API – prompt “call 3rd party service to know status”

```prompt
Please assess the Berlin Park API right now. Check health, latency, throughput, error rate, and availability for the last 60 minutes. Use SLO thresholds: p95 < 100 ms, error rate < 1%, availability ≥ 99.9%. Summarize results in one table with columns: Category | Metric | Value | Threshold | Status. Then add: 1) a 2–3 sentence summary, 2) key evidence with timestamps, 3) likely causes/hypotheses, 4) recommended actions, 5) follow-ups/requests. If SLOs are failing, clearly call it out. If any data is unavailable, state the gaps. Include the latest parking occupancy snapshot if available.
```
Remember the importance of a good prompt. Azure SRE still is a LLM and needs good prompt engineering.

```prompt
You are an observability assistant. Assess the Berlin Park API for the last 60 minutes.

Inputs:

SLOs: p95 latency < 100 ms; error rate < 1%; availability ≥ 99.9%
Metrics to compute/report: health, p95 latency (ms), throughput (requests/min and total), error rate (%), availability (%)
Also include: latest parking occupancy snapshot (total, available, occupied, % occupied, per-level if present)
Output format (strict):

First render a GitHub‑flavored Markdown table with EXACT columns: | Category | Metric | Value | Threshold | Status |
Populate rows for Health, Latency (p95), Throughput, Error Rate, Availability.
Status must be one of: PASS, FAIL, INFO.
Use ISO8601 UTC timestamps where relevant in Value.
If a metric is unavailable, use N/A and explain in Data gaps later.
Do not include any text before the table.
Then add these sections in order:
Summary (2–3 sentences, concise, call out SLO breaches clearly if any)
Key evidence (bulleted list with timestamps and concrete values)
Likely causes/hypotheses (bulleted, 2–4 items)
Recommended actions (bulleted, prioritized, concrete)
Follow-ups/requests (bulleted)
Data gaps (bulleted; list any unavailable data)
Rules:

If any SLO is failing, add a single line “SLOs FAILING” immediately after the table.
No emojis. Keep numbers to 2 decimal places where applicable.
Use UTC timestamps (ISO8601).
Throughput row should show both rpm and total (e.g., “5 rpm (total 1,887)”).
Example table header (use this exact header): | Category | Metric | Value | Threshold | Status |
```
