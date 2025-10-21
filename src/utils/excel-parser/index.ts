import { parseExcelToStructured } from './parser';
import { writeMembersToFirestore } from './firestore';
import { ImportReport, Diagnostics, Member, ManualReviewRow, AttendanceRow } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main function to parse an Excel file and upload members to Firestore.
 * @param filePath The path to the Excel file.
 * @param outputDir The directory to save the raw parsed JSON report.
 * @returns A promise that resolves to the final import report.
 */
export async function importExcelToFirestore(filePath: string, outputDir: string = './imports'): Promise<ImportReport> {
  console.log(`Starting Excel import for file: ${filePath}`);

  const { members, attendance, manualReview, diagnostics } = parseExcelToStructured(filePath);

  const report: ImportReport = {
    totalRows: diagnostics.totalRows,
    parsedRows: diagnostics.parsedRows,
    created: 0, // Will be updated by writeMembersToFirestore
    updated: 0, // Will be updated by writeMembersToFirestore
    skipped: diagnostics.skippedRows,
    conflicts: [], // Will be updated by writeMembersToFirestore
    errors: [], // Will be updated by writeMembersToFirestore
  };

  console.log(`Parsed ${report.parsedRows} rows. Found ${members.length} members to process.`);

  // Save raw parsed JSON for audit
  const originalFileName = path.basename(filePath, path.extname(filePath));
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
  const auditFileName = `YYYYMMDD_${originalFileName}.json`.replace('YYYYMMDD', timestamp.substring(0, 8));
  const auditFilePath = path.join(outputDir, auditFileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(auditFilePath, JSON.stringify(members, null, 2));
  console.log(`Raw parsed JSON saved to: ${auditFilePath}`);

  console.log('Writing members to Firestore...');
  await writeMembersToFirestore(members, report);
  console.log('Firestore write complete.');

  console.log('\n--- Import Report ---');
  console.log(`Total Rows in Excel: ${report.totalRows}`);
  console.log(`Parsed Rows: ${report.parsedRows}`);
  console.log(`Members Created: ${report.created}`);
  console.log(`Members Updated: ${report.updated}`);
  console.log(`Rows Skipped: ${report.skipped}`);
  console.log(`Conflicts Detected: ${report.conflicts.length}`);
  if (report.conflicts.length > 0) {
    console.log('Conflict Details:');
    report.conflicts.forEach(conflict => {
      console.log(`  - Mobile: ${conflict.mobile}, Existing Name: "${conflict.existingName}", Imported Name: "${conflict.importedName}", Row: ${conflict.rowNumber}`);
    });
  }
  console.log('---------------------\n');

  return report;
}

// Example usage (for local testing)
// if (require.main === module) {
//   const excelFilePath = process.argv[2];
//   if (!excelFilePath) {
//     console.error('Usage: ts-node index.ts <path_to_excel_file>');
//     process.exit(1);
//   }
//   importExcelToFirestore(excelFilePath)
//     .then(report => console.log('Import process finished.'))
//     .catch(error => console.error('Import process failed:', error));
// }
