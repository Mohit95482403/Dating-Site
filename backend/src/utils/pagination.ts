export interface PaginationParams {
  page?: string | number;
  limit?: string | number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginationUtil {
  public static readonly DEFAULT_PAGE = 1;
  public static readonly DEFAULT_LIMIT = 20;
  public static readonly MAX_LIMIT = 100;

  /**
   * Parse and sanitize query parameters for pagination
   */
  public static getPaginationOptions(params: PaginationParams): PaginationOptions {
    let page = parseInt(String(params.page || this.DEFAULT_PAGE), 10);
    let limit = parseInt(String(params.limit || this.DEFAULT_LIMIT), 10);

    if (isNaN(page) || page < 1) {
      page = this.DEFAULT_PAGE;
    }

    if (isNaN(limit) || limit < 1) {
      limit = this.DEFAULT_LIMIT;
    } else if (limit > this.MAX_LIMIT) {
      limit = this.MAX_LIMIT;
    }

    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Compute pagination metadata given total item count
   */
  public static getMetadata(total: number, page: number, limit: number): PaginationMetadata {
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}

export default PaginationUtil;
