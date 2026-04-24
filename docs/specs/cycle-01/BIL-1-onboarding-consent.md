---
id: BIL-1
title: "ST-01-01: Onboarding con propuesta de valor y consentimiento"
cycle: 1
epic: EP-01
milestone: MS-01
estimate: S
status: Todo
owner: Fernando
linear_url: "https://linear.app/billi/issue/BIL-1"
branch_name: "eduardolalo1999/bil-1-st-01-01-onboarding-con-propuesta-de-valor-y-consentimiento"
blocked_by: []
blocks:
  - BIL-2
depends_on_adr:
  - ADR-003
---

# BIL-1: Onboarding con propuesta de valor y consentimiento

## 1. Purpose

This slice establishes the first touchpoint between Billi and a new user. The indebted professional landing on `/landing` for the first time has no mental model of what Billi does with their financial data or who holds it. Without an explicit, understandable consent moment the product cannot legally process personal financial data under LFPDPPP, and the user cannot make an informed decision to continue. This slice delivers: (a) a value-proposition section that communicates what Billi does in one screen, and (b) a consent panel in plain Spanish that lists every data category, every sub-processor, and every user right — gating sign-in behind explicit acceptance.

## 2. Scope Boundaries

### In scope

- Rendering the value-proposition section on the `/landing` route.
- Rendering a consent panel/modal on the same route when the user has not yet accepted consent.
- Displaying the full consent copy (see Section 5) inside the panel.
- Writing a structured consent record to `localStorage` under the key `billi.consent.v1` upon explicit acceptance.
- Disabling sign-in and sign-up CTAs until consent is accepted in the current browser session.
- Enabling sign-in and sign-up CTAs after consent is accepted.
- Showing a persistent "Aviso de privacidad" footer link after consent has been accepted (so the copy remains reachable without re-triggering the modal).
- Re-showing the consent modal if the stored consent record refers to an outdated copy version (hash mismatch, see Section 7).
- Skipping the modal (not re-showing it) when the user revisits and a valid consent record already exists in `localStorage`.

### Out of scope

- Any Clerk authentication UI (sign-in form, sign-up form, OAuth buttons) — those are BIL-2.
- Syncing the consent record to Turso — that sync happens on first authenticated request in BIL-2.
- Email capture, marketing opt-in, or any data collection during this step.
- Multi-language support (Spanish is the only required locale for MVP).
- Server-side session state; this slice is entirely client-side.
- Routing to a new page; onboarding is an overlay/section on `/landing`, not a separate route.

## 3. Acceptance Criteria (Gherkin, expanded)

```gherkin
Feature: Onboarding — value proposition and consent

  Background:
    Given the user navigates to /landing

  # --- Core Linear AC ---

  Scenario: First-time visitor sees value prop and consent copy
    Given no consent record exists in localStorage
    When the landing page finishes rendering
    Then the value-proposition section is visible
    And the consent modal/panel is visible
    And the consent copy is written in plain Spanish
    And the copy mentions that Billi uses artificial intelligence (IA)
    And the copy mentions that identity data is stored with Clerk Inc. in the United States
    And the copy mentions that financial data is stored encrypted in Turso
    And the copy mentions the user's ARCO rights (access, rectification, cancellation, opposition)

  # --- Implicit AC (a): CTAs blocked before consent ---

  Scenario: Sign-in and sign-up CTAs are disabled before consent is accepted
    Given no consent record exists in localStorage
    When the landing page finishes rendering
    Then the sign-in CTA button is present in the DOM
    And the sign-in CTA button has the attribute aria-disabled="true" or is rendered as a disabled button
    And the sign-up CTA button is present in the DOM
    And the sign-up CTA button has the attribute aria-disabled="true" or is rendered as a disabled button
    And clicking either CTA does not trigger navigation or any Clerk modal

  # --- Implicit AC (b): CTAs enabled and localStorage written after consent ---

  Scenario: Accepting consent enables CTAs and writes localStorage
    Given no consent record exists in localStorage
    And the consent modal is open
    When the user clicks the "Acepto" (accept) button
    Then the consent modal is dismissed
    And localStorage key "billi.consent.v1" exists
    And the stored record contains version: 1
    And the stored record contains acceptedAt as a positive integer (Unix seconds)
    And the stored record contains a non-empty copyHash string
    And the sign-in CTA button is enabled (not disabled, not aria-disabled)
    And the sign-up CTA button is enabled

  # --- Implicit AC (c): Returning visitor with valid consent ---

  Scenario: Returning visitor with valid consent skips modal
    Given localStorage key "billi.consent.v1" exists with a valid record matching the current copyHash
    When the landing page finishes rendering
    Then the consent modal is NOT shown
    And a "Aviso de privacidad" link is visible in the page footer
    And clicking the footer link opens the consent copy for review (without re-gating the CTAs)
    And the sign-in CTA button is enabled

  # --- Implicit AC (d): Copy hash mismatch triggers re-consent ---

  Scenario: Returning visitor with stale consent copy is re-prompted
    Given localStorage key "billi.consent.v1" exists with a copyHash that does not match the current copy
    When the landing page finishes rendering
    Then the consent modal is shown again
    And the CTAs remain disabled until the user accepts again

  # --- Implicit AC (e): Consent copy required disclosures ---

  Scenario: Consent copy contains all six required disclosures
    Given the consent modal is open
    Then the copy includes: what Billi does (purpose)
    And the copy includes: which data categories are collected
    And the copy includes: use of AI / OpenRouter for educational responses
    And the copy includes: identity data stored with Clerk Inc. in the United States
    And the copy includes: financial data stored encrypted in Turso
    And the copy includes: ARCO rights and a contact method
```

