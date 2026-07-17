# Part 116 Testing Guide

## No active subscription
Expected:
- base plan FREE,
- dashboard/profile allowed,
- paid and V3 features denied.

## Authenticated only
Expected:
- appears under `pendingAuthenticatedPlanCodes`,
- paid features remain denied.

## Active Starter
Student, attendance, fees and reports become available to allowed roles.

## Active Professional
Starter features plus VANI 2.0, live classes and AI support.

## Active Business
Professional features plus branches, franchise, marketing, marketplace and white-label.

## Separate V3
- Active V3 + owner → V3 allowed.
- Active V3 + teacher/student/parent → V3 denied.
- Active V3 without Business → V3 allowed to owner, Business modules denied.

## Direct backend test
`GET /api/part116/gated/marketplace.manage`

Expected:
- Business owner: 200.
- Starter owner: 402.
- Teacher: 403.

Part 116 uses Test Mode evidence until Part 118. Test access is not commercial payment proof.
