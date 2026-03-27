# Adobe Express — Full Stack Mock Interview Repository

> Built by Karthick Gunasekaran | Adobe EM Interview Prep
> Stack: React · Node.js · TypeScript · AWS · Redis · Kafka

## What this repo covers
This repository mirrors the Adobe Express engineering stack described in the JD.
Each folder contains realistic code samples used for mock interview practice — including intentional bugs to diagnose and fixed versions to study.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Web Components |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL, Cassandra, Redis |
| Cloud | AWS S3, CloudFront, Lambda, CloudWatch |
| Messaging | Apache Kafka |
| AI Tooling | GitHub Copilot, Claude API |

## Repository Structure
```
adobe-express-fullstack-mock/
├── frontend/          # React + TypeScript frontend
│   └── src/
│       ├── components/    # UI components (with bug + fix versions)
│       ├── hooks/         # Custom React hooks
│       ├── services/      # API service layer
│       └── utils/         # Shared utilities
├── backend/           # Node.js + Express backend
│   └── src/
│       ├── routes/        # API route handlers
│       ├── services/      # Business logic
│       ├── middleware/     # Auth, rate limiting, validation
│       └── models/        # DB models
├── infrastructure/    # AWS CDK / CloudFormation configs
└── .github/workflows/ # CI/CD pipelines
```

## Interview Practice Areas
1. Code Diagnose — find bugs in realistic components
2. System Design — architecture diagrams and trade-offs
3. API Design — REST endpoints with auth and validation
4. Performance — useMemo, useCallback, caching strategies
5. Security — XSS, SQL injection, auth vulnerabilities

## How to run
```bash
# Frontend
cd frontend && npm install && npm start

# Backend
cd backend && npm install && npm run dev
```
