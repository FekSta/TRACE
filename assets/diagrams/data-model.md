# 🗄️ TRACE — Entity Relationship Diagram

# TRACE Core Business Layer & Supporting Layer Entities

> **TRACE (Tracking, Recovery, And Claim Engine)**
>
> This document defines the persistent entities that make up the TRACE Lost & Found Management System. The entities are divided into **Core Business Layer** and **Supporting Layer** to clearly distinguish between the primary business data and the operational data that supports business processes.

---

# Core Business Layer

These entities represent the primary business objects that the system is designed to manage.

---

## 1. User

**Purpose**

Represents every person interacting with the system, including students, staff members, Lost & Found Officers, and Administrators.

| Attribute | Type | Description |
|------------|------|-------------|
| UserID (PK) | UUID / Integer | Unique user identifier |
| FirstName | String | User's first name |
| LastName | String | User's last name |
| StudentNumber | String | Student or employee number |
| Email | String | Login email address |
| PhoneNumber | String | Contact number |
| PasswordHash | String | Encrypted password |
| Role | Enum | User, Officer, Administrator |
| Status | Enum | Active, Suspended, Inactive |
| CreatedAt | DateTime | Account creation timestamp |

---

## 2. LostItem

**Purpose**

Stores reports of items that users have lost.

| Attribute | Type | Description |
|------------|------|-------------|
| LostItemID (PK) | UUID / Integer | Unique identifier |
| UserID (FK) | Foreign Key | User who reported the item |
| CategoryID (FK) | Foreign Key | Item category |
| Title | String | Short item title |
| Description | Text | Detailed description |
| Brand | String | Item manufacturer or brand |
| Colour | String | Item colour |
| DateLost | Date | Date item was lost |
| LocationLost | String | Last known location |
| Status | Enum | Reported, Matched, Claimed, Closed |


---

## 3. FoundItem

**Purpose**

Stores reports of items that have been found.

| Attribute | Type | Description |
|------------|------|-------------|
| FoundItemID (PK) | UUID / Integer | Unique identifier |
| UserID (FK) | Foreign Key | User who found the item |
| CategoryID (FK) | Foreign Key | Item category |
| Title | String | Short item title |
| Description | Text | Detailed description |
| Brand | String | Manufacturer or brand |
| Colour | String | Item colour |
| DateFound | Date | Date item was found |
| StorageLocation | String | Where the item is stored |
| Status | Enum | Available, Claimed, Returned |

---

## 4. Claim

**Purpose**

Represents ownership claims submitted by users for found items.

| Attribute | Type | Description |
|------------|------|-------------|
| ClaimID (PK) | UUID / Integer | Unique claim identifier |
| LostItemID (FK) | Foreign Key | Related lost item |
| FoundItemID (FK) | Foreign Key | Related found item |
| UserID (FK) | Foreign Key | User submitting the claim |
| ClaimDate | DateTime | Date submitted |
| VerificationStatus | Enum | Pending, Approved, Rejected |
| OfficerID (FK) | Foreign Key | Officer reviewing the claim |
| VerificationNotes | Text | Officer remarks |
| CollectionDate | DateTime | Date item collected |
| Status | Enum | Active, Completed, Cancelled |

---

## 5. Category

**Purpose**

Defines the categories used to classify lost and found items.

| Attribute | Type | Description |
|------------|------|-------------|
| CategoryID (PK) | UUID / Integer | Unique category identifier |
| CategoryName | String | Category name |
| Description | String | Category description |
| Icon | String | UI icon reference |
| DisplayOrder | Integer | Display order |
| Status | Enum | Active, Archived |
| CreatedAt | DateTime | Date category created |

---

# Supporting Layer

These entities support business workflows, automation, auditing, and system operations.

---

## 6. Match

**Purpose**

Stores potential matches generated automatically by the matching algorithm.

| Attribute | Type | Description |
|------------|------|-------------|
| MatchID (PK) | UUID / Integer | Match identifier |
| LostItemID (FK) | Foreign Key | Lost item |
| FoundItemID (FK) | Foreign Key | Found item |
| MatchScore | Decimal | Confidence score |
| MatchReason | Text | Reason for the suggested match |
| Status | Enum | Suggested, Accepted, Rejected |
| GeneratedAt | DateTime | Date generated |

---

## 7. Notification

**Purpose**

Stores notifications sent to users.

| Attribute | Type | Description |
|------------|------|-------------|
| NotificationID (PK) | UUID / Integer | Notification identifier |
| UserID (FK) | Foreign Key | Recipient |
| Title | String | Notification title |
| Message | Text | Notification content |
| NotificationType | Enum | Match, Claim, Reminder, System |
| IsRead | Boolean | Read status |
| CreatedAt | DateTime | Date created |

