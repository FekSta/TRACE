# TRACE — MySQL Workbench Database Walkthrough

> **Important:** TRACE's actual runtime database is **PostgreSQL** (running in
> Docker via `docker compose up db`), as specified in `ABOUT.md` and
> `Entities.md`. This document is a **separate submission artifact** for
> course deliverables that require MySQL Workbench screenshots/diagrams.
> The steps below recreate the TRACE schema in a local MySQL instance so
> you can generate EER diagrams and export SQL scripts for your submission.
>
> **Do not confuse this with the production deployment target.**

---

## Prerequisites

- MySQL Server 8.0+ installed and running locally
- MySQL Workbench installed (https://dev.mysql.com/downloads/workbench/)

---

## Step 1: Install & Connect

1. Install MySQL Server from https://dev.mysql.com/downloads/mysql/ if not already installed. Start the service.
2. Open MySQL Workbench.
3. On the home screen, click the **+** button next to "MySQL Connections" to create a new connection.
4. Set **Connection Name** to `TRACE Local`.
5. Set **Hostname** to `127.0.0.1`, **Port** to `3306`.
6. Set **Username** to `root` (or your MySQL admin user) and enter your password.
7. Click **Test Connection** — you should see "Successfully made the MySQL connection."
8. Click **OK** to save, then double-click the connection to open it.

---

## Step 2: Create the Database

1. In the SQL Editor, run:

```sql
CREATE DATABASE trace_db;
USE trace_db;
```

2. Confirm `trace_db` appears in the Schemas sidebar (click refresh if needed).

---

## Step 3: Create the Tables

Create all 11 tables using the SQL editor. The enum values match
`assets/diagrams/data-model.md` exactly. Copy and paste the following
SQL script in order (foreign keys reference tables created earlier):

```sql
-- ============================================
-- 1. User
-- ============================================
CREATE TABLE `user` (
    `user_id` CHAR(36) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `student_number` VARCHAR(50) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('User', 'Officer', 'Administrator') NOT NULL DEFAULT 'User',
    `status` ENUM('Active', 'Suspended', 'Inactive') NOT NULL DEFAULT 'Active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uq_user_email` (`email`)
) ENGINE=InnoDB;

-- ============================================
-- 2. Category
-- ============================================
CREATE TABLE `category` (
    `category_id` CHAR(36) NOT NULL,
    `category_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `icon` VARCHAR(50) NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `status` ENUM('Active', 'Archived') NOT NULL DEFAULT 'Active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`category_id`),
    UNIQUE KEY `uq_category_name` (`category_name`)
) ENGINE=InnoDB;

-- ============================================
-- 3. LostItem
-- ============================================
CREATE TABLE `lost_item` (
    `lost_item_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `brand` VARCHAR(100) NULL,
    `colour` VARCHAR(50) NULL,
    `date_lost` DATETIME NOT NULL,
    `location_lost` VARCHAR(255) NOT NULL,
    `status` ENUM('Reported', 'Matched', 'Claimed', 'Closed') NOT NULL DEFAULT 'Reported',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`lost_item_id`),
    INDEX `ix_lost_item_user_id` (`user_id`),
    INDEX `ix_lost_item_category_id` (`category_id`),
    CONSTRAINT `fk_lost_item_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lost_item_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 4. FoundItem
-- ============================================
CREATE TABLE `found_item` (
    `found_item_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `brand` VARCHAR(100) NULL,
    `colour` VARCHAR(50) NULL,
    `date_found` DATETIME NOT NULL,
    `storage_location` VARCHAR(255) NOT NULL,
    `status` ENUM('Available', 'Claimed', 'Returned') NOT NULL DEFAULT 'Available',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`found_item_id`),
    INDEX `ix_found_item_user_id` (`user_id`),
    INDEX `ix_found_item_category_id` (`category_id`),
    CONSTRAINT `fk_found_item_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_found_item_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 5. Claim
-- ============================================
CREATE TABLE `claim` (
    `claim_id` CHAR(36) NOT NULL,
    `lost_item_id` CHAR(36) NULL,
    `found_item_id` CHAR(36) NULL,
    `user_id` CHAR(36) NOT NULL,
    `claim_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `verification_status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `officer_id` CHAR(36) NULL,
    `verification_notes` TEXT NULL,
    `collection_date` DATETIME NULL,
    `status` ENUM('Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Active',
    PRIMARY KEY (`claim_id`),
    INDEX `ix_claim_lost_item_id` (`lost_item_id`),
    INDEX `ix_claim_found_item_id` (`found_item_id`),
    INDEX `ix_claim_user_id` (`user_id`),
    CONSTRAINT `fk_claim_lost_item` FOREIGN KEY (`lost_item_id`) REFERENCES `lost_item` (`lost_item_id`) ON DELETE SET NULL,
    CONSTRAINT `fk_claim_found_item` FOREIGN KEY (`found_item_id`) REFERENCES `found_item` (`found_item_id`) ON DELETE SET NULL,
    CONSTRAINT `fk_claim_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_claim_officer` FOREIGN KEY (`officer_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 6. Match
