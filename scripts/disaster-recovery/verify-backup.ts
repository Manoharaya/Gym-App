/**
 * FitCore Operational Script — Automated Backup Integrity Verification
 * Usage: pnpm ts-node scripts/disaster-recovery/verify-backup.ts <backup_file_path> [--expected-hash <sha256>]
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

export interface VerificationResult {
  filePath: string;
  exists: boolean;
  readable: boolean;
  computedSha256: string;
  expectedSha256?: string;
  checksumMatches: boolean;
  headerValid: boolean;
  verifiedAt: string;
}

export async function verifyBackupFile(
  filePath: string,
  expectedHash?: string,
): Promise<VerificationResult> {
  const timestamp = new Date().toISOString();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found at path: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const computedSha256 = crypto.createHash('sha256').update(content).digest('hex');

  const checksumMatches = expectedHash ? computedSha256 === expectedHash : true;
  const headerValid = content.startsWith('-- FITCORE ENCRYPTED DATABASE BACKUP');

  const result: VerificationResult = {
    filePath,
    exists: true,
    readable: true,
    computedSha256,
    expectedSha256: expectedHash,
    checksumMatches,
    headerValid,
    verifiedAt: timestamp,
  };

  if (!checksumMatches) {
    console.error('❌ Checksum Mismatch:');
    console.error(`   Expected: ${expectedHash}`);
    console.error(`   Computed: ${computedSha256}`);
  } else if (!headerValid) {
    console.error('❌ Header Validation Failed: Malformed or unencrypted dump file');
  } else {
    console.log('✅ Backup Verification PASSED:');
    console.log(`   Path:     ${filePath}`);
    console.log(`   Checksum: ${computedSha256}`);
    console.log(`   Header:   VALID`);
  }

  return result;
}

if (require.main === module) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error('Usage: ts-node verify-backup.ts <path_to_backup_file>');
    process.exit(1);
  }
  verifyBackupFile(targetPath).catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
}
