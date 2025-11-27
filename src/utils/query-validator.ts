/**
 * Validates SQL queries for read-only mode
 * Blocks write operations: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, etc.
 */
export function isReadOnlyQuery(sql: string): boolean {
    const normalized = sql.trim().toUpperCase();

    // Allow SELECT, SHOW, DESCRIBE, EXPLAIN
    const allowedPatterns = [
        /^SELECT\s/i,
        /^SHOW\s/i,
        /^DESCRIBE\s/i,
        /^DESC\s/i,
        /^EXPLAIN\s/i,
        /^WITH\s+.*\s+SELECT\s/i, // CTE with SELECT
    ];

    // Check if query matches allowed patterns
    for (const pattern of allowedPatterns) {
        if (pattern.test(normalized)) {
            // Make sure it doesn't contain nested write operations
            if (!containsWriteOperation(normalized)) {
                return true;
            }
        }
    }

    return false;
}

function containsWriteOperation(sql: string): boolean {
    const writePatterns = [
        /\bINSERT\s+INTO\b/i,
        /\bUPDATE\s+/i,
        /\bDELETE\s+FROM\b/i,
        /\bDROP\s+/i,
        /\bCREATE\s+/i,
        /\bALTER\s+/i,
        /\bTRUNCATE\s+/i,
        /\bRENAME\s+/i,
        /\bREPLACE\s+INTO\b/i,
        /\bMERGE\s+INTO\b/i,
        /\bGRANT\s+/i,
        /\bREVOKE\s+/i,
    ];

    return writePatterns.some(pattern => pattern.test(sql));
}

export function validateReadOnlyQuery(sql: string): void {
    if (!isReadOnlyQuery(sql)) {
        throw new Error(
            'Write operations are not allowed in read-only mode. ' +
                'Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are permitted.'
        );
    }
}
