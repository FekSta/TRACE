# 🧭 TRACE

> **T**racking, **R**ecovery, **A**nd **C**laim **E**ngine
> A centralized platform for reporting, tracking, matching, and recovering lost and found items across campuses, businesses, and public organizations.

*"Every lost item leaves a trace."*

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

# 🔄 Request Flow

User submits a lost item report through the application.
Item details are stored in the database.
Matching algorithm scans reported lost items against found item records.
Potential match identified based on similarity criteria.
User is notified of the potential match.
User submits an ownership claim for the matched item.
Administrator reviews the ownership claim and supporting evidence.
Claim approved after successful verification.
User collects the verified item from the designated location.
Case is marked as closed and archived in the system.

---

# 🧩 Services

TRACE is organized into a 5-service architecture (**Auth, Backend, Dispatcher, Dashboard, Frontend**), with each domain assigned to the service that owns it.

## 1. Authentication Service

**Responsibility:** User identity, authentication, and authorization.

**Features**
- JWT Login
- Registration
- Password Reset
- Role Management

**User Roles**
- User
- Lost & Found Officer
- Administrator

**Database**
- Users
- Roles
- Permissions
- Refresh Tokens

---

## 2. Backend Service

**Responsibility:** Core Lost & Found management.

**Modules**

*Lost Item Management*
- Lost Item CRUD
- Upload Images
- Categories
- Status Tracking

*Found Item Management*
- Found Item CRUD
- Storage Location
- Photos
- Availability Status

*Officer Functions*
- Verify Reports
- Update Item Status
- Approve Item Collection

**Database**
- Lost Items
- Found Items
- Categories
- Images
- Storage Locations

---

## 3. Dispatcher Service (Matching & Claims)

**Responsibility:** Business workflow and item matching.

**Modules**
- Automatic Matching
- Match Scoring
- Duplicate Detection
- Ownership Claim Processing
- Claim Verification
- Claim Tracking

**User Features**
- Report Lost Items
- Report Found Items
- Track Claims

**Officer Features**
- Review Ownership Claims
- Approve Item Collection

**Database**
- Matches
- Claims
- Verification Records
- Collection Requests

---

## 4. Dashboard Service

**Responsibility:** Reporting and analytics.

**Administrator Features**
- Manage Users
- Generate Reports
- Configure System Settings

**Dashboard Metrics**
- Total Lost Items
- Total Found Items
- Successful Matches
- Pending Claims
- Collected Items
- Active Users
- Monthly Reports
- Category Statistics

> **Note:** If user and category management become large or require complex workflows, these could later be moved into dedicated User Management and Configuration services. For a 5-service architecture, keeping the admin functions in the Dashboard service is a reasonable simplification.

---

## 5. Frontend

**Responsibility:** User interface for all roles.

**Pages — User**
- Login/Register
- Report Lost Item
- Report Found Item
- Upload Photos
- Track Claims
- Notifications

**Pages — Lost & Found Officer**
- Verify Reports
- Review Claims
- Approve Collections
- Update Item Status

**Pages — Administrator**
- Dashboard
- Manage Users
- Manage Categories
- Reports
- System Settings

---

### 📋 Responsibility Matrix

| Feature | Auth | Backend | Dispatcher | Dashboard | Frontend |
|---|:---:|:---:|:---:|:---:|:---:|
| Login/Register | ✓ | | | | ✓ |
| Role Management | ✓ | | | ✓ | ✓ |
| Lost Item CRUD | | ✓ | | | ✓ |
| Found Item CRUD | | ✓ | | | ✓ |
| Upload Photos | | ✓ | | | ✓ |
| Categories | | ✓ | | ✓ | ✓ |
| Status Tracking | | ✓ | ✓ | | ✓ |
| Automatic Matching | | | ✓ | | ✓ |
| Match Scoring | | | ✓ | | ✓ |
| Duplicate Detection | | | ✓ | | ✓ |
| Ownership Claims | | | ✓ | | ✓ |
| Verify Reports | | ✓ | ✓ | | ✓ |
| Approve Collection | | ✓ | ✓ | | ✓ |
| Email Alerts | | | ✓ | | ✓ |
| Match Notifications | | | ✓ | | ✓ |
| Claim Updates | | | ✓ | | ✓ |
| Collection Reminders | | | ✓ | | ✓ |
| Reports & Analytics | | | | ✓ | ✓ |
| System Settings | | | | ✓ | ✓ |

This organization keeps each service focused on a single responsibility: **Auth** manages identity and access, **Backend** owns lost/found item data, **Dispatcher** handles matching and claim workflows, **Dashboard** provides administration and analytics, and **Frontend** presents the interfaces for users, officers, and administrators.

---

# ⚙ Algorithms & Business Logic

## TRACE Matching Algorithm

The system compares:

- Item Category
- Item Description
- Colour
- Brand
- Date Lost
- Date Found
- Location
- Keywords

Each matching attribute contributes to an overall confidence score.

```
Category Match + Location Match + Date Match + Description Similarity +  Image Similarity (Future) = Match Score
```

Items with the highest scores are recommended first.

---

## Duplicate Detection

Before creating a report, the system checks:

- Item description
- Date
- Location
- Category

If a similar report already exists, the user is notified.

---

## Ownership Verification

Claims are verified using:

- Item description
- Special identifying features
- Proof of ownership
- Uploaded documentation

Only verified owners can collect items.

---

# 📊 Reports & Dashboards

Administrators can generate reports including:

- Total Lost Items
- Total Found Items
- Recovery Rate
- Average Recovery Time
- Most Common Lost Categories
- Monthly Statistics
- Pending Claims
- Successful Recoveries
- Unclaimed Items
- User Activity

---

# 🛠 Tech Stack
<p align="center">
  <img src="https://img.shields.io/badge/nginx-Gateway-2496ED?logo=nginx&logoColor=white" alt="nginx">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/FastAPI-0.135.3-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Django-6.0.4-092E20?logo=django&logoColor=white" alt="Django">
  <img src="https://img.shields.io/badge/PostgreSQL-18+-316192?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/React-19.2.0-009688?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/celery-6.0.5-2496ED?logo=celery&logoColor=white" alt="Celery">
  <img src="https://img.shields.io/badge/Redis-8-FF4438?logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/Security_Releases-passing-2496ED?logo=github&logoColor=white" alt="Security Audit">
</p>

---

# ✅ Assignment Requirements

This project satisfies the CMPG223 requirements by including:

✔ More than four entities (Users, Lost Items, Found Items, Claims, Categories)

✔ Full CRUD functionality

✔ Multiple methods of data input (forms, image uploads)

✔ Complex business rules (matching, ownership verification, duplicate detection)

✔ Sorting (match score, date, category, status)

✔ Reports and dashboards

✔ Authentication and role-based access control

✔ Internet-based application

✔ Background processing using Celery

✔ Multiple user roles

---

# 🚀 Why It Is More Than CRUD

A traditional CRUD application would simply store lost and found records.

TRACE introduces intelligent features such as:

- Automatic lost/found matching
- Match scoring algorithm
- Duplicate report detection
- Ownership verification workflow
- Administrative approval process
- Notification system
- Analytics dashboards
- Recovery statistics
- Workflow management
- Background processing

These capabilities transform the application into a comprehensive Lost & Found Management Information System rather than a simple database application.

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

# 🏁 Conclusion

TRACE modernizes the management of lost property by combining intelligent matching, workflow automation, reporting, notifications, and role-based administration into a scalable web application.

Its emphasis on business logic, algorithms, security, reporting, and automation makes it an excellent CMPG223 project that goes well beyond the requirements of a traditional CRUD application.
