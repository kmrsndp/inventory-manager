import * as XLSX from 'xlsx';
import { Member } from '@/types/member';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { addMonths, format, parseISO } from 'date-fns';

// Define a more robust header mapping
const columnToFieldMapping: { [key: string]: keyof Member | 'NO. OF MONTHS' | 'DUE DATE' | 'CONTACT' | 'START DATE' | 'STATUS' } = {
  'NAME': 'name',
  'CONTACT': 'mobile',
  'CONTACT NO.': 'mobile', // Handle variations
  'CONTACT NO': 'mobile',
  'NO. OF MONTHS': 'NO. OF MONTHS', // Special handling for plan type derivation
  'START DATE': 'startDate',
  'DATE': 'startDate', // Handle variations
  'DUE DATE': 'nextDueDate',
  'DUE': 'nextDueDate', // Handle variations
  'STATUS': 'status',
};

const isValidDate = (date: Date) => date instanceof Date && !isNaN(date.getTime());

const excelSerialToDate = (serial: number): Date | null => {
  if (typeof serial !== 'number' || isNaN(serial)) {
    return null;
  }
  // Excel's epoch is 1899-12-30 for Windows, 1904-01-01 for Mac. Assuming Windows.
  // 25569 is the number of days between 1899-12-30 and 1970-01-01
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return isValidDate(date) ? date : null;
};

const normalizeMobile = (mobile: string | number): string => {
  if (typeof mobile !== 'string' && typeof mobile !== 'number') {
    return '';
  }
  let normalized = String(mobile).replace(/\s/g, ''); // Remove all spaces
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1); // Remove leading zero
  }
  return normalized;
};

const getPlanType = (monthsValue: string | number | null): Member['planType'] | 'Unknown' => {
  const value = String(monthsValue || '').trim().toUpperCase();
  switch (value) {
    case '1M':
      return 'Monthly';
    case '3M':
      return 'Quarterly';
    case '6M':
      return 'Half-Yearly';
    default:
      return 'Unknown';
  }
};

export const parseExcelData = (file: File): Promise<Partial<Member>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        const members: Partial<Member>[] = [];
        let currentMonth = '';

        // Clean and map headers
        const rawHeaders = jsonData[0].map(h => String(h || '').trim().toUpperCase());
        const headers = rawHeaders.map(h => columnToFieldMapping[h] || h); // Use mapped field name or original if not found

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const firstCell = String(row[0] || '').trim().toUpperCase();

          const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
          if (monthNames.includes(firstCell)) {
            currentMonth = firstCell.charAt(0) + firstCell.slice(1).toLowerCase();
            continue;
          }

          // Skip completely empty rows
          if (row.every(cell => cell === null || cell === '')) {
            continue;
          }

          const memberData: Partial<Member> = {
            id: uuidv4(),
            payments: [],
            totalPaid: 0,
            status: 'Active', // Default status
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            importMonth: currentMonth,
          };

          let rawStartDate: Date | null = null;
          let planDurationMonths: number = 0; // To store duration for calculation

          headers.forEach((header, index) => {
            const value: string | number | null = row[index];

            switch (header) {
              case 'name':
                memberData.name = String(value || '').trim();
                break;
              case 'mobile':
                memberData.mobile = normalizeMobile(value);
                break;
              case 'NO. OF MONTHS': // Custom handling for planType
                const planType = getPlanType(value);
                memberData.planType = planType === 'Unknown' ? undefined : planType; // Set to undefined if unknown, will be defaulted later
                if (planType === 'Monthly') planDurationMonths = 1;
                else if (planType === 'Quarterly') planDurationMonths = 3;
                else if (planType === 'Half-Yearly') planDurationMonths = 6;
                break;
              case 'startDate':
                let date: Date | null = null;
                if (typeof value === 'number') {
                  date = excelSerialToDate(value);
                } else if (typeof value === 'string') {
                  const parsedDate = parseISO(value); // Try parsing as ISO string
                  if (isValidDate(parsedDate)) {
                    date = parsedDate;
                  } else {
                    // Try parsing common date formats if ISO fails
                    const commonFormats = ['MM/dd/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'];
                    for (const _ of commonFormats) { // Renamed to _ to indicate it's intentionally unused
                      const parsed = new Date(value); // Simple Date constructor for flexibility
                      if (isValidDate(parsed)) {
                        date = parsed;
                        break;
                      }
                    }
                  }
                }

                if (date && isValidDate(date)) {
                  rawStartDate = date;
                  memberData.startDate = format(date, 'yyyy-MM-dd');
                } else {
                  console.warn(`Invalid start date value in row ${i + 1}, column ${rawHeaders[index]}. Setting to null.`);
                  memberData.startDate = null;
                }
                break;
              case 'nextDueDate':
                let dueDate: Date | null = null;
                if (typeof value === 'number') {
                  dueDate = excelSerialToDate(value);
                } else if (typeof value === 'string') {
                  const parsedDate = parseISO(value);
                  if (isValidDate(parsedDate)) {
                    dueDate = parsedDate;
                  } else {
                    const commonFormats = ['MM/dd/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'];
                    for (const _ of commonFormats) { // Renamed to _ to indicate it's intentionally unused
                      const parsed = new Date(value);
                      if (isValidDate(parsed)) {
                        dueDate = parsed;
                        break;
                      }
                    }
                  }
                }

                if (dueDate && isValidDate(dueDate)) {
                  memberData.nextDueDate = format(dueDate, 'yyyy-MM-dd');
                } else {
                  console.warn(`Invalid due date value in row ${i + 1}, column ${rawHeaders[index]}. Setting to null.`);
                  memberData.nextDueDate = null;
                }
                break;
              case 'status':
                const statusValue = String(value || '').trim();
                if (['Active', 'DueSoon', 'Overdue', 'Stopped'].includes(statusValue)) {
                  memberData.status = statusValue as Member['status'];
                } else {
                  memberData.status = 'Active'; // Default if invalid
                }
                break;
              default:
                // Ignore other columns not explicitly mapped
                break;
            }
          });

          // Apply default values and calculate nextDueDate if missing
          if (!memberData.planType) {
            memberData.planType = 'Unknown';
          }
          if (!memberData.startDate) {
            const today = new Date();
            memberData.startDate = format(today, 'yyyy-MM-dd');
            rawStartDate = today;
          }

          // Calculate nextDueDate if it's still missing
          if (!memberData.nextDueDate && rawStartDate && planDurationMonths > 0) {
            const calculatedDueDate = addMonths(rawStartDate, planDurationMonths);
            memberData.nextDueDate = format(calculatedDueDate, 'yyyy-MM-dd');
          } else if (!memberData.nextDueDate) {
            memberData.nextDueDate = null; // Ensure it's explicitly null if cannot be calculated
          }

          // Ensure planType is one of the allowed values, default to Unknown if not
          if (!['Monthly', 'Quarterly', 'Half-Yearly'].includes(memberData.planType as string)) {
            memberData.planType = 'Unknown';
          }

          members.push(memberData as Member); // Cast to Member after all processing
        }
        resolve(members);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
