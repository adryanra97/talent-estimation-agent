# 0007 Roles decided from a capability catalog, not from codes

Status: accepted

## Context
WBS files mark roles with codes that differ between teams and are often
incomplete. The code count also reflects the request being validated.

## Decision
Agents decide roles from the content of each item against a catalog that
describes each role's scope, out-of-scope work, keywords, supporting
situations, and skill pillars. Role columns in the WBS are hints. A legend
from a team sheet expands codes to titles, ignoring every other column.

## Consequences
Gaps become visible: work that needs a role the WBS did not mention is flagged.
Teams can upload their own catalog for a session.
