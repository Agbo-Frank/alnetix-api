/**
 * Normalizes an email address by converting it to lowercase.
 * @param email The email address to normalize.
 * @returns The normalized email address.
 */
export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const paginate = (data: any, total: number, page: number, limit: number) => {
  return {
    items: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};