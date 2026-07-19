# Native Action Bridge

Part 135 uses authenticated preview/confirm endpoints from Parts 130–134. It forwards the current request but does not store JWT/Authorization. It cannot bypass native permissions and stops when a native Part returns a real error.

Target runtime catalog: 60 actions when all five Parts are active.
