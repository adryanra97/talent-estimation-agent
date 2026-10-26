# Security and privacy

| Asset | Threat | Control |
|---|---|---|
| API key | Leak through storage or logs | Kept in browser memory only; sent per request in the `X-LLM-Api-Key` header; never written to disk or logged; not part of any model or response |
| Project documents | Retention on the server | Parsed in memory; no file system writes; no database |
| Personal data in documents | Exposure to the model provider | E-mail, phone, and 16-digit ID numbers masked by default; team sheets are read only for role codes and titles, never names |
| Run results | Unauthorised access | Held in the user's tab; never sent anywhere except back to the user's own API calls |
| Public deployment | Abuse of the endpoint | No server-side key, so the endpoint cannot spend anyone else's credit; enable Vercel deployment protection for private use |
| Repository | Publication of company data | `.gitignore` blocks `.xlsx`, `.docx`, `.pdf`, and evaluation data; the demo project is fictional |

Masking is pattern-based and does not catch names. Users should not upload
documents they are not allowed to send to the chosen provider. Choosing a
provider whose data handling is approved by the organisation remains the
user's responsibility.
