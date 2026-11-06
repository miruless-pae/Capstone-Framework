// Kode error PostgreSQL untuk pelanggaran unique constraint.
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505';
}
