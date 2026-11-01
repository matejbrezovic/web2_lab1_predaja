import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

export async function countPasses(): Promise<{ total: number; active: number}> {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active
         FROM passes`
    );
    return result.rows[0];
}


export type Pass = {
    id: string;
    name: string;
    document: string;
    issuedAt: Date;
    status: "ACTIVE" | "CANCELLED";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPass(name: string, document: string): Promise<string> {
    const result = await pool.query(
        "INSERT INTO passes (name, document) VALUES ($1, $2) RETURNING id",
        [name, document]
    );
    return result.rows[0].id;
}

export async function getPass(id: string): Promise<Pass | undefined> {
    if (!UUID_PATTERN.test(id)) {
        return undefined;
    }
    const result = await pool.query(
        `SELECT id, name, document, issued_at AS "issuedAt", status
         FROM passes
         WHERE id = $1`,
        [id]
    );
    return result.rows[0];
}


export async function listPasses(): Promise<Pass[]> {
    const result = await pool.query(
        `SELECT id, name, document, issued_at AS "issuedAt", status
        FROM passes
        ORDER BY issued_at DESC`
    );
    return result.rows;
}

export async function cancelPass(id: string): Promise<boolean> {
    if (!UUID_PATTERN.test(id)) {
        return false;
    }

    const result = await pool.query("UPDATE passes SET status = 'CANCELLED' WHERE id = $1", [id]);
    return result.rowCount === 1;
}

export async function deletePass(id: string): Promise<boolean> {
    if (!UUID_PATTERN.test(id)) {
        return false;
    }

    const result = await pool.query("DELETE FROM passes WHERE id = $1", [id]);
    return result.rowCount === 1;
}
