<div align="center">

# ⚡ PayPulse - Event-Driven Subscription & Webhook Engine

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

<p align="center">
  <b>A resilient, scalable subscription billing backend built with Domain-Driven Design (DDD), Transactional Outbox Pattern, Testcontainers, and an automated 4-stage CI/CD Quality Pipeline.</b>
</p>

---

</div>

## 📌 Overview

**PayPulse** automates recurring subscription billing, mid-month plan upgrades, payment retries, and asynchronous webhook delivery for modern SaaS applications (similar to Stripe Billing, Netflix, or GitHub Copilot).

### 🔑 Key Engineering Highlights
* **Domain-Driven Design (DDD)**: Pure domain entities (`Subscription`, `Money`) completely decoupled from frameworks and ORMs.
* **Transactional Outbox Pattern**: Atomic PostgreSQL transactions ensuring database states and outbox events write together cleanly.
* **Resilient Webhook Queue**: Asynchronous BullMQ worker queues backed by Redis with **Exponential Backoff Retries** (1s, 2s, 4s).
* **Testcontainers Integration**: Real ephemeral PostgreSQL 16 & Redis 7 Docker containers booted inside test runners for 100% reliable integration testing.
* **Network Socket Interception**: Downstream third-party payment provider calls (Stripe) intercepted at the Node.js socket level using **MSW (Mock Service Worker)**.
* **Automated CI/CD Quality Pipeline**: 4-stage GitHub Actions workflow enforcing formatting, linting, typechecking, unit tests, integration tests, and multi-stage Docker builds.

---

## 🏗️ Architecture Blueprint

```
                               ┌─────────────────────────────────────────┐
                               │       Client HTTP Request               │
                               └─────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Presentation Layer (NestJS Controllers, DTO ValidationPipes, Auth Guards)                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Application Layer (CreateSubscriptionUseCase, ProrationCalculator)                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                │                                   │
                                ▼                                   ▼
┌───────────────────────────────────────────────┐   ┌─────────────────────────────────────────────┐
│ Domain Layer (Subscription Entity, Money VO)  │   │ Infrastructure Adapter (Stripe Client)      │
└───────────────────────────────────────────────┘   └─────────────────────────────────────────────┘
                                │                                   │
                                ▼                                   ▼
┌───────────────────────────────────────────────┐   ┌─────────────────────────────────────────────┐
│ Prisma Repository & Transactional Outbox      │   │ Intercepted via MSW in Test Suites          │
└───────────────────────────────────────────────┘   └─────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────┐   ┌─────────────────────────────────────────────┐
│ PostgreSQL 16 (Testcontainers / Production)   │──►│ BullMQ + Redis 7 (Webhook Queue Worker)     │
└───────────────────────────────────────────────┘   └─────────────────────────────────────────────┘
```

---

## 🧪 Testing Spectrum & Quality Matrix

| Layer | Scope / Scenario | Technology | Execution Time |
| :--- | :--- | :--- | :--- |
| **Unit Testing** | Domain entities, state machine rules (`ACTIVE` $\rightarrow$ `PAST_DUE` $\rightarrow$ `CANCELED`). | Jest | **< 5ms** |
| **Property-Based** | Invoice proration math & discount calculations across thousands of randomized inputs. | `fast-check` | **< 20ms** |
| **Integration Test** | Atomic SQL transactions & Outbox event persistence against real Postgres. | `@testcontainers/postgresql` | **~ 5s** |
| **Queue Integration** | BullMQ webhook retry queue, backoff delays, and worker execution against real Redis. | `@testcontainers/redis` | **~ 5s** |
| **Downstream Interceptor**| Third-party Stripe credit card approval & decline scenarios intercepted at socket level. | `MSW (v1)` | **~ 10ms** |
| **E2E API Test** | Full `POST /subscriptions` endpoint testing (ValidationPipes, Controllers, DB insertion). | `Supertest` | **~ 8s** |

---

## ⚙️ CI/CD Pipeline (GitHub Actions)

Every commit and Pull Request triggers our 4-stage quality gate workflow (`.github/workflows/ci.yml`):

```
[ Push / Pull Request ]
           │
           ├──► 🛡️ 1. Static Analysis (`npx prettier`, `npx eslint`, `tsc --noEmit`)
           │
           ├──► 🧪 2. Unit & Property-Based Tests (`npm run test`)
           │
           ├──► 🛢️ 3. Testcontainers Integration & E2E API Tests (`npm run test:e2e`)
           │
           └──► 🐳 4. Production Multi-Stage Docker Image Build (`docker build`)
```

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js**: `v20.x` or higher
* **Docker Desktop**: Installed and running

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shivapal13/paypulse.git
cd paypulse
npm install
```

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Spin Up Local Services via Docker Compose
Start PostgreSQL 16, Redis 7, and PayPulse application:
```bash
docker compose up -d
```

### 4. Push Database Schema
```bash
npx prisma db push
```

---

## 📜 Available Scripts

```bash
# Development
npm run start:dev     # Start NestJS in watch mode
npm run build         # Compile TypeScript into dist/

# Testing
npm run test          # Run Unit & Property-based tests
npm run test:e2e      # Run Testcontainers Integration & E2E API tests
npm run test:cov      # Generate test coverage report

# Code Quality
npm run lint          # Run ESLint with auto-fix
npm run format        # Run Prettier code formatting
npm run format:check  # Verify Prettier compliance

# Docker
docker build -t paypulse:latest .   # Build production Docker image
```

---

## 📁 Project Directory Layout

```
paypulse/
├── .github/workflows/      # GitHub Actions CI/CD Pipeline (ci.yml)
├── prisma/                 # Prisma Schema & Database Migrations
├── src/
│   ├── domain/             # Pure Business Entities, Value Objects & Enums
│   ├── application/        # Application Services & Port Interfaces
│   ├── infrastructure/     # Database Repositories, Redis Queues, Stripe Client
│   └── presentation/       # Controllers & DTO ValidationPipes
├── test/                   # Integration & Supertest E2E Specs + MSW Mocks
├── docker-compose.yml      # Multi-container orchestration (App + Postgres + Redis)
└── Dockerfile              # Multi-stage production container build
```

---

<div align="center">
  <sub>Built with by Shiva Pal.</sub>
</div>
