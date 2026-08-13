"""Claims module (Module 5) — ownership claims, verification, collection.

Claim creation is the handoff point from the Matching module: accepting a
Match creates a Claim via a **direct in-process function call**
(``claims.service.create_from_match``), never an HTTP request between modules
(`ABOUT.md`). The Claims module owns the Claim → VerificationRecord →
CollectionRecord workflow and the LostItem/FoundItem status transitions it
drives.
"""
