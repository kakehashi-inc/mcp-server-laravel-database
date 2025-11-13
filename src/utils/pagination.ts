export interface PaginationParams {
  maxRows?: number;
  offset?: number;
  page?: number;
  perPage?: number;
}

export interface PaginationResult {
  limit: number;
  offset: number;
}

/**
 * Calculate pagination parameters
 * Priority: page/per_page > offset/max_rows > max_rows only
 */
export function calculatePagination(params: PaginationParams): PaginationResult | null {
  const { maxRows, offset, page, perPage } = params;

  // If page and perPage are provided, use them
  if (page !== undefined && perPage !== undefined) {
    if (page < 1) {
      throw new Error('Page number must be >= 1');
    }
    if (perPage < 1) {
      throw new Error('Per page value must be >= 1');
    }

    return {
      limit: perPage,
      offset: (page - 1) * perPage,
    };
  }

  // If offset and maxRows are provided
  if (offset !== undefined && maxRows !== undefined) {
    if (offset < 0) {
      throw new Error('Offset must be >= 0');
    }
    if (maxRows < 1) {
      throw new Error('Max rows must be >= 1');
    }

    return {
      limit: maxRows,
      offset: offset,
    };
  }

  // If only maxRows is provided
  if (maxRows !== undefined) {
    if (maxRows < 1) {
      throw new Error('Max rows must be >= 1');
    }

    return {
      limit: maxRows,
      offset: 0,
    };
  }

  // No pagination
  return null;
}

/**
 * Apply pagination to SQL query
 */
export function applySqlPagination(sql: string, pagination: PaginationResult): string {
  // Check if SQL already has LIMIT clause
  if (/\bLIMIT\s+\d+/i.test(sql)) {
    throw new Error('SQL query already contains LIMIT clause. Remove it to use pagination parameters.');
  }

  let paginatedSql = sql.trim();

  // Remove trailing semicolon if present
  if (paginatedSql.endsWith(';')) {
    paginatedSql = paginatedSql.slice(0, -1);
  }

  // Add LIMIT and OFFSET
  paginatedSql += ` LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;

  return paginatedSql;
}
