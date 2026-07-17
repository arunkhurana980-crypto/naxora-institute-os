# VANI Integration Record — Part 119

## Mode
Global navigation mode.

## Commands
- `VANI, fees kholo`
- `VANI, attendance dikhao`
- `VANI, live classes kholo`
- `VANI, subscription manager kholo`
- `VANI, marketplace kholo`
- `VANI, kya features available hain?`

## Checks
Before opening a module:
- login,
- role,
- instituteId,
- Part 116 plan entitlement,
- V3 entitlement when required,
- server module allowlist.

## Boundaries
Part 119 does not execute admission, fee, attendance, messaging, deletion, refund or payment actions.

Global multi-step VANI orchestration is Part 125. Existing module VANI assistants continue to enforce their own preview and confirmation rules.
