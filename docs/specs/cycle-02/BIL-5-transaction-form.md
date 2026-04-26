# Spec: BIL-5 Registro por Formulario

**ID:** BIL-5 (ST-02-02)
**Status:** Draft
**Epic:** EP-02 Captura y evidencia financiera

## 1. User Story
**As a** usuario,
**I want** registrar un movimiento con formulario estructurado,
**So that** pueda llevar control manual de mis finanzas.

## 2. Technical Strategy
- **Backend:** 
  - Reuse `POST /api/transactions` (already defined in `apps/api/src/routes/transactions.ts`).
  - Ensure server-side validation for amounts (cents) and dates.
- **Frontend:**
  - Create a modal or dedicated page for the form.
  - Implement a `TransactionForm` component using Shadcn/ui (`Form`, `Input`, `Select`, `DatePicker`).
  - Logic to switch between "Income" and "Expense".
  - Dynamic category selection based on transaction type.

## 3. Implementation Details

### Form Fields
- **Title/Description:** `text` (optional).
- **Amount:** `number` (convert to cents for storage).
- **Type:** `toggle-group` (Ingreso / Egreso).
- **Category:** `select` (populated from user categories).
- **Date:** `calendar/date-picker`.
- **Note:** `textarea`.

### Validation (Zod)
```typescript
const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  occurredAt: z.date(),
  note: z.string().max(280).optional(),
});
```

## 4. Acceptance Criteria
- [ ] User can open the "New Transaction" form from the Header or Dashboard.
- [ ] Form validates that amount is positive and category is selected.
- [ ] Submitting the form saves the transaction to the database via API.
- [ ] Dashboard/Recent Transactions list updates after successful submission.
- [ ] Error messages are shown if the API call fails.
