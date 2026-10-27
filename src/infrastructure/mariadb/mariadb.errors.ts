import { SqlError } from 'mariadb';

export const MariaDBErrno = {
  DUP_ENTRY: 1062,
  NO_REFERENCED_ROW: 1452, // foreign key violation to create
  ROW_IS_REFERENCED: 1451, // foreign key violation to delete
} as const;

export function isSqlError(error: unknown): error is SqlError {
  return error instanceof SqlError;
}

export function isDuplicateEntry(error: unknown): boolean {
  return isSqlError(error) && error.errno === MariaDBErrno.DUP_ENTRY;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return isSqlError(error) && error.errno === MariaDBErrno.NO_REFERENCED_ROW;
}
