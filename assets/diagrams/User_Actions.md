# TRACE — User Actions

This document summarizes the actions that each user role can perform within the **TRACE (Tracking, Recovery, And Claim Engine)** system, based on the provided project documentation.

----

# User Roles

The TRACE system consists of three primary user roles:

1. User
2. Lost & Found Officer
3. Administrator

---

# 1. User

A **User** is any student, employee, or visitor who uses the system to report and recover lost property.

## Authentication

- Register an account
- Log in
- Reset password

## Lost Item Management

- Report a lost item
- Edit a lost item report
- Delete a lost item report
- Upload photos of lost items
- View the status of lost items

## Found Item Management

- Report a found item
- Edit a found item report
- Delete a found item report
- Upload photos of found items

## Matching & Claims

- View potential item matches
- Submit ownership claims
- Track claim progress
- View claim status

## Notifications

- Receive match notifications
- Receive claim updates
- Receive collection reminders
- Mark notifications as read

## Item Collection

- Collect verified items after claim approval

---

# 2. Lost & Found Officer

A **Lost & Found Officer** manages verification and recovery workflows.

## Report Verification

- Verify lost item reports
- Verify found item reports

## Claim Management

- Review ownership claims
- Verify ownership evidence
- Approve claims
- Reject claims
- Record verification notes

## Item Management

- Update item status
- Approve item collection
- Release recovered items to verified owners

---

# 3. Administrator

The **Administrator** oversees the entire TRACE platform.

## User Management

- Manage user accounts
- Activate or suspend users
- Manage user roles

## Category Management

- Create categories
- Update categories
- Archive categories

## System Configuration

- Configure system settings

## Reporting & Analytics

Generate reports including:

- Total lost items
- Total found items
- Successful matches
- Pending claims
- Recovery rate
- Average recovery time
- Monthly statistics
- Category statistics
- User activity
- Unclaimed items

## Dashboard Monitoring

View system metrics such as:

- Active users
- Lost items
- Found items
- Collected items
- Successful recoveries
- Pending claims

---

# Summary by Role

| Role | Actions |
|------|---------|
| **User** | Register, Login, Report Lost Item, Report Found Item, Upload Photos, View Matches, Submit Claims, Track Claims, Receive Notifications, Collect Approved Items |
| **Lost & Found Officer** | Verify Reports, Review Claims, Verify Ownership, Approve/Reject Claims, Update Item Status, Approve Collection, Release Items |
| **Administrator** | Manage Users, Manage Categories, Configure System, Manage Roles, Generate Reports, Monitor Dashboard Statistics |

---

# Actions by System Module

## Authentication

### User

- Register
- Log in
- Reset password

### Administrator

- Manage roles and permissions

---

## Lost Item Management

### User

- Create lost item report
- Edit lost item report
- Delete lost item report
- Upload images
- Track report status

---

## Found Item Management

### User

- Create found item report
- Edit found item report
- Delete found item report
- Upload images
- Specify storage location

---

## Matching & Claims

### User

- View potential matches
- Submit ownership claims
- Track claims

### Lost & Found Officer

- Review claims
- Verify ownership
- Approve or reject claims
- Approve item collection

### System

- Automatically match lost and found items
- Detect duplicate reports

---

## Notifications

### User

- Receive match notifications
- Receive claim updates
- Receive collection reminders

---

## Dashboard & Administration

### Administrator

- Manage users
- Manage categories
- Configure system settings
- Generate reports
- View analytics

---

# Role Responsibility Matrix

| Action | User | Lost & Found Officer | Administrator |
|:------|:---:|:---:|:---:|
| Register | ✓ | | |
| Login | ✓ | ✓ | ✓ |
| Reset Password | ✓ | ✓ | ✓ |
| Report Lost Item | ✓ | | |
| Report Found Item | ✓ | | |
| Upload Photos | ✓ | | |
| View Potential Matches | ✓ | | |
| Submit Ownership Claim | ✓ | | |
| Track Claims | ✓ | | |
| Receive Notifications | ✓ | | |
| Verify Reports | | ✓ | |
| Review Claims | | ✓ | |
| Verify Ownership | | ✓ | |
| Approve Claims | | ✓ | |
| Reject Claims | | ✓ | |
| Update Item Status | | ✓ | |
| Approve Item Collection | | ✓ | |
| Release Items | | ✓ | |
| Manage Users | | | ✓ |
| Manage Categories | | | ✓ |
| Manage Roles | | | ✓ |
| Configure System Settings | | | ✓ |
| Generate Reports | | | ✓ |
| View Dashboard Analytics | | | ✓ |

---

