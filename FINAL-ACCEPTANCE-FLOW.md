# Final Acceptance Flow

```text
Owner creates acceptance run
→ Owner runs baseline
→ Owner runs security probes
→ Every role logs in and runs its own role test
→ Required Part 135 workflows are completed
→ Their conversation IDs are verified
→ Desktop VANI-button coverage snapshot
→ Mobile VANI-button coverage snapshot
→ Every gate becomes PASS
→ Owner enters exact final confirmation
→ Internal acceptance certificate is generated
```

Exact final confirmation:

```text
FINALIZE VANI SAFE SCOPE SALE READY
```

Finalization fails closed when any gate is pending, blocked or failed.
