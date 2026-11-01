CREATE TABLE passes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    document text NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED'))
);
