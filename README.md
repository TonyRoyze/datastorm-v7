# Ctrl Freaks — DataStorm 7.0

**Latent Demand Estimation Pipeline for Sri Lanka Beverage Distribution | January 2026 Forecast**

This repository estimates uncapped `Maximum_Monthly_Liters` for 20,000 beverage outlets and allocates a LKR 5M promotional budget across the Western Province outlet network. The solution combines a medallion data pipeline, spatial enrichment, Turing reaction-diffusion demand pressure, latent demand modeling, budget optimization, and a Next.js outlet intelligence dashboard.

---

## What Is Built

- **Bronze ingestion:** raw CSVs converted to Parquet with schema and null-count manifest.
- **Silver cleaning:** reusable DQ checks, cleaned Parquet tables, and a unified rejected-record store.
- **Gold features:** transaction aggregates, POI features, spatial clustering, and Turing RD demand pressure.
- **Latent demand model:** Tobit-style censored estimation, stochastic frontier uplift, peer-group uplift, and January seasonality adjustment.
- **Spend optimizer:** LKR 5M Western Province allocation based on predicted upside and commercial guardrails.
- **Web app:** Next.js 16 dashboard with overview, map, settings, static data exports, and AI/API routes.

---

## Project Structure

```text
.
├── data/
│   ├── raw/                  # Source CSVs
│   ├── bronze/               # Raw Parquet snapshots + manifest.json
│   ├── silver/               # Cleaned data + dq_report.json + rejected_records.parquet
│   ├── gold/                 # Spatial, Turing RD, and model-ready feature artifacts
│   ├── predictions/          # ctrl_freaks_predictions.csv
│   └── budget/               # budget allocation outputs
├── pipeline/
│   ├── bronze_ingestion.py
│   ├── dq_checks.py
│   ├── silver_cleaning.py
│   └── gold_merger.py
├── scraping/
│   └── poi_processor.py      # Overpass/GeoPandas POI enrichment
├── src/
│   ├── eda/                  # EDA and spatial diagnostics
│   ├── gold/turing_rd.py     # Turing reaction-diffusion feature
│   ├── model/latent_demand.py
│   └── spend/optimizer.py
├── web/                      # Next.js outlet dashboard
├── outputs/                  # Diagnostic plots
├── DONE_SO_FAR.md
├── run_pipeline.sh
├── requirements.txt
└── README.md
```

---

## Prerequisites

- Python 3.9+
- Node.js 20+
- pnpm 9+

---

## Setup

```bash
# Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Web app dependencies
pnpm install --prefix web
```

If `uv` is installed, `run_pipeline.sh` will create/use `.venv` and install `requirements.txt` automatically.

---

## Run the Full Pipeline

```bash
chmod +x run_pipeline.sh
./run_pipeline.sh
```

You can resume from a specific phase:

```bash
./run_pipeline.sh --start-from 7
```

| Phase | Description |
|---:|---|
| 1 | Bronze raw ingestion |
| 2 | Silver data quality and cleaning |
| 3 | Gold POI spatial enrichment |
| 4 | Gold feature assembly |
| 5 | Gold EDA / Turing RD prep |
| 6 | Turing reaction-diffusion |
| 7 | Latent demand estimation |
| 8 | Budget optimization |
| 9 | JSON and web asset export |
| 10 | Output validation |

---

## Important Outputs

| Output | Rows | Purpose |
|---|---:|---|
| `data/predictions/ctrl_freaks_predictions.csv` | 20,000 | `Outlet_ID`, `Maximum_Monthly_Liters` |
| `data/budget/ctrl_freaks_budget_allocations.csv` | 1,799 | Submission-friendly spend output |
| `data/budget/ctrl_freaks_budget_mapping.csv` | 1,799 | Detailed spend audit with spend type and upside |
| `data/silver/rejected_records.parquet` | 49,106 | Unified quarantine store |
| `data/gold/master_training_data.parquet` | 20,000 | Gold model matrix |
| `data/gold/turing_outlet_features.parquet` | 19,960 | Outlet-level RD/spatial features |
| `web/public/data/*.json` | varies | Static web dashboard data |

---

## Run the Web App

```bash
pnpm run dev --prefix web
```

Open [http://localhost:3000](http://localhost:3000).

Production commands:

```bash
pnpm run build --prefix web
pnpm run start --prefix web
```

Quality commands:

```bash
pnpm run lint --prefix web
pnpm run typecheck --prefix web
pnpm run format --prefix web
```

Current routes:

| Route | Purpose |
|---|---|
| `/` | Overview dashboard and outlet data table |
| `/map` | Western Province outlet map |
| `/settings` | Data, AI, and pipeline configuration surface |
| `/api/chat` | AI chat endpoint |
| `/api/outlet-insight` | Outlet insight endpoint |

---

## AI Features & API Key Setup

The dashboard includes two AI-powered features:

| Feature | Where | What it does |
|---|---|---|
| **Executive Summary** | Overview page | Auto-generates a business narrative from live dataset metrics |
| **AI Chat** | Overview page sidebar | Answers natural-language questions about outlets, distributors, and budget |
| **Outlet Insight** | Map / table popover | Explains why a specific outlet received its predicted score |

### Running without an API key (zero setup)

**The app works fully without any API key.** All three features fall back to deterministic, data-driven responses generated directly from the JSON data files. The responses are complete and professional — there is no degraded UI or error state.

Simply start the web app and all features will work:

```bash
pnpm run dev --prefix web
```

### Enabling live AI responses (optional)

To enable Groq-powered LLM responses, obtain a free API key:

1. Go to [https://console.groq.com](https://console.groq.com) and sign up (free, no credit card required)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key (it starts with `gsk_`)
4. Create the file `web/.env.local` with the following content:

```bash
# web/.env.local
GROQ_API_KEY="your_key_here"
```

> **Note:** `web/.env.local` is listed in `.gitignore` and will never be committed to the repository. Never paste your key directly into any source file.

5. Restart the dev server:

```bash
pnpm run dev --prefix web
```

The app will automatically detect the key and switch all three AI features to live LLM mode. No other configuration is needed.

---

## Modeling Summary

The modeling layer treats observed sales as capped demand:

```text
observed = min(true_demand, constraint_ceiling)
```

The implemented model estimates potential using:

- constraint score and censoring threshold logic
- Tobit-style regression trained on outlets treated as unconstrained
- stochastic frontier uplift
- nearest-peer 90th percentile uplift
- January and distributor seasonality adjustment
- prediction floor at observed maximum monthly volume
- peer-based cap to avoid unrealistic extrapolation

---

## Budget Optimization Summary

The Western Province optimizer:

- filters outlets from `DIST_W_01`, `DIST_W_02`, and `DIST_W_03`
- computes upside as `predicted potential - historical max`
- excludes zero-upside outlets
- ranks outlets by upside
- allocates LKR 5M across three tiers
- assigns `discount`, `merchandising`, or `promotional` spend type
- writes both simple submission output and detailed audit output

Current allocation:

- **1,799** funded outlets
- **LKR 5,000,000** fully allocated
- approximately **1.65M liters** of funded upside represented

---

## Team

- **Sukitha Rathnayake** — MLOps, DQ forensics, ensemble logic, GenAI
- **Vidura Gunawardana** — pipeline architecture, Turing RD, latent demand modeling, web app
