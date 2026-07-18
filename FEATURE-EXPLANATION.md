# Part 133 Feature Explanation

## 12 VANI actions

1. Template create
2. Template update
3. Notice draft create
4. Notice draft update
5. Notice publish
6. Role-safe message send
7. Notification schedule
8. Notification reschedule
9. Notification cancel
10. Failed delivery retry
11. My communication preference update
12. Delivery summary generate

Delivery states include `delivered_in_app`, `provider_accepted`, `failed`, `skipped_no_address`, `skipped_no_consent`, `skipped_opt_out`, `skipped_provider_unconfigured`, and `skipped_channel_unavailable`.

`provider_accepted` is not guaranteed final delivery.
