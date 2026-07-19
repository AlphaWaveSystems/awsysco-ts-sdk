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