-- ============================================
CREATE TABLE `match` (
    `match_id` CHAR(36) NOT NULL,
    `lost_item_id` CHAR(36) NOT NULL,
    `found_item_id` CHAR(36) NOT NULL,
    `match_score` DECIMAL(3,2) NOT NULL,
    `match_reason` TEXT NULL,
    `status` ENUM('Suggested', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Suggested',
    `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`match_id`),
    INDEX `ix_match_lost_item_id` (`lost_item_id`),
    INDEX `ix_match_found_item_id` (`found_item_id`),
    CONSTRAINT `fk_match_lost_item` FOREIGN KEY (`lost_item_id`) REFERENCES `lost_item` (`lost_item_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_match_found_item` FOREIGN KEY (`found_item_id`) REFERENCES `found_item` (`found_item_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 7. Notification
-- ============================================
CREATE TABLE `notification` (
    `notification_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `notification_type` ENUM('Match', 'Claim', 'Reminder', 'System') NOT NULL DEFAULT 'System',
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`notification_id`),
    INDEX `ix_notification_user_id` (`user_id`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 8. VerificationRecord
-- ============================================
CREATE TABLE `verification_record` (
    `verification_id` CHAR(36) NOT NULL,
    `claim_id` CHAR(36) NOT NULL,
    `officer_id` CHAR(36) NULL,
    `verification_method` VARCHAR(100) NOT NULL,
    `result` ENUM('Passed', 'Failed') NOT NULL,
    `notes` TEXT NULL,
    `verified_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`verification_id`),
    INDEX `ix_verification_record_claim_id` (`claim_id`),
    CONSTRAINT `fk_verification_record_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`claim_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_verification_record_officer` FOREIGN KEY (`officer_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 9. CollectionRecord
-- ============================================
CREATE TABLE `collection_record` (
    `collection_id` CHAR(36) NOT NULL,
    `claim_id` CHAR(36) NOT NULL,
    `collected_by` VARCHAR(200) NOT NULL,
    `officer_id` CHAR(36) NULL,
    `collection_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `recipient_signature` VARCHAR(255) NULL,
    `remarks` TEXT NULL,
    PRIMARY KEY (`collection_id`),
    INDEX `ix_collection_record_claim_id` (`claim_id`),
    CONSTRAINT `fk_collection_record_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`claim_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_collection_record_officer` FOREIGN KEY (`officer_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 10. Attachment
-- ============================================
CREATE TABLE `attachment` (
    `attachment_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(50) NOT NULL,
    `uploaded_by` CHAR(36) NULL,
    `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `related_entity` ENUM('LostItem', 'FoundItem', 'Claim') NOT NULL,
    PRIMARY KEY (`attachment_id`),
    CONSTRAINT `fk_attachment_user` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- 11. AuditLog
-- ============================================
CREATE TABLE `audit_log` (
    `audit_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity_name` VARCHAR(50) NOT NULL,
    `entity_id` CHAR(36) NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ip_address` VARCHAR(45) NULL,
    PRIMARY KEY (`audit_id`),
    INDEX `ix_audit_log_user_id` (`user_id`),
    INDEX `ix_audit_log_action` (`action`),
    INDEX `ix_audit_log_entity_name` (`entity_name`),
    CONSTRAINT `fk_audit_log_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB;
```

**What you should see:** 11 tables listed in the `trace_db` schema sidebar.

---

## Step 4: Insert Dummy CRUD Records

After creating the tables, insert sample data to demonstrate working foreign
keys. Run these in order (each INSERT depends on the UUIDs generated above):

```sql
-- Seed 4 starter categories
INSERT INTO `category` (`category_id`, `category_name`, `description`, `icon`, `display_order`) VALUES
('a1111111-1111-1111-1111-111111111111', 'Electronics', 'Phones, laptops, tablets, headphones, chargers', 'devices', 1),
('a2222222-2222-2222-2222-222222222222', 'Bags', 'Backpacks, handbags, briefcases, laptop bags', 'bag', 2),
('a3333333-3333-3333-3333-333333333333', 'Clothes', 'Jackets, sweaters, scarves, hats', 'checkroom', 3),
('a4444444-4444-4444-4444-444444444444', 'Documents & Cards', 'IDs, student cards, bank cards, passports', 'credit_card', 4);

-- Insert 3 users (1 per role)
INSERT INTO `user` (`user_id`, `first_name`, `last_name`, `student_number`, `email`, `phone_number`, `password_hash`, `role`, `status`) VALUES
('b1111111-1111-1111-1111-111111111111', 'Alice', 'Student', 'U2023001', 'alice@example.com', '+27 82 000 0001', 'hashed_pw_placeholder', 'User', 'Active'),
('b2222222-2222-2222-2222-222222222222', 'Bob', 'Officer', 'STF001', 'bob@example.com', '+27 82 000 0002', 'hashed_pw_placeholder', 'Officer', 'Active'),
('b3333333-3333-3333-3333-333333333333', 'Carol', 'Admin', 'ADM001', 'carol@example.com', '+27 82 000 0003', 'hashed_pw_placeholder', 'Administrator', 'Active');

-- Insert a LostItem (reported by Alice)
INSERT INTO `lost_item` (`lost_item_id`, `user_id`, `category_id`, `title`, `description`, `brand`, `colour`, `date_lost`, `location_lost`) VALUES
('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Lost iPhone 15', 'Black iPhone 15 Pro with cracked screen protector', 'Apple', 'Black', '2026-08-20 14:30:00', 'Library, 2nd floor');

-- Insert a FoundItem (found by Alice, different item)
INSERT INTO `found_item` (`found_item_id`, `user_id`, `category_id`, `title`, `description`, `brand`, `colour`, `date_found`, `storage_location`) VALUES
('c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Found Black Backpack', 'Black JanSport backpack, contains notebook and pens', 'JanSport', 'Black', '2026-08-21 09:00:00', 'Student Centre, Lost & Found desk');

-- Insert a Match between the lost iPhone and a hypothetical found iPhone
INSERT INTO `found_item` (`found_item_id`, `user_id`, `category_id`, `title`, `description`, `brand`, `colour`, `date_found`, `storage_location`) VALUES
('c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Found iPhone', 'Black iPhone found in Lecture Hall B', 'Apple', 'Black', '2026-08-21 11:00:00', 'Security Office');

INSERT INTO `match` (`match_id`, `lost_item_id`, `found_item_id`, `match_score`, `match_reason`, `status`) VALUES
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 0.85, 'Same category, brand, colour; date within 1 day', 'Suggested');

-- Insert a Claim from Alice for the matched items
INSERT INTO `claim` (`claim_id`, `lost_item_id`, `found_item_id`, `user_id`, `verification_status`, `status`) VALUES
('e1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Pending', 'Active');

-- Insert a Notification for Alice
INSERT INTO `notification` (`notification_id`, `user_id`, `title`, `message`, `notification_type`) VALUES
('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Potential Match Found', 'A found iPhone matches your lost report. View details and submit a claim.', 'Match');

-- Insert an AuditLog entry
INSERT INTO `audit_log` (`audit_id`, `user_id`, `action`, `entity_name`, `entity_id`, `ip_address`) VALUES
('f2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'create', 'LostItem', 'c1111111-1111-1111-1111-111111111111', '127.0.0.1');
```

**What you should see:** `Query OK` for every INSERT with the correct row count.

---

## Step 5: Read (Verify)

Run SELECT queries to confirm the data was inserted correctly and
relationships resolve:

```sql
-- List all users
SELECT user_id, first_name, last_name, role, status FROM `user`;

-- List categories
SELECT category_id, category_name, display_order FROM `category` ORDER BY display_order;

-- List lost items with user name and category name (JOIN verification)
SELECT l.title, u.first_name, c.category_name, l.status
FROM `lost_item` l
JOIN `user` u ON l.user_id = u.user_id
JOIN `category` c ON l.category_id = c.category_id;

-- List found items with user name
SELECT f.title, u.first_name, f.storage_location, f.status
FROM `found_item` f
JOIN `user` u ON f.user_id = u.user_id;

-- List matches with item details
SELECT m.match_score, m.status, l.title AS lost_item, f.title AS found_item
FROM `match` m
JOIN `lost_item` l ON m.lost_item_id = l.lost_item_id
JOIN `found_item` f ON m.found_item_id = f.found_item_id;

-- List claims with user and item info
SELECT cl.verification_status, u.first_name, l.title AS lost_item, f.title AS found_item
FROM `claim` cl
JOIN `user` u ON cl.user_id = u.user_id
LEFT JOIN `lost_item` l ON cl.lost_item_id = l.lost_item_id
LEFT JOIN `found_item` f ON cl.found_item_id = f.found_item_id;

-- Count total records per table
SELECT 'user' AS tbl, COUNT(*) AS cnt FROM `user`
UNION ALL SELECT 'category', COUNT(*) FROM `category`
UNION ALL SELECT 'lost_item', COUNT(*) FROM `lost_item`
UNION ALL SELECT 'found_item', COUNT(*) FROM `found_item`
UNION ALL SELECT 'claim', COUNT(*) FROM `claim`
UNION ALL SELECT 'match', COUNT(*) FROM `match`
UNION ALL SELECT 'notification', COUNT(*) FROM `notification`
UNION ALL SELECT 'audit_log', COUNT(*) FROM `audit_log`;
```

**What you should see:** Results showing correctly joined data across tables.

---

## Step 6: Update

Edit a record to confirm UPDATE works and timestamps persist:

```sql
-- Update Alice's lost item status to 'Matched' (simulating the matching engine)
UPDATE `lost_item`
SET `status` = 'Matched'
WHERE `lost_item_id` = 'c1111111-1111-1111-1111-111111111111';

-- Confirm the change
SELECT title, status FROM `lost_item`
WHERE `lost_item_id` = 'c1111111-1111-1111-1111-111111111111';

-- Update the match status to 'Accepted' (simulating user accepting the match)
UPDATE `match`
SET `status` = 'Accepted'
WHERE `match_id` = 'd1111111-1111-1111-1111-111111111111';

-- Confirm
SELECT status FROM `match` WHERE `match_id` = 'd1111111-1111-1111-1111-111111111111';
```

**What you should see:** Status values updated to `Matched` and `Accepted`.

---

## Step 7: Delete

Remove a record and confirm referential integrity behavior:

```sql
-- Delete a notification (simple cascade, no dependent tables)
DELETE FROM `notification`
WHERE `notification_id` = 'f1111111-1111-1111-1111-111111111111';

-- Confirm it's gone
SELECT COUNT(*) AS remaining FROM `notification`;

-- Attempt to delete a category that has items (should FAIL — RESTRICT)
DELETE FROM `category`
WHERE `category_id` = 'a1111111-1111-1111-1111-111111111111';

-- Expected: Error 1451 — Cannot delete or update a parent row:
-- a foreign key constraint fails (fk_lost_item_category)

-- Delete Alice's user (should CASCADE to her lost_items and found_items)
DELETE FROM `user`
WHERE `user_id` = 'b1111111-1111-1111-1111-111111111111';

-- Confirm cascaded deletion
SELECT COUNT(*) AS remaining_users FROM `user`;
SELECT COUNT(*) AS remaining_lost_items FROM `lost_item`;
```

**What you should see:**
- Deleting a category with items fails (RESTRICT)
- Deleting a user cascades to their items (CASCADE)

---

## Step 8: Export for Submission

### Generate the EER Diagram

1. In MySQL Workbench, go to **Database** → **Reverse Engineer...**
2. Select your `TRACE Local` connection and click **Next**.
3. Select `trace_db` schema and click **Next**.
4. Click **Execute** to retrieve schema objects, then **Next** → **Finish**.
5. The EER Diagram tab opens showing all 11 tables with their relationships.
6. Go to **File** → **Export** and choose **PNG** or **PDF** for the diagram image.
7. Save the exported diagram to your submission folder.

### Export the SQL Creation Script

1. In MySQL Workbench, go to **Server** → **Data Export**.
2. Select `trace_db` schema.
3. Choose "Export to Self-Contained File" and save as `trace_schema.sql`.
4. Click **Start Export**.
5. Alternatively, from the EER Diagram view: **File** → **Export SQL...**

Place both the diagram image and the SQL script in your submission folder
alongside this walkthrough.

---

## Table Summary

| # | Table | Columns | PK | Foreign Keys |
|---|-------|---------|-----|--------------|
| 1 | user | 10 | user_id | — |
| 2 | category | 7 | category_id | — |
| 3 | lost_item | 12 | lost_item_id | user_id → user, category_id → category |
| 4 | found_item | 12 | found_item_id | user_id → user, category_id → category |
| 5 | claim | 10 | claim_id | lost_item_id → lost_item, found_item_id → found_item, user_id → user, officer_id → user |
| 6 | match | 7 | match_id | lost_item_id → lost_item, found_item_id → found_item |
| 7 | notification | 7 | notification_id | user_id → user |
| 8 | verification_record | 7 | verification_id | claim_id → claim, officer_id → user |
| 9 | collection_record | 7 | collection_id | claim_id → claim, officer_id → user |
| 10 | attachment | 7 | attachment_id | uploaded_by → user |
| 11 | audit_log | 7 | audit_id | user_id → user |
