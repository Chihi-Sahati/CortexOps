<div align="center">

# CortexOps v1.0

### CortexOps

**Author:** AlHussein A. AlSahati &nbsp;|&nbsp; **Supervisor:** Dr. Houda Chihi

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![Lab](https://img.shields.io/badge/Lab-InnovCOM_SupCOM-8B5CF6?style=for-the-badge)](https://supcom.tn)

<br/>

> Research project at **InnovCOM Lab, Sup'COM Tunisia**
> Submitted to **IEEE Transactions on Network and Service Management**

</div>

---

## 📖 Table of Contents

- [Abstract](#-abstract)
- [Key Innovations](#-key-innovations)
- [Architecture](#-architecture)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start with Docker](#-quick-start-with-docker)
- [Manual Setup (Dev Mode)](#-manual-setup-dev-mode)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [AI Engine Setup](#-ai-engine-setup)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Academic Citation](#-academic-citation)

---

## 📜 Abstract

CortexOps is an autonomous **Agentic Workflow Engine** designed for complex enterprise automation environments. The system implements a novel **Reasoning-as-a-Service (RaaS)** model through the "Cortex Brain" orchestrator, incorporating a **Zero Trust Security Pipeline** with 6-step verification achieving sub-200ms non-AI response times.

The architecture introduces a **Self-Healing Correlation Engine** capable of dynamic API adaptation (Fast Path `<50ms`) and complex logic reasoning (Slow Path `<1000ms`), enabling real-time fault recovery and anomaly detection across heterogeneous cloud infrastructures.

Through the integration of the **ReAct (Reasoning and Acting)** pattern, Token Bucket rate limiting, and Dual-Layer SAST/DLP security, the system achieves unprecedented availability and safety in AI-driven task execution.

```
User Intent (NL) -> [Cortex Brain] -> [Security Gate] -> [Sandbox Execution] -> [Result]
                        |                  |                      |
                  (Plan/Reason)      (SAST/Prompt)          (Self-Healing)
```

---

## 🔬 Key Innovations

### 🤖 The Cortex Brain (v1.0)

| Agent | Scientific Role |
|-------|----------------|
| **Planner** | Decomposes complex natural language intent into executable JSON DAGs |
| **Reasoner** | Implements the ReAct loop to maintain execution state and strategic pivots |
| **Executor** | Hardened execution environment for secure Python and Node.js tasks |
| **Validator** | Post-execution verification ensuring outputs adhere to defined schemas |

### 🔗 Self-Healing Resilience

| Mechanism | Trigger | Response |
|-----------|---------|----------|
| **Dynamic API Adaptation** | Schema shifts (HTTP 422) | Auto-regenerates request logic |
| **Auth Recovery** | Token expiration (HTTP 401) | Native Vault integration, auto token injection |
| **Intelligent Backoff** | Rate limits (HTTP 429) | Adaptive exponential backoff |

### 🔐 Secure Runtime Environment

- **Security Guardrails** — Hard limits on execution cost ($), token usage, and time
- **DLP Engine** — Automatic scanning and masking of PII, SSN, and nested API secrets
- **SAST Guard** — AST-level analysis blocking dangerous imports (`os`, `subprocess`) in real-time
- **Zero Trust Pipeline** — 6-step verification before any action executes

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                        │
│         Next.js 16 · React Flow · TailwindCSS           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼─────────────────────────────────┐
│              Next.js API Routes (Node.js)                │
│         Prisma ORM · BullMQ · NextAuth.js               │
└────────┬──────────────────────────────┬─────────────────┘
         │ REST                          │ SQL
┌────────▼────────┐             ┌────────▼────────┐
│  AI Engine (RaaS) │             │   PostgreSQL 16  │
│  Python FastAPI   │             │   + pgvector     │
│  LangChain · LLM │             └─────────────────┘
└────────┬────────┘
         │
┌────────▼────────────────────────────────────────────────┐
│   ChromaDB (Vector Store) · Redis (Queue + Cache)       │
└─────────────────────────────────────────────────────────┘
```

**Performance Targets:**

| Path | Latency | Use Case |
|------|---------|----------|
| Fast Path | `< 50ms` | Self-healing, known failure patterns |
| Standard API | `< 200ms` | Non-AI operations |
| Slow Path (AI) | `< 1000ms` | Full ReAct reasoning loop |

---

## ✨ Features

### 🎨 Hybrid Interface
- **Visual Editor** — drag-and-drop workflow builder (React Flow)
- **Natural Language** — describe your workflow in plain text, AI builds it
- **Command Palette** (`Ctrl+K`) — lightning-fast keyboard navigation

### 🔐 Security First
- AES-256-GCM credential encryption at rest
- JWT-based session authentication (NextAuth.js v5)
- Role-Based Access Control (RBAC) — Admin, Editor, Viewer
- Docker-in-Docker sandboxed code execution

---

## 📋 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | ≥ 24 | Run all services |
| [Bun](https://bun.sh) | ≥ 1.1 | JS runtime & package manager |
| [Node.js](https://nodejs.org) | ≥ 20 | Tooling compatibility |
| [Python](https://www.python.org) | ≥ 3.11 | AI Engine (manual mode) |
| [Git](https://git-scm.com) | Latest | Version control |

---

## 🐳 Quick Start with Docker

> Recommended. One command starts the entire stack.

### 1. Clone the repository

```bash
git clone https://github.com/Chihi-Sahati/CortexOps.git
cd CortexOps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Minimum required values in `.env`:

```env
OPENAI_API_KEY=sk-...

# Generate these:
NEXTAUTH_SECRET=          # openssl rand -base64 32
CREDENTIAL_ENCRYPTION_KEY=  # openssl rand -hex 32
```

### 3. Start all services

```bash
docker-compose up -d --build
```

| Container | Service | Port |
|-----------|---------|------|
| `cortexops-app` | Next.js Frontend + API | **3000** |
| `cortexops-ai-engine` | Python FastAPI (Cortex Brain) | **8100** |
| `cortexops-postgres` | PostgreSQL 16 + pgvector | **5432** |
| `cortexops-redis` | Redis (BullMQ + Cache) | **6379** |
| `cortexops-chromadb` | ChromaDB Vector Store | **8200** |
| `cortexops-executor` | Workflow Executor | **3003** |

### 4. Apply database migrations

Wait ~30 seconds for PostgreSQL to be ready, then:

```bash
bun run db:migrate:deploy
```

### 5. Open the app

Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🛠 Manual Setup (Dev Mode)

For active development with hot-reload.

### 1. Install dependencies

```bash
git clone https://github.com/Chihi-Sahati/CortexOps.git
cd CortexOps
bun install
```

### 2. Start infrastructure only (via Docker)

```bash
docker-compose up -d postgres redis chromadb
```

### 3. Initialize the database

```bash
bun run db:generate   # Generate Prisma client
bun run db:push       # Push schema
bun run db:seed       # (Optional) Sample data
```

### 4. Start the AI Engine

```bash
cd ai-engine

# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

### 5. Start the Next.js app

```bash
# New terminal at project root
bun run dev
```

### 6. (Optional) Background workers

```bash
bun run workers
```

Open **http://localhost:3000**

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `ANTHROPIC_API_KEY` | ⬜ | Anthropic Claude API key |
| `NEXTAUTH_URL` | ✅ | App URL (`http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✅ | Session signing secret |
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ | AES-256-GCM key (64-char hex) |
| `REDIS_URL` | ✅ | Redis connection string |
| `AI_ENGINE_URL` | ✅ | Python AI Engine URL |
| `SANDBOX_ENABLED` | ⬜ | Enable Docker sandboxing |
| `GUARDRAILS_MAX_COST` | ⬜ | Max spend per execution ($) |
| `GUARDRAILS_MAX_ITERATIONS` | ⬜ | Max ReAct loop iterations |

---

## 🗄 Database Setup

CortexOps uses **PostgreSQL 16 + pgvector** for relational data and AI vector embeddings.

```bash
bun run db:generate          # Regenerate Prisma client
bun run db:push              # Push schema (dev only)
bun run db:migrate           # Create and apply migration
bun run db:migrate:deploy    # Deploy migrations (production)
bun run db:migrate:status    # Show migration status
bun run db:studio            # Open Prisma Studio (browser GUI)
bun run db:seed              # Seed sample workflows
bun run db:reset             # Hard reset - deletes all data
```

---

## 🤖 AI Engine Setup

The Cortex Brain is a standalone **Python FastAPI** service implementing the RaaS model.

### Health Check

```bash
curl http://localhost:8100/ai/health
```

### Core API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/health` | GET | Service health |
| `/ai/plan` | POST | Planner Agent - generate DAG |
| `/ai/execute` | POST | Executor Agent - run a step |
| `/ai/validate` | POST | Validator Agent - verify output |
| `/ai/nl/command` | POST | Parse natural language command |

---

## 📜 Available Scripts

```bash
# Development
bun run dev              # Next.js dev server (port 3000)
bun run workers          # BullMQ background workers
bun run lint             # ESLint
bun run type-check       # TypeScript check

# Testing
bun run test             # Jest unit tests
bun run test:watch       # Jest watch mode
bun run test:coverage    # Coverage report
bun run test:e2e         # Playwright E2E tests

# Database
bun run db:generate      # Prisma client
bun run db:push          # Push schema
bun run db:migrate       # Create migration
bun run db:studio        # Prisma Studio GUI
bun run db:seed          # Sample data
bun run db:reset         # Reset all data

# Docker
bun run docker:up        # Start all containers
bun run docker:down      # Stop all containers
bun run docker:build     # Rebuild images
bun run docker:logs      # Stream logs
```

---

## 📁 Project Structure

```
CortexOps/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API route handlers
│   │   ├── login/              # Auth pages
│   │   └── page.tsx            # Main dashboard
│   ├── components/
│   │   ├── editor/             # Visual workflow editor (React Flow)
│   │   ├── chat/               # AI Chat Interface
│   │   ├── command/            # Command Palette (Ctrl+K)
│   │   ├── shared/             # Shared UI components
│   │   └── ui/                 # shadcn/ui primitives
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities, node-registry, security
│   ├── styles/                 # CSS variables and global styles
│   └── types/                  # TypeScript definitions
├── ai-engine/                  # Python Cortex Brain (RaaS)
│   └── app/
│       ├── agents/             # Planner, Reasoner, Executor, Validator
│       ├── connectors/         # Self-healing API connectors
│       └── security/           # Sandbox, SAST, DLP, guardrails
├── prisma/                     # Schema and migrations
├── mini-services/              # Workflow Executor microservice
├── db/                         # PostgreSQL init SQL
├── public/                     # Static files
├── docker-compose.yml          # Full stack container config
├── Dockerfile                  # Production Next.js image
└── .env.example                # Environment template
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, TailwindCSS |
| **Workflow Editor** | React Flow (`@xyflow/react`) |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons |
| **AI Framework** | LangChain, LangGraph, OpenAI, Anthropic |
| **AI Backend** | Python 3.11, FastAPI, Uvicorn |
| **Database** | PostgreSQL 16 + pgvector |
| **ORM** | Prisma 6 |
| **Auth** | NextAuth.js v5 |
| **Queue** | BullMQ + Redis 7 |
| **Vector Store** | ChromaDB |
| **Testing** | Jest, Playwright |
| **Containers** | Docker, Docker Compose |
| **Package Manager** | Bun 1.x |

---

## 🤝 Academic Citation

This system is developed as a research contribution at **InnovCOM Lab, Sup'COM Tunisia**, under the supervision of **Dr. Houda Chihi**, submitted to:

- **IEEE Network**
- **IEEE Transactions on Network and Service Management**

If you use CortexOps in your research, please cite:

```bibtex
@article{cortex_ops_2026,
  title={CortexOps: Secure Agentic Workflow Automation with Intelligent Self-Healing Connectors},
  author={Al-Sahati, AlHussein A. and Chihi, Houda},
  journal={IEEE Transactions on Network and Service Management / IEEE Network},
  year={2026},
  note={Submitted for publication}
}
```

---

<div align="center">

**CortexOps v1.0 — March 2026**

Built with ❤️ at **Sup'COM Tunisia** by **AlHussein A. AlSahati**

Supervised by **Dr. Houda Chihi** — InnovCOM Lab

<br/>

Star this repo if you find it useful!

</div>
