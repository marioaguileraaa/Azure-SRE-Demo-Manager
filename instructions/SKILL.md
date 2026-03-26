---
name: sre-dependencies-and-metrics
description: "Use for SRE analysis focused on frontend dependency analysis and telemetry in Application Insights across Virtual Machines and Container Apps backends."
---

# SRE Dependencies Observability Skill

Use this skill when diagnosing telemetry, collecting metrics,dependency analysis and visibility, and service-to-service observability in this environment.

## Topology Facts
- `Madrid API` and `Paris API` run on Azure VMs.
- All other backend APIs run on Azure Container Apps.
- The frontend runs on Azure App Service.
- The frontend is connected to Application Insights.

## Hard Requirement
- Frontend dependencies to backend APIs must be validated from Application Insights.
- Treat Application Insights as the source of truth for frontend-to-backend call visibility.

## Primary Workflow
1. Confirm frontend telemetry ingestion in Application Insights.
2. Validate dependency telemetry for outbound HTTP calls from frontend.
3. Check correlation integrity via `operation_Id`.
4. Separate findings by backend runtime:
   VM-hosted: Madrid and Paris.
   Container Apps-hosted: all others.
5. Report gaps and propose concrete fixes.

## CPU and Memory Metrics

When asked for metrics like CPU and Memory take into consideration that the backend APIs Madrid and Paris are running on Azure virtual machines and the other APIs are running in Container Apps.

## Data Sources
- Primary: Application Insights tables (`requests`, `dependencies`, `exceptions`, `traces`).
- Secondary: backend runtime logs (VM logs or Container Apps logs) only when correlation requires deeper analysis.

## Suggested KQL
```kusto
dependencies
| where timestamp > ago(24h)
| where type =~ "HTTP"
| summarize count() by target, resultCode, success
| order by count_ desc
```

```kusto
dependencies
| where timestamp > ago(24h)
| where type =~ "HTTP"
| where target has_any ("madrid", "paris")
| project timestamp, name, target, data, resultCode, success, operation_Id
| order by timestamp desc
```

```kusto
requests
| where timestamp > ago(24h)
| join kind=leftouter (
    dependencies
    | where timestamp > ago(24h)
    | where type =~ "HTTP"
) on operation_Id
| project timestamp, name, url, target, data, resultCode, success, operation_Id
| order by timestamp desc
```

## Output Contract
- State what is working and what is missing.
- Identify likely root causes.
- Recommend concrete remediations (config, instrumentation, routing, sampling).
- Include validation steps with KQL queries.
- Keep recommendations practical and deployment-aware.
