import type { ValueTransformer } from 'typeorm';

// PostgreSQL mengirim numeric/decimal/bigint sebagai string; ubah ke number di sisi aplikasi.
export const numberTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
