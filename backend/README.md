# BagDaily Backend

Backend REST API for BagDaily UMKM E-Commerce, POS & Inventory Management System.

Built with Express.js, TypeScript strict, Drizzle ORM, postgres.js, and Supabase PostgreSQL. Compatible with Vercel Serverless Functions.

## Core Features & Business Invariants

- **Stock Model:** First Successful Payment Wins (No stock reservation on cart/checkout).
- **Concurrency & Deadlock Safety:**
  - Multi-item checkout deterministic locking by ascending `product_id`.
  - Conditional atomic decrement: `UPDATE products SET stock = stock - qty WHERE id = $1 AND stock >= qty`.
  - Bounded deadlock/serialization error retry (codes 40P01 / 40001) with exponential jitter.
  - Payment simulations serialized per order using PostgreSQL row lock `FOR UPDATE`.
  - Cashier POS idempotency keyed on UUID with deterministic hash collision detection.
- **Role-Based Access Control (RBAC):** Pelanggan, Kasir, Admin. Role injection strictly rejected at public registration.
- **Authentication:** JWT with HttpOnly SameSite Secure cookies and origin validation for CSRF mitigation.
- **Reporting & Analytics:** Paid orders only. Zero-revenue unpaid orders excluded. CSV export with formula injection escaping.

## Prerequisites

- Node.js >= 22.12
- PostgreSQL 15+ or Supabase instance

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in required variables:
- `DATABASE_URL`: Supabase Transaction Pooler URL (port 6543, sslmode=require).
- `DATABASE_MIGRATION_URL`: Supabase Session / Direct URL (port 5432, sslmode=require) for Drizzle Kit.
- `JWT_SECRET`: Random 32+ char secret.
- `FRONTEND_URL`: Allowed client origin (e.g. `http://localhost:5173`).
- `DEMO_ADMIN_PASSWORD`, `DEMO_CASHIER_PASSWORD`, `DEMO_CUSTOMER_PASSWORD`: For demo account seeding.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: For admin product image upload to Supabase Storage.

## Commands

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed 18 PRD products, shipping rates, and demo accounts
npm run db:seed

# Development server with hot reload
npm run dev

# Run unit and integration tests
npm test

# Typecheck and lint
npm run lint

# Production build
npm run build

# Start production server
npm start
```

## API Documentation

See `API-CONTRACT.md` for complete endpoints, response wrappers (`{ data: ... }`), error format, and payloads.
