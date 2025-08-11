# Socialgraph App Guide

Purpose: people profiles used by founders and advisors.

## Model
- `Profile` (polymorphic): name, bio, linkedin_url, country/location, education, experiences, military/gov background; public `uuid`.
- Companies app specializes this via `Founder` and `Advisor` and relations.

## APIs
- Exposed through companies endpoints: `/api/companies/founders` and `/api/companies/advisors`.

## Migration from Talents (legacy)
- aindex-web `talents` maps to `socialgraph.Profile` + companies relations. Replace legacy templates and forms with API-driven React components.
