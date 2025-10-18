import { parseExcelToStructured } from '../../src/utils/excel-parser/parser';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.mock('xlsx', () => {
  const mockRawRows = [
    ['FEBRUARY 2023'],
    ['SR NO.', 'MEMBER NAME', 'CONTACT', 'START DATE', 'NO. OF MONTHS', '01/02/2023'],
    [1, 'JOHN DOE', '9876543210', 44957, '3M', 'P'],
    [2, 'JANE SMITH', '1234567890', 44958, '1M', 'P'],
    ['', 'NO MOBILE', '', '', '6M', ''],
  ];
  return {
    ...jest.requireActual('xlsx'),
    readFile: jest.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    }),
    utils: {
      ...jest.requireActual('xlsx').utils,
      sheet_to_json: jest.fn().mockReturnValue(mockRawRows),
    },
  };
});

describe('Excel Parser End-to-End', () => {
  const sampleWorkbookPath = path.resolve(__dirname, '..', '..', 'REGISTER 2.xlsx');

  it('should run the parser against the mock workbook and produce valid output', () => {
    const { members, attendance, manualReview, diagnostics } = parseExcelToStructured(sampleWorkbookPath);

    // 1. Assert members length > 0
    expect(members.length).toBeGreaterThan(0);
    expect(members.length).toBe(3); // JOHN, JANE, NO MOBILE

    // 2. Assert manual_review length is small
    expect(manualReview.length).toBeLessThanOrEqual(20);
    expect(manualReview.length).toBe(1); // NO MOBILE should be in manual review

    // 3. Assert diagnostics contains detected headers
    expect(diagnostics.detectedHeaders.length).toBeGreaterThan(0);
    expect(diagnostics.detectedHeaders[0].month).toBe('FEBRUARY');
    expect(diagnostics.detectedHeaders[0].year).toBe(2023);

    // Check a specific member
    const john = members.find(m => m.name === 'JOHN DOE');
    expect(john).toBeDefined();
    if (john) {
      expect(john.mobileNormalized).toBe('9876543210');
      expect(john.planType).toBe('Quarterly');
      expect(john.planMonths).toBe(3);
      expect(john.lastAttendance).toBeDefined();
    }

    // Check attendance
    expect(attendance.length).toBe(2);
  });
});
