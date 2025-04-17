# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Type check: `npm run check`
- Test all: `npm test`
- Test file: `./run_specific_tests.sh client/src/__tests__/ForYou.test.tsx`
- E2E tests: `./run-e2e-tests.sh [basic|for-you|cross-page]`
- DB migrations: `npm run db:push`

## Code Style
- TypeScript with strict mode
- React components: PascalCase (ArticleView.tsx)
- Hooks: camelCase with 'use' prefix (use-auth.tsx)
- Import order: React → third-party → local (using @/ alias)
- Error handling: try/catch with toast notifications
- Database: Drizzle ORM with snake_case in DB, camelCase in code
- Testing: Jest + React Testing Library
- State: React Query for server state, React context for auth

All new code should maintain type safety and follow existing patterns in the codebase.