# Frontend UI Record — Part 119

## Main URL
`/app`

Aliases:
- `/naxora-app`
- `/unified-app`
- `/part119`

## UI components
- Responsive sidebar.
- Module search.
- Category grouping.
- Role badge.
- Base-plan and V3 badges.
- Central module iframe.
- Refresh, direct-open and home controls.
- Hash-based state.
- Global VANI panel.
- Browser speech input when supported.
- Browser SpeechSynthesis safe summaries.
- Mobile sidebar and backdrop.

## Existing login detection
The shell looks for the existing JWT storage keys already used by the project. It does not store the token in source code.

Part 120 replaces this compatibility step with the official common login.
