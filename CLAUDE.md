<!-- HARNESS:START
     version=0.32.0
     schema=1
     agent=awsysco-ts-sdk
     updated=2026-07-18T02:25:54Z
     DO NOT EDIT THIS BLOCK — regenerate with: harness-ctl update /Users/patrickbertsch/dev/awsysco-ts-sdk
-->

# Harness — Active Constraints

**This file is the entry point for every task in this project — always start here.**

**Agent:** `awsysco-ts-sdk` · trust: `worker` · model: `mid`
**Budget:** 40 steps · 80000 tokens · $3.00 per session
**Privacy:** local_preferred — local models preferred; cloud only on low confidence
**Memory namespace:** `awsysco-ts-sdk-worker`


## Must escalate (blocks until human approves)

- `create_pr`

- `deploy`

- `spend`



## Available tools
See `harness/TOOLS.md` for full reference with parameter schemas.

- `web_search` — search the web via Brave/Google
- `web_fetch` — fetch and extract URL content
- `file_ops` — read/write files within the project root
- `memory_store` / `memory_search` — per-session key-value memory

## Project overrides (harness.yaml)

*(no harness.yaml found — using manifest defaults)*


<!-- HARNESS:END -->

---


# Harness — AwsyscoTsSdk

**Agent:** `awsysco-ts-sdk` · trust: `worker` · model: `mid`
**Project root:** `~/dev/awsysco-ts-sdk`
**Remote:** `https://github.com/AlphaWaveSystems/awsysco-ts-sdk`
**Stack:** `TypeScript/Node.js`

## Startup

Before working:
1. Read this file
2. `cd ~/dev/awsysco-ts-sdk`
3. Run verification: `npm run typecheck && npm test`
4. Check `git status` and `git log --oneline -10`

## Working rules

- Branch names: `feat/awsysco-ts-sdk`, `fix/awsysco-ts-sdk`, `chore/awsysco-ts-sdk`
- Always work in a git worktree: `git worktree add .worktrees/<branch> -b <branch>`
- Stage specific files only — never `git add .`
- Commit format: `type: description` (feat/fix/chore/refactor/docs)
- PRs required for all merges — no direct commits to main/master
- Run verification before every commit

## Verification

```bash
npm run typecheck && npm test
```

## Definition of done

- [ ] Implementation complete and verified
- [ ] Tests pass
- [ ] PR created (or commit staged if no remote)
- [ ] No regressions in adjacent features

## Guardrails

Bounded autonomy. Escalate deploys and spend to Zeus.
