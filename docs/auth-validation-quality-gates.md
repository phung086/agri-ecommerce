# Authentication, validation, and quality gates

## Authentication and authorization flow

1. `POST /api/auth/login` accepts an email or Vietnamese phone number and a password.
2. `AuthServiceImpl` normalizes the identifier, applies login-attempt throttling, verifies the BCrypt password, and rejects inactive users.
3. `JwtTokenProvider` signs a token whose subject is the user ID.
4. `JwtAuthenticationFilter` verifies the token on every protected request and reloads the user from the database.
5. `UserPrincipal` derives `ROLE_ADMIN`, `ROLE_CUSTOMER`, or `ROLE_DELIVERY_STAFF` from the current database role and rejects banned/deleted users.
6. Controllers apply method-level authorization. Admin and delivery endpoints require their role. Profile endpoints use `isAuthenticated()` because they are self-scoped by `principal.getId()` and are shared by customer and admin profile screens.

Frontend route checks improve user experience, but backend authorization is the security boundary.

## Validation strategy

- Frontend validation gives immediate feedback and normalizes common Vietnamese phone formats.
- Jakarta Bean Validation rejects malformed request bodies at controller boundaries.
- Service validation normalizes and rechecks security- or identity-sensitive values such as email and phone numbers.
- Database constraints remain the final integrity layer for unique email and required relationships.
- Unexpected server exceptions are logged internally and return a generic response without leaking implementation details.

## Quality gates

- `npm run lint`: ESLint for the complete frontend.
- `npm run lint:ci`: ESLint with the current warning budget; new warnings fail CI.
- `npm run build`: production Next.js build.
- `npm run quality`: frontend lint and production build.
- `bash mvnw test`: complete backend test suite.
- Husky runs `lint-staged` before commits and checks staged frontend source files.
- GitHub Actions runs backend tests plus frontend lint/build for pull requests and pushes to `develop`.

## Known technical debt

- The frontend is JavaScript-first. Migrating route-by-route to TypeScript should be a dedicated refactor, not mixed into a release fix.
- Some existing image elements still trigger Next.js optimization warnings.
- UI text is only partially centralized; moving remaining hard-coded text into the existing i18n layer should be incremental.
