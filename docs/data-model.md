# Data model

One database per service (ADR-06, Figure 5.1), so one diagram per service. A service never reads another service's
database: a `roundId` in the Booking DB is a reference by identifier, not a foreign key, and what a service needs
from another it asks by gRPC. The diagrams are the source of the types; the chain is

```
ER diagram (this file)  ->  src/domain/model.ts of the service  the entities as TypeScript types, used by the rules and the repositories
                        ->  proto/*.proto messages          the projection that crosses services (only what a caller needs)
                        ->  gateway routes (contracts.md)   the same messages as JSON, one route per method (parameters snapshot, version, …)
```

Change the diagram first, then `model.ts`, then the `.proto` (and `npm run proto`), then `contracts.md`.

## Concert Round Service — Round DB (owner: Natchy)

```mermaid
erDiagram
    ZONE_MAP ||--o{ ZONE : "has"
    ZONE ||--o{ ZONE_MAP_TABLE : "contains"
    TABLE_TYPE ||--o{ ZONE_MAP_TABLE : "types"
    ZONE_MAP ||--o{ ROUND : "is used by"
    ROUND ||--o{ PACKAGE_PRICE : "prices"
    BUSINESS_PARAMETERS ||--o{ ROUND : "in force at publish"

    ZONE_MAP {
        string id PK
        string name
        string status "Draft | Active"
        string imageUrl "Media Storage Adapter"
        string createdAt
    }
    ZONE {
        string id PK
        string name
    }
    ZONE_MAP_TABLE {
        int tableNumber PK "unique in the map"
        string zoneId FK
        string tableTypeId FK
        int capacity
        int x
        int y
    }
    TABLE_TYPE {
        string id PK
        string name
        int capacity
        string packageContent
    }
    ROUND {
        string id PK
        string name
        string artist
        string status "Draft | Published"
        string date "YYYY-MM-DD"
        string doorsOpenAt
        string startAt
        string bookingOpenAt "BRULE-07"
        string zoneMapId FK
        int[] tablesNotForSale
        json checkInWindow "opensAt, startAt, graceEndsAt (BRULE-04, 05)"
        json parameters "snapshot at publish (FR-38)"
        string createdAt
    }
    PACKAGE_PRICE {
        string zoneId FK
        string tableTypeId FK
        int packagePrice "THB, BRULE-08"
        string packageContent
    }
    BUSINESS_PARAMETERS {
        int holdPeriodMinutes "15, BRULE-02"
        int checkInWindowHours "2, BRULE-04"
        int gracePeriodMinutes "30, BRULE-05"
        int extraPersonFee "600 THB, BRULE-09"
    }
```

Stored as documents: a zone map is one document with its zones and tables embedded (ADR-06); a round embeds its prices,
its check-in window and the snapshot of the parameters. What crosses to other services: `Round` (with the tables of its
map, joined for the caller), `RoundPricing`, `CheckInWindow` (`proto/concert_round.proto`).

## Table Availability Service — Table Status DB (owner: Will)

```mermaid
erDiagram
    ROUND_TABLE_STATUS ||--|{ TABLE_STATUS : "one per table of the round"

    ROUND_TABLE_STATUS {
        string roundId PK "the round of the Concert Round Service (reference, not FK)"
        int version "grows on every change; ETag of the polled read"
    }
    TABLE_STATUS {
        int tableNumber PK
        string status "AVAILABLE | HELD | BOOKED | OCCUPIED | NOT_FOR_SALE"
        string bookingId "reference to the Booking DB"
        string holdEndsAt "set by the Booking Service"
    }
```

One document per round with its tables embedded: the read model of the table map (ADR-13). The Booking Service wins
the hold in its own database and then reports each transition here; `holdTable()` is one conditional update of the
document. The gRPC messages are this model one to one.

## Booking Service — Booking DB (owner: Peat SE)

```mermaid
erDiagram
    CUSTOMER_PROFILE ||--o{ BOOKING : "makes"
    BOOKING ||--o| FEE : "has, once the party size is set"

    CUSTOMER_PROFILE {
        string customerId PK "LINE user id (BRULE-12)"
        string name
        string phone "Thai mobile number"
        string consentAt "PDPA consent (FR-10, BRULE-11)"
    }
    BOOKING {
        string id PK
        string customerId FK
        string roundId "reference to the Round DB"
        int tableNumber "reference to the Table Status DB"
        string zoneId "copied from the round at hold time"
        string zoneName
        string tableTypeId
        int capacity
        string status "Held | Confirmed | Checked-in | Cancelled | Expired | No-show"
        string holdEndsAt "BRULE-02; the expiry job owns it (ADR-08)"
        int partySize
        boolean termsAccepted "BRULE-16"
        string createdAt
    }
    FEE {
        int packagePrice
        int extraPersons
        int extraPersonFee
        int fullTableFee "BRULE-01, BRULE-09"
    }
```

The booking is the source of truth of the hold (ADR-13): a unique partial index on (`roundId`, `tableNumber`) where the
status is active (Held, Confirmed, Checked-in) lets exactly one insert win (BRULE-03), and `history` records every
transition. The booking copies zone, table type and capacity from the round when the table is held, so that the fee and
the ticket do not change if the map is edited later (BRULE-07). Progress 2 adds the e-ticket (signed booking reference), the
payment reference and the check-in record (time, staff account) to `BOOKING`.

## Payment Service — Payment DB

```mermaid
erDiagram
    PAYMENT {
        string paymentId PK
        string bookingId "reference to the Booking DB"
        string customerId "LINE user id"
        int amount "THB, the full table fee (BRULE-01)"
        string status "Pending | Paid | Failed"
        string checkoutUrl "simulated Payment Gateway (ADR-11)"
        string createdAt
        string resultAt "when the gateway's result was recorded"
    }
```

One document per payment request; the result is recorded once (a duplicate callback is ignored).

## Notification Service — Notification DB

```mermaid
erDiagram
    MESSAGE {
        string messageId PK
        string customerId "LINE user id"
        string bookingId "reference to the Booking DB"
        string kind "BookingConfirmation | HoldExpiredNotice | PaymentFailedNotice"
        string text
        boolean delivered
        string sentAt
    }
```

## Staff Account Service — Staff Account DB

```mermaid
erDiagram
    STAFF_ACCOUNT ||--o{ SESSION : "signs in as"

    STAFF_ACCOUNT {
        string staffAccountId PK
        string username "unique"
        string role "manager | front_staff | owner (Table 5.2)"
        string status "Active | Disabled"
        string passwordSalt
        string passwordHash "scrypt"
        string createdAt
    }
    SESSION {
        string token PK
        string staffAccountId FK
        string role
        string createdAt
    }
```

Sessions live in the Staff Account DB next to the accounts, in memory unless the service is configured for MongoDB (ADR-06, ADR-07); disabling an account ends its sessions.

## Not modelled yet

The message broker, service discovery and a relational database next to MongoDB are open decisions (KI-14 of the
project document); the check-in record and the e-ticket fields of `BOOKING` come with progress 2.
