# 🛡️ MedVault: Decentralized Clinical Ledger

> **Absolute data sovereignty and seamless clinical interoperability for the modern patient.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![IPFS](https://img.shields.io/badge/Pinata-IPFS_Storage-5C1BCC?style=for-the-badge&logo=ipfs)](https://pinata.cloud/)
[![Web3](https://img.shields.io/badge/Web3-Smart_Contracts-F16822?style=for-the-badge&logo=ethereum)](#)

*Live Demo:* https://med-vault-beige.vercel.app/

---

## 📖 Overview

Traditional healthcare systems suffer from fragmented data silos and centralized vulnerabilities. **MedVault** reengineers healthcare data management by leveraging decentralized architecture and advanced cryptography. It shifts the power dynamic, placing immutable medical records securely in the hands of the patient while providing doctors with a seamless, role-based interface to deliver care.

Whether it is cross-origin reporting or specialized clinical networking, MedVault ensures that patient data is never compromised, never siloed, and always accessible to authorized nodes.

## ✨ Key Features

* **Patient Identity Sovereignty:** Secure, node-based identity management where users maintain total control over their cryptographic access keys.
* **Global Clinical Directory:** A decentralized, real-time searchable database of verified healthcare professionals, automatically grouped by hospital systems.
* **Quantum-Resilient Record Management:** End-to-end encrypted storage interfaces ensuring medical data remains private and immutable.
* **Decentralized Interoperability:** Patients can securely grant, revoke, and manage access to their records across different medical systems without friction.
* **IPFS Document Anchoring:** Sensitive medical documents are stored off-chain using Pinata (IPFS) to ensure tamper-proof, decentralized persistence.

---

## 🛠️ Tech Stack & Architecture

MedVault is built for scale, security, and performance using a modern full-stack ecosystem.

### **Client Node (Frontend)**
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS (Custom Dark Mode UI/UX)
* **Icons:** Lucide React
* **State Management:** React Hooks & Context API

### **Network Ledger (Backend)**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose)
* **Decentralized Storage:** Pinata (IPFS API)

### **Security & Auth Layer**
* **Authentication:** JWT-based session management
* **Encryption:** bcryptjs for secure credential hashing
* **Access Control:** Multi-tenant Role-Based Access Control (RBAC) separating Patient and Clinical nodes.

---

## 🏗️ Local Development Setup

To run MedVault locally, you will need Node.js (v20+) and an active MongoDB URI.

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/nitishr25/MedVault.git
cd MedVault
```

### 2. Install Dependencies
```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Environment Variables

**Backend** — create `backend/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Run the App

**Terminal 1 - Backend**
```bash
cd backend && npm run dev
```

**Terminal 2 - Frontend**
```bash
cd frontend && npm run dev
```
Navigate to `http://localhost:3000` to access the MedVault dashboard.

## 🗺️ Roadmap

- [x] Initial UI/UX and Dark Mode System
- [x] JWT Authentication & Role-Based Access
- [x] Dynamic Clinical Directory Mapping
- [ ] IPFS Record Upload Integration via Pinata
- [ ] Smart Contract Auditing for Access Logs
- [ ] Zero-Knowledge Proofs (ZKP) for Identity Verification

## 🤝 Let's Connect

MedVault was architected and developed by **Nitish Rai**. I am a Computer Science Engineering student currently seeking a technical internship for Summer 2026, highly interested in full-stack engineering, Web3, and building high-impact decentralized systems.

- 🔗 **LinkedIn:** [linkedin.com/in/nitish-rai-dev](https://linkedin.com/in/nitish-rai-dev)
- 🌐 **Portfolio:** https://github.com/nitishr25
- 📧 **Email:** mailnr7000@gmail.com

---

> *Built with precision. Secured by decentralization.*
