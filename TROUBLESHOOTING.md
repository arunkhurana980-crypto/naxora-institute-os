# Troubleshooting

## Baseline Part status failed

Open the failed Part status URL and inspect Render logs.

## Catalog count is not 12

The earlier Part version is incomplete or its catalog route is not active.

## Native catalog count is not 60

One of Parts 130–134 is missing from Part 135 runtime catalog.

## Role positive test failed

Check the logged-in role, fixture ID and Part 124 scope.

## Outside-scope test succeeded

Critical acceptance failure. Do not finalize. Fix role/scope enforcement.

## Counsellor test says action unknown

Confirm Part 132 catalog contains `crm.lead.note_add`.

## Workflow evidence failed

The supplied Part 135 conversation must match the workflow key and be fully completed.

## Coverage below 100%

Reload `/app`, wait for all modules, and verify the coverage bridge loaded before recording.

## Mobile gate pending

Record a second snapshot at viewport width 600px or lower.

## Finalization blocked

Read `gateSummary`, fix pending/failed gates, and rerun. Do not edit the database manually.
