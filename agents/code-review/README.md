# Code review rules

Rules for automated code-review agents reviewing changes to this codebase.

## What to read

For every change reviewed, read both:

- `coding.md`
- `security.md`

The split between the two is editorial only; it makes the rules easier to maintain and reference. There is no class of change for which only one of the two applies. The requirement to read both is intentionally not gated on file paths, concerns, or change types, because the codebase structure will evolve over time.

## How rules are organised

Each rule has the same shape: a name, the pattern to flag in a diff, a generic counterexample showing the shape of the bad pattern, and the principle behind the rule. Where the rule is mechanically detectable, the rule includes a "How to grep" line so an agent can apply it programmatically.

Rules are derived from defects that have actually shipped in this codebase. They are not theoretical and they are not preferences. Treat a matching pattern in a diff as a finding to surface, not a suggestion.

## How rules get added

A new rule is added when a defect class is found in this codebase that the existing rules would not have caught. New rules should:

1. Describe the pattern in terms that can be matched on a diff.
2. Include at least one generic counterexample.
3. State the principle behind the rule without referring to internal incident details (this guide is public; lineage is tracked separately).