---

## 8. VerificationRecord

**Purpose**

Maintains records of the ownership verification process.

| Attribute | Type | Description |
|------------|------|-------------|
| VerificationID (PK) | UUID / Integer | Verification identifier |
| ClaimID (FK) | Foreign Key | Related claim |
| OfficerID (FK) | Foreign Key | Officer performing verification |
| VerificationMethod | String | Verification method |
| Result | Enum | Passed, Failed |
| Notes | Text | Verification notes |
| VerifiedAt | DateTime | Verification timestamp |

---

## 9. CollectionRecord

**Purpose**

Records successful collection of recovered items.

| Attribute | Type | Description |
|------------|------|-------------|
| CollectionID (PK) | UUID / Integer | Collection identifier |
| ClaimID (FK) | Foreign Key | Related claim |
| CollectedBy | String | Person collecting item |
| OfficerID (FK) | Foreign Key | Officer releasing item |
| CollectionDate | DateTime | Collection date |
| RecipientSignature | String | Signature reference |
| Remarks | Text | Additional notes |

---

## 10. Attachment

**Purpose**

Stores uploaded images and supporting documents.

| Attribute | Type | Description |
|------------|------|-------------|
| AttachmentID (PK) | UUID / Integer | Attachment identifier |
| FileName | String | Original filename |
| FilePath | String | Storage path |
| FileType | String | Image, PDF, etc. |
| UploadedBy (FK) | Foreign Key | User who uploaded the file |
| UploadedAt | DateTime | Upload timestamp |
| RelatedEntity | Enum | LostItem, FoundItem, Claim |

---

## 11. AuditLog

**Purpose**

Maintains a complete audit trail of significant system events.

| Attribute | Type | Description |
|------------|------|-------------|
| AuditID (PK) | UUID / Integer | Audit identifier |
| UserID (FK) | Foreign Key | User performing the action |
| Action | String | Create, Update, Delete, Login, etc. |
| EntityName | String | Entity affected |
| EntityID | UUID / Integer | Affected record identifier |
| Timestamp | DateTime | Date and time of action |
| IPAddress | String | Originating IP address |

---

# Entity Summary

## Core Business Layer

| Entity | Purpose |
|---------|---------|
| User | System users |
| LostItem | Lost item reports |
| FoundItem | Found item reports |
| Claim | Ownership claims |
| Category | Item classification |

---

## Supporting Layer

| Entity | Purpose |
|---------|---------|
| Match | Automatic item matching |
| Notification | User notifications |
| VerificationRecord | Ownership verification |
| CollectionRecord | Item collection |
| Attachment | Images and documents |
| AuditLog | System audit trail |

---

# Overall Statistics

| Layer | Number of Entities |
|--------|-------------------:|
| Core Business Layer | 5 |
| Supporting Layer | 6 |
| **Total Persistent Entities** | **11** |

---

# Notes

- All entities are persistent and stored in the PostgreSQL database.
- Each entity supports CRUD operations where appropriate.
- The Core Business Layer models the primary business domain of the Lost & Found Management System.
- The Supporting Layer enables automation, security, workflow management, notifications, auditing, and traceability.
- This structure exceeds the minimum CMPG213/CMPG223 requirement of four entities while maintaining a clean and scalable architecture.


## Entity Summary

| Entity | Description | Key Attributes |
|---|---|---|
| **User** | All system actors (users, officers, admins) | email, role, password_hash |
| **LostItem** | Lost property reports | category, location, date_lost, status |
| **FoundItem** | Found property registrations | category, location, date_found, storage_location |
| **Category** | Item classification taxonomy | name, description |
| **Location** | Physical locations on campus | name, building |
| **Match** | Algorithmic pairing of lost↔found items | score, status |
| **Claim** | Ownership verification requests | evidence, status, officer |
| **Notification** | User alerts and system messages | type, message, reference_id, is_read |
| **AuditLog** | Immutable audit trail | action, changes, ip_address |

## Relationship Summary

- **User → LostItem/FoundItem** — One-to-many (a user can report multiple items)
- **Category → Items** — One-to-many (a category classifies many items)
- **Location → Items** — One-to-many (a location can have many items lost/found there)
- **LostItem ↔ FoundItem via Match** — Many-to-many resolved by Match join entity with score
- **Match → Claim** — One-to-many (a match can trigger verification claims)
- **User → Claim (dual)** — Users submit claims; officers review them
- **Notification → User** — Many-to-one (notifications belong to a user)
- **Notification → Match/Claim/Item** — Polymorphic (notifications reference different entity types via `reference_id`)
