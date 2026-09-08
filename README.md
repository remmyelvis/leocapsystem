# Leocap System

A comprehensive Loan Origination, KYC Verification, and Loan Management platform built with Flask (Backend API) and a modern frontend dashboard.

---

## 🌟 Key Features

- **Authentication & Role-Based Access Control**:
  - Multi-tier roles: `admin`, `hr`, `finance`, and `applicant`.
  - Secure session / token management with password reset workflows.
- **Applicant & Loan Management**:
  - Full loan origination lifecycle: Application submission, KYC document verification, approval, disbursement, repayment tracking, escalation, and loan amendment.
  - Multi-document upload management (passports, payslips, bank statements, applicant photos).
- **Automated Financial Calculations & Statements**:
  - Dynamic interest rate calculations and amortized payment schedules.
  - PDF statement generation and export capabilities.
- **Reporting & Analytics**:
  - Dashboard KPIs (total disbursed, repayments, arrears, default risk metrics).
  - Excel and PDF export services for finance and audit teams.
- **Email & Notification Engine**:
  - Automated status updates and notification dispatchers for HR, Finance, and Applicants.

---

## 🏗️ Project Architecture

```
leocap-system/
├── backend/                  # Flask REST API application
│   ├── website/              # Core application package
│   │   ├── __init__.py       # App factory and blueprint registration
│   │   ├── models.py         # SQLAlchemy database models
│   │   ├── auth.py           # Authentication routes
│   │   ├── applicant.py      # Applicant profile endpoints
│   │   ├── application.py    # Loan application processing
│   │   ├── reports.py        # Financial & status reports
│   │   ├── dashboard.py      # KPI & dashboard metrics
│   │   ├── statement_service.py # PDF statement generation
│   │   ├── export_service.py # Report export logic
│   │   └── config.py         # App configuration
│   ├── app.py                # Server entry point
│   ├── requirements.txt      # Python dependencies
│   └── passenger_wsgi.py     # Production WSGI entry point
├── frontend/                 # Web client assets and compiled distribution
│   ├── assets/               # UI static assets
│   ├── dist/                 # Production build distribution
│   └── index.html            # Main dashboard interface
├── .gitignore                # Git ignore configuration
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **pip** (Python package manager)
- **Node.js 18+** (for frontend development if applicable)

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy `website/.env.example` to `website/.env` and update configuration values:
   ```bash
   cp website/.env.example website/.env
   ```

   Key environment variables:
   ```ini
   DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/leocap_db
   SECRET_KEY=your-secret-key-here
   SENDER_ADDRESS=notifications@example.com
   SENDER_PASSWORD=your-email-password
   HR_EMAIL=hr@example.com
   FINANCE_EMAIL=finance@example.com
   SYSTEM_URL=http://localhost:5000
   ```

5. **Initialize Database and Run Migrations**:
   ```bash
   python make_migrations.py
   ```

6. **Start the Development Server**:
   ```bash
   python app.py
   ```
   The backend API will be available at `http://127.0.0.1:5000`.

---

### Frontend Setup

The compiled distribution is served under `frontend/dist/` or directly integrated with the backend static templates.

For local standalone preview:
```bash
cd frontend
# Serve with any static web server, e.g.:
python -m http.server 3000
```

---

## 📡 API Reference Overview

Detailed documentation is available in [`backend/README.md`](backend/README.md).

| Endpoint Group | Base Path | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/auth/users` | Login, registration, token refresh, password resets |
| **Applicants** | `/api/applicants` | Applicant profiles, personal details, KYC status |
| **Applications** | `/api/applications` | Loan creation, approval, disbursement, status updates |
| **Reports** | `/api/reports` | Summary reports, default tracking, exports |
| **Dashboard** | `/api/dashboard` | Aggregated KPIs and financial overview |

---

## 🔒 Security Best Practices

- Never commit `.env` files or raw client identification documents.
- Keep uploaded documents inside secure storage.
- Always use encrypted HTTPS connections in production.

---

## 📄 License

Proprietary / All rights reserved.
