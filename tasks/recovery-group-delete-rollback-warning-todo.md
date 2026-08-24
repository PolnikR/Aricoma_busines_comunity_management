# Recovery Group Delete Rollback Warning Checklist

- [x] Add and observe a failing orchestrated-delete UI test.
- [x] Add localized rollback-aware messages.
- [x] Select the message from `deleteTarget.pushToOrchestrator`.
- [x] Protect the regular-delete message with a test.
- [x] Run focused Recovery Groups tests.
- [x] Run TypeScript typecheck.
- [x] Inspect the scoped diff.
