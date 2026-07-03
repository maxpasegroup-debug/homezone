export type PaginationInput = {
  page?: number | string | null;
  pageSize?: number | string | null;
};

export function getPagination({ page = 1, pageSize = 20 }: PaginationInput = {}) {
  const parsedPage = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return {
    page: parsedPage,
    skip: (parsedPage - 1) * take,
    take
  };
}

export function paginatedResponse<T>({
  items,
  page,
  pageSize,
  total
}: {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}) {
  return {
    items,
    pagination: {
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}
