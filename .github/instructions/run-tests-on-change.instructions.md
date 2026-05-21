---
name: "Run Tests After Changes"
description: "Run npm test after editing frontend source files, and Maven tests after editing backend files, to catch regressions"
applyTo: "frontend/react-app/**/*.{ts,tsx},backend/**/*.{kt,kts,java}"
---

# Run Tests After Changes

After editing any file matched by this instruction, run the relevant test suite before considering the task done.

## Frontend changes

```bash
cd frontend/react-app && npm test
```

To run a specific test file (or files) instead of the whole suite, use vitest directly:

```bash
cd frontend/react-app && npx vitest run src/test/SomeFile.test.tsx
```

- Fix any failing tests caused by your change before finishing.
- If lint was also run (`npm run lint`), resolve errors and warnings introduced by your change.

## Backend changes

If any change touches the `backend/` folder, also run the backend test suite:

```bash
cd backend && mvn test
```

- Fix any failing tests caused by your change before finishing.