## 4. Consent Copy Draft (Spanish) — DRAFT, pending UX review

The following text is the normative source for what must appear inside the consent panel. The `copyHash` stored in `localStorage` must be a deterministic hash of this copy (e.g., SHA-256 of the canonical UTF-8 string); any material change to this text must produce a new hash value and thereby trigger re-consent for existing users.

---

**Billi — Aviso de privacidad simplificado**

**¿Qué hace Billi?**
Billi es un asistente financiero personal diseñado para profesionistas con deudas. Te ayuda a entender tu situación financiera, organizar tus gastos y crear un plan para mejorar tu salud económica.

**¿Qué datos recolectamos?**
- Datos de identidad: nombre y correo electrónico que proporcionas al crear tu cuenta.
- Datos financieros: facturas, estados de cuenta y comprobantes que tú mismo subes o compartes con Billi.
- Datos de uso: interacciones dentro de la app para mejorar el servicio.

**Uso de inteligencia artificial**
Billi utiliza modelos de inteligencia artificial (IA) proporcionados por OpenRouter para generar respuestas educativas sobre finanzas personales. Ningún dato financiero identificable se comparte directamente con los modelos de IA; los mensajes son procesados con técnicas de anonimización antes de enviarse.

**¿Dónde se almacenan tus datos?**
- *Datos de identidad:* son gestionados por Clerk Inc., empresa con sede en los Estados Unidos de América. Al aceptar este aviso, consientes la transferencia de tus datos de identidad a los servidores de Clerk en EE.UU., de conformidad con el artículo 36 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
- *Datos financieros:* se almacenan cifrados en Turso, una base de datos distribuida con cifrado en tránsito y en reposo. No son accesibles para terceros sin tu autorización explícita.

**Tus derechos ARCO**
Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales (derechos ARCO). Para ejercerlos, escríbenos a: **privacidad@billi.mx**

Al hacer clic en **"Acepto"**, confirmas que leíste y entendiste este aviso y que consientes el tratamiento de tus datos en los términos descritos. Si no estás de acuerdo, cierra esta página.

---

## 5. UI Surface

The following files are created or modified as part of this slice. No other files should be touched.

| File | Action | Purpose |
|------|---------|---------|
| `apps/web/src/routes/landing.tsx` | Modify | Import and mount `ValueProp` and `ConsentModal` components; read consent state from `useConsent` hook; conditionally disable CTAs |
| `apps/web/src/components/onboarding/value-prop.tsx` | Create (new) | Stateless presentational component rendering the value-proposition headline, subheadline, and feature bullets |
| `apps/web/src/components/onboarding/consent-modal.tsx` | Create (new) | Modal/panel component that renders the consent copy draft (Section 4), an "Acepto" primary button, and a dismiss/close control that does NOT mark consent as accepted |
| `apps/web/src/lib/consent.ts` | Create (new) | Exports `getConsent()`, `setConsent()`, `isConsentValid()`, and `COPY_HASH` constant. Handles all `localStorage` read/write with version and hash checks |

