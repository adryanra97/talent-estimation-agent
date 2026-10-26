# 0003 Python and LangGraph on Vercel functions

Status: accepted

## Context
The maintainer is a data scientist; the agent ecosystem (LangGraph, MCP
SDKs, Pydantic) is strongest in Python. Running Python in the browser with
Pyodide would avoid a server but adds a slow first load and limits libraries.

## Decision
Agents, skills, calculation, and workbook generation are a Python package
served by FastAPI on Vercel Python functions. The UI is Next.js, the one part
better suited to TypeScript.

## Consequences
Uploads and the key pass through the function in transit, but nothing is
stored (ADR 0001). Runs must finish within 300 seconds; item judgements run in
concurrent batches. The package can later be served as an MCP server or used
as a LangGraph subgraph without changes.
