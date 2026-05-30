#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"
REQS="${SCRIPT_DIR}/requirements.txt"

echo "Setting up Python environment..."

if command -v uv &> /dev/null; then
    echo "  Using uv ($(uv --version 2>&1))"
    if [ ! -d "$VENV_DIR" ]; then
        uv venv "$VENV_DIR"
    fi
    source "${VENV_DIR}/bin/activate"
    uv pip install -r "$REQS"
else
    echo "  uv not found — falling back to pip + venv"
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
    fi
    source "${VENV_DIR}/bin/activate"
    pip install -r "$REQS"
fi

PYTHON="${VENV_DIR}/bin/python3"
export PYTHONPATH="$SCRIPT_DIR"

echo ""
echo "============================================"
echo "Phase 1: BRONZE — Raw Ingestion"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/pipeline/bronze_ingestion.py"

echo ""
echo "============================================"
echo "Phase 2: SILVER — Data Quality & Cleaning"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/pipeline/silver_cleaning.py"

echo ""
echo "============================================"
echo "Phase 3: GOLD (POI) — Spatial Enrichment"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/scraping/poi_processor.py"

echo ""
echo "============================================"
echo "Phase 4: GOLD (RD) — Turing Reaction-Diffusion"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/src/gold/turing_rd.py"

echo ""
echo "============================================"
echo "Phase 5: GOLD (Merge) — Feature Assembly"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/pipeline/gold_merger.py"

echo ""
echo "============================================"
echo "Phase 6: MODEL — Latent Demand Estimation"
echo "============================================"
${PYTHON} "$SCRIPT_DIR/src/model/latent_demand.py"

echo ""
echo "============================================"
echo "Phase 7: OUTPUT — Validation"
echo "============================================"
echo "  Checking predictions..."
if [ -f "$SCRIPT_DIR/data/output/teamname_predictions.csv" ]; then
    LINES=$(wc -l < "$SCRIPT_DIR/data/output/teamname_predictions.csv")
    echo "  teamname_predictions.csv: $((LINES - 1)) rows (excluding header)"
else
    echo "  [WARN] teamname_predictions.csv not found"
fi
if [ -f "$SCRIPT_DIR/data/output/teamname_budget_allocations.csv" ]; then
    LINES=$(wc -l < "$SCRIPT_DIR/data/output/teamname_budget_allocations.csv")
    echo "  teamname_budget_allocations.csv: $((LINES - 1)) rows"
else
    echo "  [WARN] teamname_budget_allocations.csv not found"
fi

echo ""
echo "============================================"
echo "Pipeline complete!"
echo "============================================"