### Component responsibilities (non-exhaustive, for test author orientation)

**`consent.ts`**
- `COPY_HASH`: a compile-time constant string (SHA-256 or similar deterministic hash of the canonical consent copy). Must be updated whenever the copy changes materially.
- `getConsent()`: reads and JSON-parses `localStorage["billi.consent.v1"]`; returns `null` if absent or unparseable.
- `setConsent()`: writes `{ version: 1, acceptedAt: Math.floor(Date.now() / 1000), copyHash: COPY_HASH }` to `localStorage["billi.consent.v1"]`.
- `isConsentValid(record)`: returns `true` iff record is non-null, `record.version === 1`, and `record.copyHash === COPY_HASH`.

**`consent-modal.tsx`**
- Receives `onAccept: () => void` prop; calls it when the user clicks "Acepto".
- Renders a visually prominent modal with scroll support for the consent copy on small screens.
- Must be keyboard-accessible (focus trap, Escape closes without accepting).

**`value-prop.tsx`**
- No props required for MVP. Renders static content.
- Must be accessible: heading hierarchy starts at `h1` or `h2` depending on landing page context.

**`landing.tsx` integration**
- On mount, reads consent via `getConsent()` / `isConsentValid()`.
- If invalid: renders `<ConsentModal>` with `onAccept` that calls `setConsent()` and updates local state.
- If valid: does not render modal; renders footer link to open consent copy in read-only mode.
- CTAs (`data-testid="cta-sign-in"` and `data-testid="cta-sign-up"`) must be `disabled` / `aria-disabled="true"` when consent is invalid.

## 6. Data Contracts

### localStorage record — key: `billi.consent.v1`

```typescript
interface ConsentRecord {
  version: 1;           // Literal 1. Increment if the schema itself changes.
  acceptedAt: number;   // Unix seconds (Math.floor(Date.now() / 1000)).
  copyHash: string;     // Deterministic hash of the canonical consent copy text.
}
```

**Why `copyHash`?** Regulators may require re-consent when material disclosures change (e.g., adding a new sub-processor, changing data jurisdiction). Storing a hash of the copy text at the time of acceptance lets the client detect drift without a server round-trip. When `COPY_HASH` in `consent.ts` changes (because the copy changed), any stored record with a mismatching hash is treated as stale and the modal is re-shown. The hash is computed at build time and baked in as a constant; it is not computed at runtime from the DOM.

**Sync to Turso (out of scope for BIL-1):** BIL-2 reads this record after authentication and upserts `consent_v` (integer, maps to `version`) and `consent_at` (unix seconds, maps to `acceptedAt`) into the `users` mirror table in Turso.

## 7. Test Plan (for the Tests step)

Test files live under `apps/web/src/components/onboarding/__tests__/` and `apps/web/src/lib/__tests__/`. Use **Vitest** + **@testing-library/react**. Mock `localStorage` with `vi.stubGlobal` or a `localStorage` mock before each test; restore after.

