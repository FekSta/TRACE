"""Matching Engine module (Module 4).

One matching engine, in-process with the rest of the modular monolith —
no message queue, no HTTP between modules (`ABOUT.md`). Reads
``LostItem``/``FoundItem`` rows and writes ``Match`` rows against the shared
database.
"""
