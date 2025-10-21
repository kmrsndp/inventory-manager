import { NextRequest, NextResponse } from 'next/server';
import { parseExcelToStructured } from '@/utils/excel-parser/parser';
import { writeMembersToFirestore } from '@/utils/excel-parser/firestore';
import { ImportReport } from '@/utils/excel-parser/types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), file.name);
    fs.writeFileSync(tempFilePath, buffer);

    const { members, manualReview, diagnostics } = parseExcelToStructured(tempFilePath);

    fs.unlinkSync(tempFilePath); // Clean up the temporary file

    const report: ImportReport = {
      totalRows: diagnostics.totalRows,
      parsedRows: diagnostics.parsedRows,
      created: 0,
      updated: 0,
      skipped: diagnostics.skippedRows,
      conflicts: [],
      errors: [],
    };

    if (members.length > 0) {
      await writeMembersToFirestore(members, report);
    }

    return NextResponse.json({
      success: true,
      message: 'File processed successfully',
      data: {
        membersCount: members.length,
        manualReviewCount: manualReview.length,
        diagnostics,
      },
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
