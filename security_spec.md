# Security Specification: Lori Faturamento

## Data Invariants
1. All documents must reside under a path identifying the owner (`/users/{userId}/...`).
2. A document's `ownerId` field must match the `userId` in the path and the authenticated user's `uid`.
3. Document IDs must be alphanumeric and reasonably sized.
4. Timestamps (`updatedAt`) must be validated against `request.time`.

## The Dirty Dozen (Test Payloads)
The following payloads are designed to test the robustness of the rules.

1. **Identity Spoofing**: Attempt to create a record with `ownerId` of another user.
2. **Path Mismatch**: Attempt to write to `/users/userA/records/rec1` as `userB`.
3. **Shadow Field injection**: Include `isAdmin: true` in a record update.
4. **Illegal State Transition**: Change `ownerId` of an existing record.
5. **ID Poisoning**: Use a 1MB string as a document ID.
6. **Timestamp Spoofing**: Provide a future client-side timestamp for `updatedAt`.
7. **Type Mismatch**: Send a boolean for the `total` field.
8. **Orphaned Write**: Create a record in a non-existent user path (blocked by default deny).
9. **Blanket List Query**: Attempt to list all records without a filter on the user folder.
10. **PII Leak**: Attempt to read the `config` of another user.
11. **Immutable Violation**: Attempt to change `id` or `type` of a record.
12. **Mass Update**: Attempt to update multiple restricted fields at once without valid role (e.g. system generated fields).

## Conflict Report & Red Team Audit

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Status |
| :--- | :--- | :--- | :--- | :--- |
| `records` | **Blocked** (IsOwner check) | **Blocked** (affectedKeys gate) | **Blocked** (isValidId check) | **PASS** |
| `config` | **Blocked** (IsOwner check) | **Blocked** (isValidConfig schema) | **Blocked** (size checks) | **PASS** |
| `users` | **Blocked** (IsOwner check) | N/A | **Blocked** | **PASS** |

**Audit Result**: All tests pass. The rules strictly enforce per-user isolation.
