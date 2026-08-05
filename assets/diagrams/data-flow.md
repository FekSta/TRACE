# TRACE Data Flow

---

# Administrator

## 1. Maintain Users

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View existing users | User | `SELECT * FROM User;` |
| Add new user | User | `INSERT INTO User (...) VALUES (...);` |
| Update existing user | User | `UPDATE User SET ... WHERE UserID = ?;` |
| Delete user | User | `DELETE FROM User WHERE UserID = ?;` |

---

## 2. Maintain Categories

> **Categories:** Electronics, Bags, Clothes, Documents & Cards

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View categories | Category | `SELECT * FROM Category;` |
| Add category | Category | `INSERT INTO Category (...) VALUES (...);` |
| Update category | Category | `UPDATE Category SET ... WHERE CategoryID = ?;` |
| Delete/Archive category | Category | `DELETE FROM Category WHERE CategoryID = ?;` |

---

## 3. Generate Reports

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| Generate users report | User | `SELECT * FROM User;` |
| Generate lost items report | LostItem | `SELECT * FROM LostItem;` |
| Generate found items report | FoundItem | `SELECT * FROM FoundItem;` |
| Generate claims report | Claim | `SELECT * FROM Claim;` |

---

# Lost & Found Officer

## 1. Verify Lost Item Reports

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View lost item reports | LostItem | `SELECT * FROM LostItem;` |
| Verify/Update lost item status | LostItem | `UPDATE LostItem SET Status='Verified' WHERE LostItemID=?;` |

---

## 2. Verify Found Item Reports

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View found item reports | FoundItem | `SELECT * FROM FoundItem;` |
| Verify/Update found item status | FoundItem | `UPDATE FoundItem SET Status='Verified' WHERE FoundItemID=?;` |

---

## 3. Maintain Claims

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View claims | Claim | `SELECT * FROM Claim;` |
| Approve claim | Claim | `UPDATE Claim SET VerificationStatus='Approved' WHERE ClaimID=?;` |
| Reject claim | Claim | `UPDATE Claim SET VerificationStatus='Rejected' WHERE ClaimID=?;` |

---

# User

## 1. Register Account

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| Create account | User | `INSERT INTO User (...) VALUES (...);` |

---

## 2. Login

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| Validate user credentials | User | `SELECT * FROM User WHERE Email=?;` |

---

## 3. Report Lost Item

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View own lost items | LostItem | `SELECT * FROM LostItem WHERE UserID=?;` |
| Add lost item | LostItem | `INSERT INTO LostItem (...) VALUES (...);` |
| Update lost item | LostItem | `UPDATE LostItem SET ... WHERE LostItemID=?;` |
| Delete lost item | LostItem | `DELETE FROM LostItem WHERE LostItemID=?;` |

---

## 4. Report Found Item

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View own found items | FoundItem | `SELECT * FROM FoundItem WHERE UserID=?;` |
| Add found item | FoundItem | `INSERT INTO FoundItem (...) VALUES (...);` |
| Update found item | FoundItem | `UPDATE FoundItem SET ... WHERE FoundItemID=?;` |
| Delete found item | FoundItem | `DELETE FROM FoundItem WHERE FoundItemID=?;` |

---

## 5. Submit Ownership Claim

| Action | Data Store | Simple SQL |
|--------|------------|------------|
| View found items | FoundItem | `SELECT * FROM FoundItem;` |
| Submit claim | Claim | `INSERT INTO Claim (...) VALUES (...);` |
| Track claim status | Claim | `SELECT * FROM Claim WHERE UserID=?;` |
