# Bank Statement Processing System

Automated bank statement analysis and loan decision support system. Upload PDF statements, get instant loan recommendations.

## Quick Start

### 1. Start API Server
Make sure package manager uv is installed
```bash
# automatically syncs with python virtual env and start the API server
./start_api.sh
```
API runs at `http://localhost:8000`

### 2. Start Frontend  
```bash
cd frontend
npm install
npm start
```
Frontend runs at `http://localhost:3000`

### 3. Use the System
1. Open `http://localhost:3000`
2. Upload a PDF bank statement  
3. Click on the processed document
4. Get instant loan analysis and recommendation

## 🏦 What It Solves

**The Problem**: Bankers manually analyze every transaction on bank statements (hours per statement)

**The Solution**: AI-powered instant analysis with loan recommendation (seconds)

Perfect for: *"Tell me if we should give them a business loan based on their spending patterns"*

## 🔄 How It Works

**Upload** → **Process** → **Analyze** → **Decide**

1. **Upload**: Drag & drop PDF bank statements
2. **Process**: AI extracts transactions and metadata  
3. **Analyze**: Calculate income, expenses, cash flow, risk metrics
4. **Decide**: Get automated loan recommendation (Low/Moderate/High Risk)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BANK STATEMENT ANALYZER                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────────────────────────────────┐
│  React Frontend │    │                API Layer                     │
│                 │    │                                              │
│ • Upload UI     │───▶│  ┌─────────────────┐  ┌─────────────────┐   │
│ • Document List │    │  │ Document        │  │ Insights        │   │
│ • Loan Analysis │    │  │ Resource        │  │ Resource        │   │
│ • Risk Display  │    │  │ (Falcon)        │  │ (Falcon)        │   │
└─────────────────┘    │  └─────────────────┘  └─────────────────┘   │
                       └──────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PROCESSING PIPELINE                            │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ PDF Upload      │  │ AI Extraction   │  │ Data Processing │      │
│  │ • File Handling │→ │ • Metadata      │→ │ • Categorization│      │
│  │ • Validation    │  │ • Transactions  │  │ • Reconciliation│      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BUSINESS SERVICES                             │
│                                                                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│ │ Cash Flow       │ │ Risk Assessment │ │ Loan Decision   │        │
│ │ Analysis        │ │ Service         │ │ Engine          │        │
│ │                 │ │                 │ │                 │        │
│ │ • Income/Expense│ │ • Risk Scoring  │ │ • Recommendations│       │
│ │ • Net Flow      │ │ • Pattern Flags │ │ • Risk Levels   │        │
│ │ • Stability     │ │ • Debt Analysis │ │ • Confidence    │        │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LOAN RECOMMENDATION                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 ✅ LOW RISK                                 │   │  
│  │                ⚠️ MODERATE RISK                           │   │
│  │                ❌ HIGH RISK                                │   │
│  │                                                             │   │
│  │  • Monthly Income: $15,000                                 │   │
│  │  • Monthly Expenses: $8,500                               │   │
│  │  • Net Cash Flow: $6,500                                  │   │
│  │  • Risk Reason: "Strong cash flow (>20% of income)"      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### Frontend (React)
- **Drag & Drop Upload** - Easy PDF bank statement uploads
- **Document Dashboard** - Visual grid of all processed statements  
- **Loan Analysis View** - Detailed financial insights and recommendations
- **Professional Banking UI** - Clean, industry-appropriate design

### Backend (Python + Falcon)
- **AI-Powered Extraction** - LLM extracts structured data from any bank statement
- **Smart Categorization** - Automatically categorizes transactions (Rent, Payroll, etc.)
- **Comprehensive Analysis** - 11+ specialized business services
- **Risk Assessment** - Multi-factor risk analysis with loan recommendations

### Business Logic
- **Cash Flow Analysis** - Income, expenses, net flow calculations
- **Risk Scoring** - Pattern detection and risk flag identification  
- **Debt Analysis** - Debt service coverage ratio calculations
- **Stability Assessment** - Income stability and transaction patterns
- **Loan Recommendations** - Automated Low/Moderate/High risk decisions

## 📁 Project Structure

```
bank-processing-system/
├── api/                    # Falcon REST API
│   ├── app.py             # App factory
│   ├── api_router.py      # Request routing
│   └── resources/         # API endpoints
├── frontend/              # React application
│   ├── src/components/    # React components
│   ├── src/services/      # API integration
│   └── public/           # Static assets
├── domain/               # Core business models
├── services/             # Business logic services
├── extractor/            # AI extraction layer
├── pipeline/             # Document processing
├── storage/              # Data persistence
└── main.py              # API entry point
```

## 🔧 Technology Stack

**Backend:**
- **Python 3.11+** with type hints
- **Falcon** - High-performance web framework
- **LLM Integration** - AI-powered extraction
- **In-memory storage** with JSON persistence

**Frontend:** 
- **React 18** with hooks and router
- **Custom CSS** with banking-focused design
- **REST API integration** with error handling

## 🚦 Development

### Backend Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Type checking
pyright

# Linting
ruff check --fix .
ruff format .
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🎯 Loan Decision Logic

The system automatically assesses loan risk:

- **Income Level**: Minimum $5,000/month threshold
- **Cash Flow**: Positive vs negative monthly flow  
- **Cash Flow Margin**: Percentage of income after expenses
- **Transaction Patterns**: Financial stability indicators

### Risk Categories:
- ✅ **LOW RISK**: Strong cash flow (>20% of income)
- ⚠️ **MODERATE RISK**: Adequate cash flow (10-20% of income)  
- ❌ **HIGH RISK**: Negative cash flow or low income

## 🌟 Example Use Case

**Traditional Process:**
1. Banker receives PDF bank statement
2. Manually reviews every transaction line
3. Calculates totals and patterns by hand
4. Makes subjective loan decision
5. Takes 2-3 hours per statement

**With This System:**
1. Upload PDF bank statement
2. AI extracts all transaction data (30 seconds)
3. System calculates comprehensive metrics automatically
4. Get instant loan recommendation with reasoning
5. **Total time: Under 1 minute**

Perfect for the challenge scenario: *"Tell me the total monthly deposits and withdrawals. Give me insights on their big regular bills. Try to catch if they have other outstanding loans. Use common sense on if you'd give them a loan based on how they spend their money."*

## 📈 Scalability

**Current (MVP):**
- File-based storage
- Single-server deployment
- Local AI processing

**Future Options:**
- Database backend (PostgreSQL)
- Cloud deployment (AWS/GCP)
- Distributed processing
- Enhanced AI models

---

**Built to solve real banking challenges with AI-powered automation** 🚀