# 0004 Provider-agnostic model access with a key per request

Status: accepted

## Context
Teams may use a sovereign model through an internal gateway, Azure OpenAI,
Claude, or Gemini. Users should not need to know endpoint formats.

## Decision
The user picks a provider, a model, and a key. `build_chat_model` maps the
choice to the LangChain chat model of that provider, and every skill asks for
structured output through one `LLMClient.structured` method. The key travels
in a request header and is never stored in environment variables.

## Consequences
Switching provider needs no code change. Output quality differs between
models, which the evaluation pipeline measures.
