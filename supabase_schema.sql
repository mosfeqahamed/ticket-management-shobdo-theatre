CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'sub-admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dramas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drama_name TEXT NOT NULL,
    display_date DATE NOT NULL,
    custom_sms TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drama_id UUID REFERENCES dramas(id),
    contact_id UUID REFERENCES contacts(id),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    sms_request_id TEXT,
    error TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);
