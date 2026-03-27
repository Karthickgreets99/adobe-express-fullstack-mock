#!/bin/bash
# ─────────────────────────────────────────────────────────
# Adobe Express Mock Repo — GitHub Setup Script
# Run this from inside the adobe-express-fullstack-mock folder
# ─────────────────────────────────────────────────────────

echo "Setting up Adobe Express Mock Interview Repository..."

# Step 1: Initialize git
git init

# Step 2: Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
.env.local
.DS_Store
*.log
coverage/
.nyc_output/
EOF

# Step 3: Stage all files
git add .

# Step 4: Initial commit
git commit -m "feat: Adobe Express full stack mock interview repo

- Frontend: React + TypeScript components (buggy + fixed versions)
  - TemplateGallery: useMemo, useCallback, key prop issues
  - CollaboratorPresence: WebSocket memory leak, state merging
  - Custom hooks: useFetch, useDebounce, useWebSocket

- Backend: Node.js + TypeScript services (buggy + fixed versions)
  - Upload route: S3 security, SQL injection, path traversal
  - Publish service: Promise.allSettled, error handling

- Infrastructure: AWS CloudFormation (S3, CloudFront, Redis, RDS)
- CI/CD: GitHub Actions pipeline with TypeScript + lint checks
- Docs: INTERVIEW_GUIDE.md with SCAN framework + trade-offs"

# Step 5: Add remote and push
echo ""
echo "Now run these two commands to push to GitHub:"
echo ""
echo "  git remote add origin https://github.com/Karthickgreets99/adobe-express-fullstack-mock.git"
echo "  git push -u origin main"
echo ""
echo "Or create the repo first at: https://github.com/new"
echo "  - Repository name: adobe-express-fullstack-mock"
echo "  - Description: Adobe Express EM Interview Prep — React, Node.js, AWS"
echo "  - Visibility: Public"
echo "  - Do NOT initialize with README (we already have one)"
