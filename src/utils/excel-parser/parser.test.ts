import { parseExcel } from './parser';
import { MONTH_NAMES } from './parser'; // Import MONTH_NAMES
import * as path from 'path';
import * as fs from 'fs';

// Mock firebase-admin to prevent actual Firestore calls during unit tests
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => ({
          exists: false,
          data: () => ({}),
        })),
      })),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn(),
    })),
  })),
}));

describe('Excel Parser', () => {
  const testExcelPath = path.join(__dirname, '..', '..', '..', 'REGISTER 2.xlsx'); // Adjust path as needed

  // Create a dummy Excel file for testing if it doesn't exist
  beforeAll(() => {
    if (!fs.existsSync(testExcelPath)) {
      console.warn(`Test Excel file not found at ${testExcelPath}. Please ensure 'REGISTER 2.xlsx' is present for tests.`);
    }
  });

  it('should parse the Excel file and return members and a report', async () => {
    if (!fs.existsSync(testExcelPath)) {
      console.warn('Skipping test: Test Excel file not found.');
      return;
    }

    const { members, report } = await parseExcel(testExcelPath);

    expect(members).toBeInstanceOf(Array);
    expect(report).toBeDefined();
    // console.log('Import Report:', JSON.stringify(report));
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.parsedRows).toBeGreaterThan(0);
    expect(report.skipped).toBeDefined();

    // Example: Check a specific member's data if you have a known structure in REGISTER 2.xlsx
    const abhijit = members.find(m => m.name === 'ABHIJIT CHHATAR');
    if (abhijit) {
      expect(abhijit.mobileNormalized).toBe('9583384021');
      expect(abhijit.planType).toBe('Quarterly');
      expect(abhijit.planMonths).toBe(3);
      expect(abhijit.startDate).toBe('2023-02-15'); // Assuming this is in the test file
      expect(abhijit.attendance.length).toBeGreaterThan(0);
      expect(abhijit.lastAttendance).toBeDefined();
      expect(abhijit.nextExpectedAttendance).toBeDefined();
      expect(abhijit.nextPaymentDueByPlan).toBeDefined();
      expect(abhijit.attendedMonths.length).toBeGreaterThan(0);
    } else {
      console.warn('ABHIJIT CHHATAR not found in parsed members. Please ensure test data is correct.');
    }
  });

  it('should correctly detect month header rows', async () => {
    if (!fs.existsSync(testExcelPath)) {
      console.warn('Skipping test: Test Excel file not found.');
      return;
    }

    const { members, report } = await parseExcel(testExcelPath);
    // Assuming there are month headers, some rows should be skipped
    console.log("report.skipped:", report.skipped);
    
    expect(report.skipped).toBeGreaterThan(0);
    // Check if importMonth is correctly assigned to members
    const memberWithImportMonth = members.find(m => m.importMonth && m.importMonth !== "UNKNOWN");
    expect(memberWithImportMonth).toBeDefined();
    if (memberWithImportMonth && memberWithImportMonth.importMonth !== "UNKNOWN") {
      expect(MONTH_NAMES.map(m => m.toUpperCase())).toContain(memberWithImportMonth.importMonth);
    } else {
      console.warn("No valid importMonth detected; check if header rows have month labels.");
    }
  });

  it('should normalize mobile numbers correctly', async () => {
    if (!fs.existsSync(testExcelPath)) {
      console.warn('Skipping test: Test Excel file not found.');
      return;
    }

    const { members } = await parseExcel(testExcelPath);
    const testMember = members.find(m => m.mobile === '+919583384021'); // Example from prompt
    if (testMember) {
      expect(testMember.mobileNormalized).toBe('9583384021');
    }
  });

  it('should map planRaw values correctly', async () => {
    if (!fs.existsSync(testExcelPath)) {
      console.warn('Skipping test: Test Excel file not found.');
      return;
    }

    const { members } = await parseExcel(testExcelPath);
    const member1M = members.find(m => m.planRaw === '1M'); // Assuming such a member exists
    if (member1M) {
      expect(member1M.planType).toBe('Monthly');
      expect(member1M.planMonths).toBe(1);
    }
    const member3M = members.find(m => m.planRaw === '3M'); // Assuming such a member exists
    if (member3M) {
      expect(member3M.planType).toBe('Quarterly');
      expect(member3M.planMonths).toBe(3);
    }
  });

  // Add more tests for date calculations, attendance extraction, etc.
});
