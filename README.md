<div align="center">
    <img src="/assets/logos/trace-logo.png" alt="TRACE logo" width="400" height="250">
</div>

<h1 align="center">TRACE</h1>

<p align="center">
    <b>T</b>race <b>R</b>ecovery <b>A</b>nd <b>C</b>laim <b>E</b>ngine. 
    <em>"Every lost item leaves a trace."</em>
</p>


<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-services">Services(Modules)</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-development">Development</a> •
  <a href="#-api">API</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python">
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/FastAPI-0.135.3-009688?logo=fastapi&logoColor=white" alt="FastAPI">
</p>

<p align="center">
    <img src="https://img.shields.io/badge/PostgreSQL-18+-316192?logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Celery-6.0.5-37814A?logo=celery&logoColor=white" alt="Celery">
    <img src="https://img.shields.io/badge/Docker_Compose-Ready-2496ED?logo=docker&logoColor=white" alt="Docker Compose">
    <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions">
</p>



---

# 📍 Overview

TRACE is a web-based platform that streamlines the process of reporting, matching, claiming, and managing lost and found items.

Users can report lost belongings or found items, upload images, specify locations, and track the status of their reports. The system intelligently matches lost and found reports using multiple criteria such as category, location, date, and item characteristics.

Unlike a traditional database application, TRACE incorporates automated matching algorithms, claim verification workflows, notifications, reporting, and administrative approval processes.

---

# 📌 The Problem

Many organizations still manage lost and found items using paper logs, emails, or spreadsheets.

This creates several challenges:

- Lost items are difficult to locate.
- Found items remain unclaimed.
- Duplicate reports occur frequently.
- There is no centralized tracking.
- Ownership verification is difficult.
- Historical reporting is almost impossible.

Students, employees, and visitors often have no way of checking whether an item has already been found.

---

# 💡 The Solution

TRACE provides a centralized platform where:

- Users report lost items.
- Users register found items.
- The system automatically searches for potential matches.
- Owners submit ownership claims.
- Administrators verify claims.
- Users receive notifications when potential matches are found.

The result is a faster, more transparent, and more efficient recovery process.

---

# 🌍 Real World Use Cases

- Universities
- Schools
- Shopping Malls
- Airports
- Hotels
- Hospitals
- Public Transport Services
- Corporate Offices

---

# 🎯 Objectives

- Centralize lost and found reporting.
- Reduce the time required to recover lost items.
- Improve ownership verification.
- Automate matching between reports.
- Maintain complete item histories.
- Generate recovery statistics.
- Improve communication between users and administrators.

---

# 👥 User Roles

## 👤 User

- Register/Login
- Report lost items
- Report found items
- Upload photos
- Track claims
- Receive notifications

---

## 🛡 Lost & Found Officer

- Verify reports
- Review ownership claims
- Approve item collection
- Update item status

---

## 👨‍💼 Administrator

- Manage users
- Manage categories
- Generate reports
- Configure system settings

---

# 🏗 Architecture

```
                React Web Portal
                      │
                 Nginx Gateway
                 JWT Authentication
                      │
                FastAPI Backend
         ┌────────────┼────────────┐
         │            │            │
    PostgreSQL     Redis       Celery
         │
   TRACE Database
```
---

# 📈 Future Enhancements

- AI-powered image recognition
- QR code item tagging
- Mobile application
- Barcode scanning
- Live chat between users and administrators
- Integration with campus security
- SMS notifications
- Smart lockers for item collection
- RFID integration
- AI-assisted ownership verification

---
# References

# References

Tech With Tim (2025) *Learn Fast API With This ONE Project*. YouTube. Available at: https://youtu.be/SR5NYCdzKkc (Accessed: 22 July 2026).

freeCodeCamp (n.d.) *Front End Development Libraries*. Available at: https://www.freecodecamp.org/learn/front-end-development-libraries-v9/ (Accessed: 25 July 2026).

Mosh Hamedani (n.d.) *React Testing*. YouTube. Available at: https://youtu.be/8Xwq35cPwYg (Accessed: 15 August 2026).

Corey Schafer (2026) *Python FastAPI Tutorial (Part 17): Testing the API - Pytest, Fixtures, and Mocking External Services*. YouTube. Available at: https://youtu.be/SO7m7nod0ts (Accessed: 14 August 2026).

QA Routine (2025) *Vitest for React with Vite: Unit & Integration Testing with API Mocking*. YouTube. Available at: https://youtu.be/AoQ8jzDV5oI (Accessed: 13 August 2026 2026).


---
# Contributions
## Team
- [MOEKETSI FEKEFEKE](https://github.com/FekSta)
- [BROWN JENIFER](https://github.com/MissJBrown)
- [CHAUKE MV](https://github.com/Vee4537)
- [DLAMIN K](https://github.com/Kat-le-god)
- [MODIBA, T](https://github.com/tshegom22)
- [MALULEKE NYIKI](https://github.com/NyikiMaluks1606)

