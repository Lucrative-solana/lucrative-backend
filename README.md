
# Lucrative Backend

A backend service built with NestJS, designed to support a Solana-based dApp for the Solana Hackathon. This backend connects with the frontend, handling the core business logic, interacting with Solana SDKs, and managing database operations through Prisma.

---

## 📚 Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Scripts](#scripts)
- [Prisma Setup](#prisma-setup)
- [Dependencies](#dependencies)
- [License](#license)

---

## 🚀 Introduction

Lucrative Backend is a server-side component of a Solana-powered application built for the Solana Hackathon. It handles the backend logic, integrates with several Solana and Metaplex SDKs, and ensures smooth communication with the frontend.

---

## ✨ Features

- RESTful APIs built using NestJS
- Solana blockchain integration with:
  - Solana Web3.js
  - Metaplex SDK
  - Orca SDK
  - Anchor framework
- Prisma ORM for database interaction
- Secure wallet and token management
- Business logic layer abstracted from frontend

---

## 🧩 Project Structure

```
lucrative-backend/
│
├── prisma/               # Prisma schema and migrations
├── scripts/              # Custom scripts
├── src/                  # Application source code
├── test/                 # Jest test cases
├── .eslintrc.js          # ESLint configuration
├── .prettierrc           # Prettier formatting rules
├── nest-cli.json         # NestJS CLI config
├── package.json          # NPM dependencies and scripts
├── tsconfig.json         # TypeScript compiler options
```

---

## 🛠 Installation

```bash
# Clone the repo
git clone <repo-url>
cd lucrative-backend

# Install dependencies
npm install
```

---

## 🧪 Usage

To start the development server:

```bash
npm run start:dev
```

This backend should be run in tandem with the frontend, which communicates with it via API to perform key business logic and interact with the Solana blockchain.

---

## ⚙️ Scripts

| Command              | Description                           |
|---------------------|---------------------------------------|
| `start`             | Start the app                         |
| `start:dev`         | Start in watch mode                   |
| `start:prod`        | Start the built app                   |
| `build`             | Compile the app                       |
| `test`              | Run unit tests                        |
| `test:watch`        | Run tests in watch mode               |
| `test:e2e`          | Run end-to-end tests                  |
| `lint`              | Lint the code                         |
| `format`            | Format source and test files          |
| `prisma:generate`   | Generate Prisma client                |

---

## 🧬 Prisma Setup

This project uses **Prisma** as its ORM. Ensure you have the correct database connection set in your `.env` file.

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npx prisma migrate dev
```

The `prisma/schema.prisma` file defines your data models and database configuration.

---

## 📦 Dependencies

- **Backend Framework**: NestJS
- **Blockchain SDKs**: 
  - `@solana/web3.js`
  - `@metaplex-foundation/mpl-token-metadata`
  - `@orca-so/whirlpools-sdk`
  - `@coral-xyz/anchor`
- **ORM**: Prisma
- **Other Libraries**: 
  - `class-validator`
  - `decimal.js`
  - `tweetnacl`
  - `bs58`
  - `bip39`

---

## 🪪 License

UNLICENSED – This project is currently proprietary and not licensed for distribution.
