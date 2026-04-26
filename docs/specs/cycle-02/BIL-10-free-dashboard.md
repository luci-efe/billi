# Spec: BIL-10 Dashboard Básico

**ID:** BIL-10 (ST-03-01)
**Status:** Draft
**Epic:** EP-03 Dashboard y visibilidad financiera

## 1. User Story
**As a** El profesionista endeudado,
**I want** ver saldo, ingresos y egresos del periodo actual,
**So that** entienda de un vistazo cómo voy financieramente.

## 2. Technical Strategy
- **Backend:** 
  - Create `GET /api/dashboard/summary` endpoint.
  - Logic to aggregate transactions by current month/week.
  - Calculate `balance`, `totalIncome`, and `totalExpense`.
- **Frontend:**
  - Replace hardcoded charts and stats in `apps/web/src/routes/dashboard.tsx`.
  - Use `Recharts` (already installed) to visualize data.
  - Implement "Recent Transactions" list fetching from `GET /api/transactions`.

## 3. Implementation Details

### API Endpoint: `GET /api/dashboard/summary?period=month`
Response:
```json
{
  "balance": 1500000,
  "totalIncome": 2500000,
  "totalExpense": 1000000,
  "period": "April 2026",
  "chartData": [
    { "name": "Mon", "income": 50000, "expense": 20000 },
    ...
  ]
}
```

### Components to Update
- **StatsCards:** Connect to summary data.
- **MainChart:** Connect to aggregated daily/weekly data.
- **PieChart:** Aggregation by `category` (Top 5 + "Others").

## 4. Acceptance Criteria
- [ ] Dashboard displays accurate balance based on real database transactions.
- [ ] Stats for "Ingresos" and "Egresos" match the selected period.
- [ ] Recent transactions list shows the last 5 movements from the user.
- [ ] Empty state is handled gracefully when the user has no transactions.
- [ ] Charts reflect real data distribution.
