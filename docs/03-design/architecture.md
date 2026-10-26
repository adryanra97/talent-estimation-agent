# Architecture

## Context

```mermaid
flowchart LR
    TO([Talent Ops]) --> APP[Talent Estimation Agent]
    RV([Reviewer]) --> APP
    APP --> LLM[(Model provider:<br/>Gemini, Claude, OpenAI,<br/>Azure OpenAI, custom)]
    APP --> XL[[Validation workbook .xlsx]]
    DS([Data Scientist]) --> EV[Kedro evaluation]
    EV --> APP
```

## Containers

```mermaid
flowchart TB
    subgraph Browser
        UI[Next.js UI<br/>state in memory]
    end
    subgraph Vercel
        STATIC[Static assets and Next.js pages]
        FN[Python function<br/>FastAPI app]
    end
    subgraph Package[talent_estimation package]
        AG[agents]
        SK[skills]
        CA[calc]
        EX[excel]
        IO[io]
        LL[llm]
        CT[catalog]
    end
    UI -->|HTTPS| STATIC
    UI -->|/api/py, NDJSON stream| FN
    FN --> AG
    AG --> SK
    SK --> LL
    SK --> CT
    AG --> CA
    FN --> EX
    FN --> IO
    LL -->|HTTPS, key per request| PROV[(Model provider)]
```

## Layers and packages

| Layer | Package | Responsibility | Depends on |
|---|---|---|---|
| Presentation | `app/`, `components/`, `lib/` | Screens, state in memory, API calls | API |
| Interface | `api/index.py` | HTTP routes, uploads, streaming, validation | all below |
| Orchestration | `agents` | LangGraph graph, review loop, trace | skills, calc |
| Judgement | `skills` | Prompts, schemas, rule-based fallback, agent cards | llm, catalog, domain |
| Calculation | `calc` | UCP, bottom-up, monthly, comparison, AI scenario | domain |
| Output | `excel` | Workbook with formulas | domain, catalog |
| Input | `io` | WBS reader, document text | domain |
| Infrastructure | `llm` | Provider-agnostic structured output, masking | (LangChain) |
| Knowledge | `catalog` | Role catalog, rules, rubrics, AI categories | domain |
| Model | `domain` | Pydantic models | none |

```mermaid
flowchart TB
    api --> agents
    api --> excel
    api --> io
    agents --> skills
    agents --> calc
    skills --> llm
    skills --> catalog
    skills --> domain
    calc --> domain
    excel --> domain
    excel --> catalog
    io --> domain
    catalog --> domain
```

Dependencies point downwards only. `domain` and `calc` have no third-party
dependency other than Pydantic, so they can be reused in other processes.

## Deployment

```mermaid
flowchart LR
    subgraph Client[User device]
        BR[Browser]
    end
    subgraph GH[GitHub]
        REPO[Public repository]
    end
    subgraph VC[Vercel, region sin1]
        CDN[Edge network: pages and assets]
        PY[Python function: api/index.py<br/>max 300 s, 4.5 MB body]
    end
    REPO -->|push triggers build| VC
    BR --> CDN
    BR --> PY
    PY --> MP[(Model provider endpoint)]
```

## Reuse in a larger agent system

The same package can be exposed in three ways without rewriting the core:

- **MCP server**: tools `validate_talent_request` (full graph) and
  `assess_ai_opportunity` (Augmentation Agent only).
- **A2A**: the agent cards returned by `GET /api/py/agents` describe each
  agent's skills and contracts.
- **LangGraph subgraph**: `build_graph(llm)` returns a compiled graph that can
  be added as a node of a larger graph.
