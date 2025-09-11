# Bank Processing System

AI-powered bank statement analysis for loan underwriting. Upload PDFs, get instant risk assessments.

## Quick Start

### Prerequisites
- Python 3.11+ with `uv` package manager
- Node.js 18+

### 1. Sync Dependencies
```bash
uv sync
```

### 2. Start Backend
```bash
./start_api.sh
```
API runs at `http://localhost:8000`

### 3. Start Frontend
```bash
./start_frontend.sh
```
Frontend runs at `http://localhost:3000`

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │   Falcon API    │    │ LLM Extraction  │
│                 │    │                 │    │                 │
│ • Upload UI     │───▶│ • Documents     │───▶│ • Metadata      │
│ • Visualizations│    │ • Insights      │    │ • Transactions  │
│ • Risk Analysis │    │ • Processing    │    │ • Categories    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Services                            │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Cash Flow   │ │ Risk Flags  │ │ Debt        │ │ Liquidity   │ │
│ │ Analysis    │ │ Detection   │ │ Analysis    │ │ Analysis    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Recurring   │ │ Stability   │ │ Transaction │ │ Underwriting│ │
│ │ Bills       │ │ Analysis    │ │ Buckets     │ │ Metrics     │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Storage                                │
│                                                                 │
│          ┌─────────────┐              ┌─────────────┐           │
│          │   JSON      │              │  In-Memory  │           │
│          │ Persistence │              │    DAO      │           │
│          └─────────────┘              └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

**Frontend (React)**
- Document upload and management
- Interactive financial visualizations  
- Risk assessment dashboard

**API Layer (Falcon)**
- RESTful endpoints for documents and insights
- File processing pipeline
- Business service orchestration

**AI Extraction**
- LLM-powered PDF parsing
- Transaction categorization
- Metadata extraction

**Business Services**
- Cash flow analysis
- Risk scoring and flags
- Debt service calculations
- Liquidity assessment
- Recurring payment detection

## Project Structure

```
├── api/                 # Falcon REST API
├── frontend/           # React application  
├── domain/             # Business models
├── services/           # Business logic
├── extractor/          # AI extraction layer
├── pipeline/           # Processing pipeline
├── storage/            # Data persistence
├── start_api.sh        # Backend startup
└── start_frontend.sh   # Frontend startup
```

