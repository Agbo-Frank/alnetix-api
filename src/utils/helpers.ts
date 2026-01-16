import dayjs from 'dayjs';
import { User } from 'src/generated/client';

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

export const computeIsActive = (user: Pick<User, 'membership_due_date' | 'is_disabled'>): boolean => {
  if (!user.membership_due_date || user.is_disabled) {
    return false;
  }
  return dayjs().isBefore(dayjs(user.membership_due_date)) ||
    dayjs().isSame(dayjs(user.membership_due_date));
};