| # | Test file | Test case description | What it asserts |
|---|-----------|----------------------|-----------------|
| T1 | `value-prop.test.tsx` | Value prop renders headline and feature bullets | Renders without errors; at least one `h1`/`h2` present; at least 3 feature bullet items visible |
| T2 | `consent-modal.test.tsx` | Consent modal renders all six required disclosure categories | Modal contains text matching: "Clerk Inc.", "Estados Unidos", "OpenRouter", "ARCO", "cifrad", "qué datos" (case-insensitive) |
| T3 | `landing.test.tsx` | Sign-in CTA is disabled when no localStorage record exists | `getByTestId("cta-sign-in")` has `disabled` attribute or `aria-disabled="true"`; same for `cta-sign-up` |
| T4 | `consent.test.ts` | `setConsent()` writes a valid record to localStorage | After `setConsent()`, `localStorage.getItem("billi.consent.v1")` parses to an object with `version: 1`, numeric `acceptedAt`, and non-empty `copyHash` |
| T5 | `landing.test.tsx` | Accepting consent enables CTAs | Simulate click on "Acepto" button; assert `cta-sign-in` and `cta-sign-up` are no longer disabled |
| T6 | `landing.test.tsx` | Re-render with existing valid consent skips modal | Seed localStorage with a valid record matching `COPY_HASH`; render landing; assert consent modal is not in the document |
| T7 | `consent.test.ts` | `isConsentValid()` returns false when copyHash mismatches | Call `isConsentValid({ version: 1, acceptedAt: 1700000000, copyHash: "stale-hash" })`; assert returns `false` |
| T8 | `landing.test.tsx` | Stale copyHash re-shows modal | Seed localStorage with record where `copyHash !== COPY_HASH`; render landing; assert consent modal is present in the document |

All 8 test cases must fail before implementation and pass after.

## 8. Verify (PASS/FAIL Checklist)

Each item is binary. The slice is not complete until every item is checked.

- [ ] Running `bun test apps/web/src/components/onboarding` exits with code 0 and all 6 component-level test cases pass.
- [ ] Running `bun test apps/web/src/lib/__tests__/consent.test.ts` exits with code 0 and T4 and T7 pass.
- [ ] Running `bun test apps/web/src/routes/landing.test.tsx` exits with code 0 and T3, T5, T6, T8 pass.
- [ ] Lighthouse accessibility score is >= 95 on `/landing` with the consent modal open (measured via `npx lighthouse` or Chrome DevTools).
- [ ] Consent copy manually reviewed by the owner and confirmed to contain all six disclosures: (1) purpose / what Billi does, (2) data categories collected, (3) AI / OpenRouter usage, (4) Clerk Inc. + United States jurisdiction, (5) Turso encrypted storage, (6) ARCO rights and contact email.
- [ ] Visual check on a 375 px viewport: consent modal content is not clipped; copy is scrollable; "Acepto" button is fully visible and tappable.
- [ ] Visual check on a 1280 px viewport: value-proposition section and consent panel are laid out without overflow or broken alignment.
- [ ] `localStorage` key `billi.consent.v1` is absent before any interaction, present after "Acepto", and contains a `copyHash` string that is non-empty.
- [ ] Both CTA buttons carry `data-testid="cta-sign-in"` and `data-testid="cta-sign-up"` so automated tests can target them without brittle selectors.
- [ ] No Clerk SDK import or Clerk UI component is referenced in any file touched by this slice.

## 9. LFPDPPP Compliance Note

Mexico's Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), Article 36, requires that international data transfers be disclosed to the data subject and that their consent be obtained before the transfer occurs. Because ADR-003 adopts Clerk — a US-domiciled identity provider — as the sub-processor for identity data, this onboarding slice fulfills Art. 36 by: (a) explicitly naming Clerk Inc. and the United States as the receiving entity and jurisdiction in the consent copy, (b) obtaining affirmative user action ("Acepto" button click) before any authentication or data transfer can happen, and (c) persisting a timestamped, versioned consent record so that the fact of consent can be demonstrated during an INAI audit. This slice constitutes the legal gate; no Clerk call, sign-in redirect, or data submission is permitted until `isConsentValid()` returns `true`.

## 10. Open Questions for UX Review

- **Consent panel layout:** Should the consent copy be presented as a modal dialog overlaying the value-prop section, or as an inline section that pushes content down? The modal approach is assumed here, but an inline sticky footer panel may be more accessible on mobile — UX to decide before the Tests step.
- **"Acepto" button wording and secondary action:** The current copy offers only an accept path. LFPDPPP does not require a "reject" button, but UX may want a "Rechazar" or "No acepto" option (which would either exit the product or leave CTAs disabled). The spec leaves the secondary action undefined pending UX guidance.
- **Copy hash strategy:** The spec assumes a compile-time constant hash baked into `consent.ts`. If the copy is later moved to a CMS or i18n file, the hash mechanism will need revisiting — UX and engineering to align on where the canonical copy lives before implementation begins.
