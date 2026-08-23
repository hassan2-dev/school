# Architecture — نظام إدارة درجات المدارس العراقية

## Overview

Firebase-first SPA. No separate NestJS/API server in phase 1.

```
┌─────────────────────────────────────────────────────────┐
│  React + Vite + TypeScript + Tailwind (RTL Arabic)      │
│  Auth · Dashboard · Upload · Review · Grades · Reports  │
└───────────────────────┬─────────────────────────────────┘
                        │ Firebase SDK
        ┌───────────────┼───────────────┬─────────────────┐
        ▼               ▼               ▼                 ▼
 Firebase Auth    Cloud Firestore  Firebase Storage  Cloud Functions
 (roles/claims)   (structured data) (original files) (heavy parse/AI)
```

## Core Workflow

```
Upload → Native Parser → Table Extraction → Rule Detection
  → (AI Fallback if low confidence) → Match Students
  → Validate → Human Review → Approve → Firestore Import
```

## Principles

1. **Dynamic everything** — grades, sections, subjects, components, max scores live in Firestore.
2. **Parser first, AI second** — clear headers/tables never need AI.
3. **No silent errors** — low confidence → Review Required.
4. **Maximum automation** — never ask the user for what the file already contains.
5. **Security in Rules** — Frontend is not the security boundary.

## Storage Paths

```
schools/{schoolId}/academic-years/{academicYearId}/documents/{documentId}/{fileName}
```

## Processing Pipeline (client + optional Functions)

| Step | Location | Notes |
|------|----------|-------|
| Hash / duplicate check | Client | SHA-256 of file bytes |
| DOCX / XLSX / PDF parse | Client (mammoth/xlsx/pdfjs) | Tables + text |
| Header detection | Client rules | school, year, grade, section, subject |
| Column → AssessmentComponent mapping | Client + templates | Dynamic |
| Fuzzy student matching | Client (fuse.js) | Cross-file |
| Validation | Client | Max score, negatives, missing |
| Heavy / AI fallback | Cloud Functions | Secrets stay server-side |
| Final import | Client batch + Functions for large jobs | Transactional where possible |

## Roles

| Role | Scope |
|------|--------|
| `admin` | All schools |
| `schoolAdmin` | Own `schoolId` only |
| `teacher` | Assigned sections (read/write scores) |
| `viewer` | Read-only assigned school |
