import * as fs from 'fs';
import * as path from 'path';
import { parseExcelToStructured } from '../src/utils/excel-parser/parser';

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node -r ts-node/register scripts/run-parse.ts <path-to-excel-file>');
    process.exit(1);
  }
  const filePath = path.resolve(argv[0]);
  const outDir = path.resolve(process.cwd(), 'parsed_output');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Parsing Excel file: ${filePath}`);
  const { members, attendance, manualReview, diagnostics } = parseExcelToStructured(filePath);

  fs.writeFileSync(path.join(outDir, 'members.json'), JSON.stringify(members, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'attendance.json'), JSON.stringify(attendance, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'manual_review.json'), JSON.stringify(manualReview, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');

  console.log(`Parsed output saved to ${outDir}`);
  console.log(`- Members: ${members.length}`);
  console.log(`- Attendance records: ${attendance.length}`);
  console.log(`- Manual review items: ${manualReview.length}`);
}
