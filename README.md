# Bank Processing System

AI-powered bank statement analysis system for automated loan decision making.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BANK PROCESSING SYSTEM                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────────────────────────────────┐
│   PDF Upload    │    │                EXTRACTION LAYER              │
│                 │    │                                              │
│ • Bank Stmt PDF │───▶│  ┌─────────────────┐  ┌─────────────────┐   │
│ • Multiple      │    │  │ Statement Meta  │  │ Transaction     │   │
│   Formats       │    │  │ Data Extractor  │  │ Extractor       │   │
└─────────────────┘    │  │ (LLM-powered)   │  │ (LLM-powered)   │   │
                       │  └─────────────────┘  └─────────────────┘   │
                       └──────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA STORAGE                               │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   Document      │  │   Statement     │  │   Transaction   │      │
│  │   Storage       │  │   Metadata      │  │   Records       │      │
│  │   (JSON/DAO)    │  │   • Bank Info   │  │   • Amount      │      │
│  └─────────────────┘  │   • Account     │  │   • Date        │      │
│                       │   • Balances    │  │   • Description │      │
│                       └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BUSINESS ANALYSIS LAYER                       │
│                                                                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│ │   Business      │ │  Transaction    │ │   Loan Risk     │        │
│ │   Analysis      │ │  Categorization │ │   Assessment    │        │
│ │                 │ │                 │ │                 │        │
│ │ • Cash Flow     │ │ • Rent/Utils    │ │ • Risk Scoring  │        │
│ │ • Recurring     │ │ • Payroll       │ │ • 5 Risk Factors│        │
│ │ • Patterns      │ │ • Debt Payments │ │ • Recommendation│        │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      COMPREHENSIVE ANALYSIS                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                EXECUTIVE SUMMARY                            │   │
│  │                                                             │   │
│  │  • Loan Recommendation (APPROVE/DECLINE/REVIEW)           │   │
│  │  • Risk Level (LOW/MEDIUM/HIGH/CRITICAL)                  │   │
│  │  • Risk Score (0-100)                                     │   │
│  │  • Confidence Rating                                      │   │
│  │  • Key Financial Metrics                                  │   │
│  │  • Business Health Indicators                             │   │
│  │  • Actionable Insights                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     OUTPUT      │
│                 │
│ • JSON Reports  │
│ • Risk Analysis │
│ • Loan Decision │
└─────────────────┘
```

## Key Features

- **AI-Powered Extraction**: Uses LLM to extract structured data from any bank statement format
- **Smart Categorization**: Automatically categorizes transactions into business expense types
- **Risk Assessment**: Comprehensive 5-factor risk analysis with weighted scoring
- **Loan Recommendations**: Clear approve/decline decisions with confidence ratings
- **Executive Reporting**: Banker-friendly summaries for quick decision making

## Quick Start

Run the demo to see all services in action:

```bash
python demo_services.py
```

Process a real bank statement:

```bash
python pipeline/pipeline.py
```

## Development

### Install and sync

This project uses `uv` for dependency management. To install dev tools:

```bash
uv sync --all-extras --dev
```

### Linting and formatting

- Ruff format (apply formatting):

```bash
uv run ruff format .
```

- Ruff lint (autofix simple issues):

```bash
uv run ruff check --fix .
```

### Type checking

Run Pyright:

```bash
uv run pyright
```

### Pre-commit hooks

Install hooks so checks run on each commit:

```bash
uv run pre-commit install
```

You can run all hooks against the repo with:

```bash
uv run pre-commit run --all-files
```

### CI

GitHub Actions runs Ruff and Pyright on pushes and pull requests to `main`.
