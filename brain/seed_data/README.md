# Seed Data (Gitignored)

Place local JSON seed files here for development and demos. This directory is gitignored by default to avoid committing test data.

## Example JSON (Figma-style import)

Save as `brain/seed_data/figma_vc_deal_example.json` and run:

```
python manage.py import_figma_deal brain/seed_data/figma_vc_deal_example.json
```

Template:

```json
{
  "company": {
    "name": "Sentinel Dynamics",
    "website": "https://sentineldynamics.example",
    "summary": "Autonomous ISR swarms for contested environments."
  },
  "deal": {
    "name": "Sentinel Dynamics Seed",
    "description": "Seed round to accelerate field trials and expand DoD pilots.",
    "website": "https://sentineldynamics.example",
    "industries": ["Autonomy", "Aerospace", "Defense"],
    "funding_stage": "Seed",
    "investors_names": ["Scout Ventures", "XYZ Angels"],
    "partners_names": ["Lockheed Martin"],
    "customers_names": ["AFWERX", "DIU"]
  },
  "ai_assessment": {
    "investment_rationale": "Strong dual-use potential; differentiated autonomy stack; credible DoD interest.",
    "pros": "Experienced team; early pilot traction; modular swarming architecture",
    "cons": "Long procurement cycles; integration risks; certification timeline",
    "quality_percentile": "top 10%"
  },
  "analyst_assessment": {
    "investment_rationale": "Lean, technically strong team with clear pathway to milestones; early AFWERX traction reduces GTM risk.",
    "pros": "Government pull; strong technical moat; clear testing roadmap",
    "cons": "Certification timeline uncertain; dependency on specific DoD sponsors",
    "quality_percentile": "top 20%"
  }
}
```
