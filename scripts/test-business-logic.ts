import { formatCurrency, formatDate, formatDateTime, generateId } from '../src/utils/formatters';
import Papa from 'papaparse';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n--- 1. Testing Formatters & Utilities ---');

assert(formatCurrency(1250.5, '$') === '$1,250.50', 'Formats standard USD currency with commas');
assert(formatCurrency(0, '€') === '€0.00', 'Formats zero amount with EUR symbol');
assert(formatCurrency(undefined, '$') === '$0.00', 'Handles undefined safely');
assert(formatCurrency(49.99, 'AED ') === 'AED 49.99', 'Formats custom multi-character currency');

const testDate = '2026-11-23T14:30:00.000Z';
assert(formatDate(testDate, 'YYYY-MM-DD') === '2026-11-23', 'Formats date YYYY-MM-DD');
assert(formatDate(testDate, 'DD/MM/YYYY') === '23/11/2026', 'Formats date DD/MM/YYYY');
assert(formatDate(testDate, 'MM/DD/YYYY') === '11/23/2026', 'Formats date MM/DD/YYYY');
assert(formatDate(testDate, 'MMM D, YYYY') === 'Nov 23, 2026', 'Formats date MMM D, YYYY');

const id1 = generateId('prod');
const id2 = generateId('prod');
assert(id1.startsWith('prod_') && id2.startsWith('prod_') && id1 !== id2, 'Generates unique IDs with prefix');

console.log('\n--- 2. Testing Delivery Calculations ---');

const testItems = [
  { id: '1', name: 'Item A', quantity: 3, unitPrice: 20.0, total: 60.0 },
  { id: '2', name: 'Item B', quantity: 2, unitPrice: 15.5, total: 31.0 },
  { id: '3', name: 'Custom Fee', quantity: 1, unitPrice: 10.0, total: 10.0, isCustom: true },
];

const totalQuantity = testItems.reduce((s, i) => s + i.quantity, 0);
assert(totalQuantity === 6, 'Total quantity correctly aggregates to 6');

const subtotal = testItems.reduce((s, i) => s + i.total, 0);
assert(subtotal === 101.0, 'Subtotal correctly calculates 60 + 31 + 10 = 101.0');

const discount = 15.0;
const grandTotal = Math.max(0, subtotal - discount);
assert(grandTotal === 86.0, 'Grand total accounts for discount (101 - 15 = 86)');

const oversizedDiscount = 200.0;
const grandTotalCapped = Math.max(0, subtotal - oversizedDiscount);
assert(grandTotalCapped === 0, 'Grand total safely caps at 0 when discount exceeds subtotal');

console.log('\n--- 3. Testing CSV Export & Import ---');

const sampleProducts = [
  {
    'Product Name': 'Heavy Duty Stapler',
    SKU: 'STP-01',
    Category: 'Stationery',
    'Unit Price': 19.99,
    'Available Stock': 40,
    Description: 'Staples up to 100 sheets',
    'Created Date': '2026-11-23',
  },
  {
    'Product Name': 'Desk Organizer, Mesh (Black)',
    SKU: 'ORG-02',
    Category: 'Office Supplies',
    'Unit Price': 12.5,
    'Available Stock': 15,
    Description: '6 compartments with drawer',
    'Created Date': '2026-11-23',
  },
];

const csvOutput = Papa.unparse(sampleProducts);
assert(csvOutput.includes('Heavy Duty Stapler') && csvOutput.includes('"Desk Organizer, Mesh (Black)"'), 'CSV unparser safely escapes strings with commas');

const parsed = Papa.parse(csvOutput, { header: true });
assert(parsed.data.length === 2, 'CSV parser correctly recovers 2 rows from generated CSV');

// Test validation logic
const rawCsvWithErrors = `Product Name,SKU,Unit Price,Stock
"Valid Product",SKU-001,25.00,10
"",SKU-002,10.00,5
"Negative Price",SKU-003,-5.00,2
"Valid Product 2",SKU-001,15.00,4`;

const errorParseResult = Papa.parse(rawCsvWithErrors, { header: true, skipEmptyLines: true });
const seenSkus = new Set<string>();
const evaluated = errorParseResult.data.map((row: any) => {
  const name = row['Product Name']?.trim();
  const sku = row['SKU']?.trim();
  const price = parseFloat(row['Unit Price']);
  const errs: string[] = [];

  if (!name) errs.push('Missing product name');
  if (isNaN(price) || price < 0) errs.push('Invalid price');
  if (sku) {
    if (seenSkus.has(sku)) errs.push('Duplicate SKU in file');
    else seenSkus.add(sku);
  }
  return { name, valid: errs.length === 0, errs };
});

assert(evaluated[0].valid === true, 'Valid row passes validation');
assert(evaluated[1].valid === false && evaluated[1].errs.includes('Missing product name'), 'Detects missing product name');
assert(evaluated[2].valid === false && evaluated[2].errs.includes('Invalid price'), 'Detects negative price');
assert(evaluated[3].valid === false && evaluated[3].errs.includes('Duplicate SKU in file'), 'Detects duplicate SKU within CSV');

console.log('\n--- 4. Testing JSON Backup Integrity ---');

const backupObject = {
  app: 'DeliverFlow',
  version: '1.0',
  exportedAt: new Date().toISOString(),
  data: {
    settings: { id: 'default', businessName: 'Test Business' },
    products: [{ id: 'prod_1', name: 'Product 1' }],
    deliveries: [
      {
        id: 'deliv_1',
        deliveryNumber: 'DN-202611-1001',
        status: 'delivered',
        buyer: { name: 'Customer A' },
        items: [{ id: '1', name: 'Product 1', quantity: 2, unitPrice: 10, total: 20 }],
        grandTotal: 20,
      },
    ],
  },
};

const jsonStr = JSON.stringify(backupObject);
const restored = JSON.parse(jsonStr);

assert(restored.app === 'DeliverFlow' && restored.version === '1.0', 'Validates DeliverFlow backup metadata');
assert(Array.isArray(restored.data.products) && restored.data.products.length === 1, 'Restores products array intact');
assert(Array.isArray(restored.data.deliveries) && restored.data.deliveries.length === 1, 'Restores deliveries array with items snapshot');
assert(restored.data.deliveries[0].items[0].name === 'Product 1', 'Preserves frozen product snapshot in delivery');

console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
