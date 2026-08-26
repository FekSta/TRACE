"""Notifications module (Module 6) — email + `Notification` rows.

Fired as direct in-process calls from the Matching and Claims modules
(`ABOUT.md` — internal service boundaries, no message queue). The email
implementation follows the Module 3 `StorageBackend` interface/adapter
pattern: trigger code uses the shared ``email_backend`` singleton and never
talks to SMTP directly; Module 9 swaps in a cloud backend behind the same
interface with only a new file and an env var.
"""
