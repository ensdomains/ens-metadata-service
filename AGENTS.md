# Agents Guide

Documentation intended to be read by automated agents working on this codebase.

This file is a generic index. Each agent role has its own sub-area under `agents/` containing the documentation for that role.

## Sub-areas

- **`agents/code-review/`** — rules for automated code review on every diff to this codebase. Any agent reviewing a change must read both `agents/code-review/coding.md` and `agents/code-review/security.md` for every change. See the README in that directory for how the rules are organised and how new rules get added.

Other agent roles (e.g. issue triage, release-note generation, security advisory drafting) may have their own sub-areas added here as they emerge. Each sub-area is self-contained.

## Scope

This guide is specific to the ENS metadata service. Conventions in other ENS repositories may differ.
