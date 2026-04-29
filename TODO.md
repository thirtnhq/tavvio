# Recipient Management System - TODO

Status: In Progress

## Steps from Approved Plan (Step-by-step breakdown)

### 1. Database & Prisma (Prisma model + migration)

- [x] Add Recipient model to apps/api/prisma/schema.prisma
- [x] Update Payout model (add recipientId optional FK)
- [x] Run prisma generate && prisma db push/migrate
- [ ] Update seed.ts with sample recipients

### 2. API Layer - Recipients Module (New CRUD)

- [x] Create apps/api/src/modules/recipients/recipients.module.ts
- [x] Create recipients.controller.ts (POST/GET/PATCH/DELETE /v1/recipients)
- [x] Create recipients.service.ts (CRUD logic)
- [x] Create dto/create-recipient.dto.ts (validate like payout DTO)
- [x] Create dto/recipient-filters.dto.ts (for list pagination/search)

### 3. API Updates - Payout Integration

- [x] Edit payouts.service.ts: create() support recipientId lookup/copy
- [x] Edit payouts.dto/create-payout.dto.ts: add optional recipientId field
- [x] Edit packages/types/src/payout.types.ts: Add Recipient interface

### 4. Dashboard UI - Recipients Management

- [x] Create apps/dashboard/src/app/(dashboard)/settings/recipients/page.tsx (list page)
- [x] Create components/recipients/RecipientsTable.tsx, AddRecipientDialog.tsx, EditRecipientDialog.tsx
- [x] Add search/filter/pagination

### 5. Dashboard UI - Payout Integration

- [x] Create/update apps/dashboard/src/app/(dashboard)/payouts/page.tsx
- [x] Create components/recipients/RecipientAutocomplete.tsx (select for payout form)
- [x] Integrate autocomplete: prefill form from selected recipient

### 6. Testing & Polish

- [ ] Manual test: CRUD recipients → select in payout → verify
- [ ] Add sample data via seed
- [ ] Update README/docs if needed

## Completed Steps

<!-- Updated after each completion -->

Next step: Start with Prisma schema update.
