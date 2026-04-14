# AR-JEN Clinic System - Entity Relationship Diagram

This diagram outlines the foundational database schema for the AR-JEN Clinic System.
It utilizes Supabase's native `auth.users` for authentication, heavily relying on the unique `UUID` to establish relationships across our custom tables.

```mermaid
erDiagram
    %% Core Authentication (Managed by Supabase)
    "auth.users" {
        UUID id PK
        string email
        string encrypted_password
        timestamp created_at
    }

    %% Custom Public Tables
    patients {
        UUID id PK "FK to auth.users.id"
        string full_name
        integer age
        string contact_number
        timestamp created_at
    }

    appointments {
        UUID id PK
        UUID patient_id FK
        string service_type
        date appointment_date
        string status
        timestamp created_at
    }

    prenatal_records {
        UUID id PK
        UUID patient_id FK
        jsonb health_history
        jsonb lab_results
    }

    birth_plans {
        UUID id PK
        UUID patient_id FK
        string delivery_location
        string birth_attendant
    }

    visit_logs {
        UUID id PK
        UUID patient_id FK
        date visit_date
        string bp
        string weight
        string doctor_notes
    }

    %% Relationships
    "auth.users" ||--|| patients : "has profile"
    patients ||--o{ appointments : "books"
    patients ||--|| prenatal_records : "owns"
    patients ||--|| birth_plans : "sets"
    patients ||--o{ visit_logs : "has"
```
