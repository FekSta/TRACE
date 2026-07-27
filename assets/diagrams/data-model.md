# 🗄️ TRACE — Entity Relationship Diagram

```mermaid
erDiagram
    %% ============================================================
    %% CORE ENTITIES
    %% ============================================================

    User {
        uuid id PK "Primary key"
        string email "Unique, used for login"
        string password_hash "bcrypt hash"
        string full_name "Display name"
        string phone "Optional contact"
        enum role "user | officer | admin"
        boolean is_active "Soft disable flag"
        datetime created_at "Account creation timestamp"
        datetime updated_at "Last profile update"
    }

    Category {
        uuid id PK "Primary key"
        string name "e.g. Electronics, Clothing"
        text description "Optional description"
        datetime created_at "Creation timestamp"
    }

    Location {
        uuid id PK "Primary key"
        string name "e.g. Library, Student Center"
        string building "Optional building name"
        text description "Optional directions"
        datetime created_at "Creation timestamp"
    }

    %% ============================================================
    %% ITEM ENTITIES
    %% ============================================================

    LostItem {
        uuid id PK "Primary key"
        uuid reporter_id FK "User who reported"
        uuid category_id FK "Item category"
        uuid location_id FK "Where it was lost"
        string title "Short item description"
        text description "Detailed description"
        date date_lost "When it was lost"
        string color "Item colour"
        string brand "Item brand (optional)"
        string keywords "Search keywords"
        json image_urls "Array of image paths"
        enum status "open | matched | claimed | closed"
        datetime created_at "Report timestamp"
        datetime updated_at "Last update"
    }

    FoundItem {
        uuid id PK "Primary key"
        uuid reporter_id FK "User who found it"
        uuid category_id FK "Item category"
        uuid location_id FK "Where it was found"
        string title "Short item description"
        text description "Detailed description"
        date date_found "When it was found"
        string color "Item colour"
        string brand "Item brand (optional)"
        string storage_location "Where item is stored"
        json image_urls "Array of image paths"
        enum status "open | matched | claimed | returned"
        datetime created_at "Report timestamp"
        datetime updated_at "Last update"
    }

    %% ============================================================
    %% MATCHING & CLAIMS
    %% ============================================================

    Match {
        uuid id PK "Primary key"
        uuid lost_item_id FK "Matched lost item"
        uuid found_item_id FK "Matched found item"
        float score "0.0 - 1.0 confidence score"
        enum status "pending | approved | rejected"
        datetime created_at "Match timestamp"
    }

    Claim {
        uuid id PK "Primary key"
        uuid lost_item_id FK "Lost item being claimed"
        uuid match_id FK "Associated match record"
        uuid claimant_id FK "User submitting claim"
        uuid officer_id FK "Officer reviewing claim"
        text description "Claim justification"
        json evidence_urls "Proof documents/images"
        enum status "pending | approved | rejected"
        datetime submitted_at "Claim submission"
        datetime reviewed_at "Officer review timestamp"
        datetime created_at "Record creation"
        datetime updated_at "Last update"
    }

    %% ============================================================
    %% NOTIFICATIONS & AUDIT
    %% ============================================================

    Notification {
        uuid id PK "Primary key"
        uuid user_id FK "Recipient"
        uuid reference_id "Related entity ID (polymorphic)"
        string reference_type "Entity type: match, claim, item"
        enum type "match_alert | claim_update | collection_reminder | system"
        string title "Short notification title"
        text message "Notification body"
        boolean is_read "Read status"
        datetime created_at "When notification was sent"
    }

    AuditLog {
        uuid id PK "Primary key"
        uuid user_id FK "Who performed action"
        uuid entity_id "Affected entity ID"
        string entity_type "Entity class name"
        string action "CREATE | UPDATE | DELETE | VERIFY | APPROVE | REJECT"
        json changes "Before/after snapshot"
        string ip_address "Request origin"
        datetime created_at "When action occurred"
    }

    %% ============================================================
    %% RELATIONSHIPS
    %% ============================================================

    %% User relationships
    User ||--o{ LostItem : "reports"
    User ||--o{ FoundItem : "registers"
    User ||--o{ Claim : "submits as claimant"
    User ||--o{ Claim : "reviews as officer"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "performs"

    %% Category relationships
    Category ||--o{ LostItem : "classifies"
    Category ||--o{ FoundItem : "classifies"

    %% Location relationships
    Location ||--o{ LostItem : "lost at"
    Location ||--o{ FoundItem : "found at"

    %% Item-to-Match relationships
    LostItem ||--o{ Match : "matched with"
    FoundItem ||--o{ Match : "matched against"
    LostItem ||--o{ Claim : "claimed via"

    %% Match-to-Claim relationship
    Match ||--o{ Claim : "triggers"

    %% Notification references (polymorphic via reference_id)
    Notification }o--|| Match : "notifies about match"
    Notification }o--|| Claim : "notifies about claim"
    Notification }o--|| LostItem : "notifies about item"
```

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
