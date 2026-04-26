# Spec: BIL-3 Configuración de Perfil y Categorías

**ID:** BIL-3 (ST-01-03)
**Status:** Draft
**Epic:** EP-01 Acceso, consentimiento y perfil

## 1. User Story
**As a** El freelancer informal,
**I want** configurar mi perfil, moneda y categorías,
**So that** el producto refleje mi realidad financiera.

## 2. Technical Strategy
- **Backend:** 
  - Extend `users` table with `rfc` and `default_currency`.
  - Create `categories` table with `id`, `owner_id`, `name`, `type` (income/expense), and `icon`.
  - Update `GET /api/me` to include this data.
  - Create `PATCH /api/me` for profile updates.
  - Create `POST /api/categories` for custom categories.
- **Frontend:**
  - Replace stubs in `apps/web/src/routes/settings.tsx`.
  - Use `useUser` from Clerk for Photo/Name (Read-only from Billi, managed by Clerk).
  - Use `useMe` for RFC, Currency, and Categories.
  - Implement form validation using `Zod` and `react-hook-form`.

## 3. Implementation Details

### API Endpoint: `PATCH /api/me`
```json
{
  "rfc": "ABCD123456EFG",
  "defaultCurrency": "MXN"
}
```

### Profile Component Mapping
| UI Element | Data Source |
|------------|-------------|
| Name/Last Name | Clerk `user.firstName`, `user.lastName` |
| Email | Clerk `user.primaryEmailAddress` |
| Photo | Clerk `user.imageUrl` |
| RFC | Billi DB `users.rfc` |
| Currency | Billi DB `users.default_currency` |

## 4. Acceptance Criteria
- [ ] Profile page displays actual user name and email from Clerk.
- [ ] User can save their RFC (validating length and format).
- [ ] User can change their default currency (MXN/USD).
- [ ] Changes persist on refresh (Billi DB).
- [ ] No hardcoded "Demo User" values remaining.
