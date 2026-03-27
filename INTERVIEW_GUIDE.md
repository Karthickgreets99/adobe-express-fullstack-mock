# Adobe Express — Interview Guide
> Engineering Manager · System Design + Code Diagnose · 2 rounds × 45 min

---

## The S.C.A.N Framework (Use Every Time)

| Step | Action | Say Out Loud |
|---|---|---|
| **S**can | Read full code before commenting | "Let me read through this fully first..." |
| **C**ategorise | Group issues by type | "I see 3 categories of issues here..." |
| **A**nalyse | Explain WHY not just WHAT | "The root cause is X, in production this means Y..." |
| **N**avigate | Fix + prevent as a manager | "Here's the fix, and to prevent this on the team..." |

---

## Severity Rating

| Level | When to Use | Action |
|---|---|---|
| **P0 — Block PR** | Security bug, data loss, crash | Block merge immediately |
| **P1 — Fix before merge** | Perf issue, memory leak, missing error handling | Fix required |
| **P2 — Comment + approve** | Code style, naming | Inline comment |
| **P3 — Nice to have** | Refactoring opportunity | Optional note |

---

## Code Diagnose Files in This Repo

### Frontend (React / TypeScript)
| File | Issues | Concepts |
|---|---|---|
| `TemplateGallery.buggy.tsx` | 4 bugs | useMemo, useCallback, key props |
| `CollaboratorPresence.buggy.tsx` | 4 bugs | Memory leak, WebSocket cleanup, state merging |

### Backend (Node.js / TypeScript)
| File | Issues | Concepts |
|---|---|---|
| `upload.buggy.ts` | 4 P0 bugs | SQL injection, S3 path traversal, public ACL |
| `publishService.buggy.ts` | 4 bugs | Promise.allSettled, error handling, response.ok |

---

## System Design — RADIO Framework

Use this structure for every system design question:

1. **R**equirements — Clarify scope, users, scale
2. **A**rchitecture — High-level diagram (components)
3. **D**ata model — Schema, storage choices
4. **I**nterface — API design (endpoints, auth)
5. **O**ptimisation — Caching, scaling, trade-offs

---

## Key Trade-offs to Memorise

### 301 vs 302 Redirect
- **301** = Permanent → browser caches, less server load, no analytics
- **302** = Temporary → always hits server, full analytics tracking
- **Adobe recommendation**: Use 302 — analytics matter for a product company

### SQL vs NoSQL
- **MySQL** → ACID, easy joins, URL mappings
- **Cassandra** → High write throughput, click events, analytics
- **Use both** in a URL shortener

### Promise.all vs Promise.allSettled
- **Promise.all** → Fails fast if any promise rejects
- **Promise.allSettled** → Waits for all, returns success/failure per item
- **Rule**: Use `allSettled` when partial success is acceptable

### useMemo vs useCallback
- **useMemo** → Cache an expensive **value** (calculation result)
- **useCallback** → Cache a **function reference** (stable identity)

---

## AWS Services — Know These for Adobe Interview

| Service | Use Case in Adobe Express |
|---|---|
| **S3** | Store user-uploaded images, videos, templates |
| **CloudFront** | CDN — serve assets globally with low latency |
| **ElastiCache (Redis)** | Cache hot URLs, sessions, template metadata |
| **SQS / Kafka** | Async job queue for image processing, analytics |
| **Lambda** | Serverless image resizing, thumbnail generation |
| **CloudWatch** | Monitoring, alerts, log aggregation |
| **RDS (MySQL)** | User data, template metadata, URL mappings |
| **CloudFormation** | Infrastructure as code — see `/infrastructure` folder |

---

## Manager Lens — Always Close With This

After identifying code issues, Adobe wants to hear:

**1–2 issues:**
> "I'd add inline PR comments explaining the why, not just the what — so the engineer learns and doesn't repeat it."

**3+ issues:**
> "I'd have a private conversation. I'd walk through each issue together and ask them to revisit our PR checklist before resubmitting."

**Recurring pattern:**
> "This tells me something systemic — maybe our PR guidelines aren't clear, or we need ESLint rules to catch these automatically before they reach review."

---

## Quick Reference — React Hooks

```typescript
// useMemo — cache expensive calculation
const results = useMemo(() => 
  templates.filter(t => t.name.includes(search)),
  [templates, search]  // only recompute when these change
);

// useCallback — stable function reference
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, [doSomething]);  // only recreate when deps change

// useEffect cleanup — prevent memory leaks
useEffect(() => {
  const socket = new WebSocket(url);
  return () => socket.close();  // cleanup on unmount
}, [url]);
```

---

## Git Workflow for This Repo

```bash
# Clone
git clone https://github.com/Karthickgreets99/adobe-express-fullstack-mock

# Create a practice branch
git checkout -b practice/code-diagnose-round1

# After fixing bugs, commit with clear message
git add .
git commit -m "fix: resolve useMemo and useCallback issues in TemplateGallery"

# Push
git push origin practice/code-diagnose-round1
```
