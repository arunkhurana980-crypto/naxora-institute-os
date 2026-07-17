# Frontend UI Record — Part 125

## Page
`/vani-actions`

## Sections
- Voice/text VANI command.
- Structured action selector.
- Dynamic required/optional fields.
- Preview.
- Exact confirmation.
- Separate execution.
- Cancellation before execution.
- Personal action history.
- Native-adapter status.

## Part 119 integration
Installer adds:
- Global VANI Actions sidebar module.
- Action aliases.
- `/naxora-part125-global-vani-bridge.js`.

The bridge intercepts action-like VANI commands and opens the Part 125 action page. Navigation-only commands remain handled by Part 119.
