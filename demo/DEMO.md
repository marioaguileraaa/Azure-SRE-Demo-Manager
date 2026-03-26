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
Generate a diagram for the application dependencies of the frontend app-parking-frontend-x6z6kgmn65dc4 from the backend APIs. Analyze Application Insights dependency telemetry of the last 24h to infer the backend APIs if required. The output should be a pretty visual ASCII diagram.

Generate a Mermaid diagram with number of calls and average response time.

Summarize this in a table.
```
