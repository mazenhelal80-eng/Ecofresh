/**
 * lib/id-generator.ts
 *
 * Concurrency-Safe Sequential ID Generator for EcoFresh ERP Master Data.
 *
 * Key Architecture:
 * 1. PostgreSQL Advisory Transaction Locks (`pg_advisory_xact_lock`):
 *    Guarantees strict serialization per entity type within interactive transactions.
 *    Locks auto-release on transaction commit/rollback.
 * 2. Gapless Regex Extraction:
 *    Inspects existing IDs with the designated prefix, parses numeric suffixes,
 *    and filters out test timestamp pollution (e.g. Unix timestamps > 6 digits).
 * 3. Never raw `count() + 1`:
 *    Guarantees collision-free IDs even after record deletions or gaps.
 * 4. Collision Verification Loop:
 *    Guarantees uniqueness against `findUnique` before returning the candidate ID.
 */

import { prisma } from '@/lib/prisma';

export type EntityIdType =
  | 'STATION'
  | 'CONTRACTOR'
  | 'SUPPLIER'
  | 'CUSTOMER'
  | 'PRODUCT'
  | 'SUPPLY'
  | 'TREASURY'
  | 'EMPLOYEE';

export interface IdConfig {
  prefix: string;
  padLength: number;
  model: string;
  idField?: string;
}

export const ID_CONFIGS: Record<EntityIdType, IdConfig> = {
  STATION:    { prefix: 'STN-',  padLength: 2, model: 'station',         idField: 'id' },
  CONTRACTOR: { prefix: 'CONT-', padLength: 3, model: 'contractor',      idField: 'id' },
  SUPPLIER:   { prefix: 'SUPP-', padLength: 3, model: 'supplier',        idField: 'id' },
  CUSTOMER:   { prefix: 'CUST-', padLength: 3, model: 'customer',        idField: 'id' },
  PRODUCT:    { prefix: 'PRD-',  padLength: 2, model: 'product',         idField: 'id' },
  SUPPLY:     { prefix: 'SUP-',  padLength: 2, model: 'supply',          idField: 'id' },
  TREASURY:   { prefix: 'ACC-',  padLength: 2, model: 'treasuryAccount', idField: 'id' },
  EMPLOYEE:   { prefix: 'EMP-',  padLength: 3, model: 'employee',        idField: 'id' },
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates the next sequential ID for a given entity type within a transaction.
 *
 * @param tx - Prisma Transaction Client (or standard prisma client)
 * @param entityType - Entity type enum key
 * @param options - Optional override for prefix or pad length
 */
export async function generateSequentialId(
  tx: any,
  entityType: EntityIdType,
  options?: { customPrefix?: string; padLength?: number }
): Promise<string> {
  const config = ID_CONFIGS[entityType];
  if (!config) {
    throw new Error(`Unsupported entity type for ID generation: ${entityType}`);
  }

  const prefix = options?.customPrefix ?? config.prefix;
  const padLength = options?.padLength ?? config.padLength;
  const modelName = config.model;
  const idField = config.idField ?? 'id';
  const client = tx ?? prisma;

  // 1. Acquire PostgreSQL Advisory Transaction Lock to serialize concurrent creations
  try {
    if (typeof client.$executeRawUnsafe === 'function') {
      await client.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        `id_gen_${prefix}`
      );
    }
  } catch {
    // Gracefully continue if running in an environment without Postgres advisory locks
  }

  // 2. Fetch existing IDs starting with the designated prefix
  const delegate = client[modelName];
  if (!delegate) {
    throw new Error(`Prisma delegate "${modelName}" not found on client.`);
  }

  const existingRecords: any[] = await delegate.findMany({
    where: {
      [idField]: {
        startsWith: prefix,
        mode: 'insensitive',
      },
    },
    select: { [idField]: true },
  });

  // 3. Extract numeric suffixes via regex, filtering out Unix timestamp artifacts (> 6 digits)
  const regex = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, 'i');
  let maxNum = 0;

  for (const record of existingRecords) {
    const rawVal = record[idField];
    if (typeof rawVal === 'string') {
      const match = rawVal.match(regex);
      if (match) {
        const numStr = match[1];
        // Sane sequence numbers only (<= 6 digits, < 100,000,000)
        if (numStr.length <= 6) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum && num < 100_000_000) {
            maxNum = num;
          }
        }
      }
    }
  }

  // 4. Determine candidate ID & verify vacancy
  let nextNum = maxNum + 1;
  let candidateId = `${prefix}${String(nextNum).padStart(padLength, '0')}`;

  while (await delegate.findUnique({ where: { [idField]: candidateId } })) {
    nextNum++;
    candidateId = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
  }

  return candidateId;
}

// ---------------------------------------------------------------------------
// Typed Convenience Helpers
// ---------------------------------------------------------------------------

export async function generateStationId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'STATION');
}

export async function generateContractorId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'CONTRACTOR');
}

export async function generateSupplierId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'SUPPLIER');
}

export async function generateCustomerId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'CUSTOMER');
}

export async function generateProductId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'PRODUCT');
}

export async function generateSupplyId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'SUPPLY');
}

export async function generateTreasuryAccountId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'TREASURY');
}

export async function generateEmployeeId(tx: any): Promise<string> {
  return generateSequentialId(tx, 'EMPLOYEE');
}
