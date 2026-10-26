# System request

| Field | Content |
|---|---|
| Project sponsor | Capability lead of a data team (chapter) |
| Business need | Talent requests from product teams arrive with a WBS and a request document. The capability team must decide whether the requested number of people per role is reasonable, but the judgement is not yet supported by a measurable, traceable method. |
| Business requirements | Estimate the FTE and man-hours per role for a project from its WBS. Trace every number to a WBS item and a written reason. Compare the result with the request. Produce a file that can be attached to the reply. |
| Business value | Faster and more consistent validation of requests; a shared method that new reviewers can follow; a record of assumptions that can be discussed with the requesting team; visibility of where AI assistance can reduce effort. |
| Special issues | Project documents can contain personal data and must not be stored outside the user's control. The first version is a mock-up deployed on free infrastructure; it must run without a database. |

## Background

A first prototype ran as a prompt in a chat assistant, with an Excel template
that holds the formulas. It produced plausible numbers, but every run required
uploading four files and writing a prompt by hand, and the template and prompt
could drift between users. This project turns the prototype into an agentic
application with fixed skills, so that a talent operations team only uploads
the WBS and the request.

## Scope

In scope: data roles (Data Engineer, Data Analyst, Data Scientist, AI
Engineer) and design roles (UX Researcher, UX Designer, UI Designer); Use Case Points and bottom-up estimation; a review loop; an AI
assistance scenario; Excel export.

Out of scope for this version: assignment of named
people, storage of run history, integration with document management systems.
