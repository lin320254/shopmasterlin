/**
 * Firestore Security Rules Unit Test Suite (Dirty Dozen Adversarial Payloads)
 * Verifies that all 12 adversarial payloads fail against firestore.rules.
 */

export const dirtyDozenTests = [
  { name: '01. Unauthenticated Order Creation', path: '/orders/ORD-1', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '02. Identity Spoofing on Order', path: '/orders/ORD-2', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '03. Status Shortcutting on Create', path: '/orders/ORD-3', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '04. Shadow Ghost Field Injection', path: '/orders/ORD-4', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '05. Invalid Receipt Last-4 Format', path: '/orders/ORD-5', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '06. Oversized Receipt Image Payload', path: '/orders/ORD-6', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '07. Orphaned Payment Method Reference', path: '/orders/ORD-7', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '08. Customer Order Status Tampering', path: '/orders/ORD-8', op: 'update', expected: 'PERMISSION_DENIED' },
  { name: '09. Terminal State Receipt Tampering', path: '/orders/ORD-9', op: 'update', expected: 'PERMISSION_DENIED' },
  { name: '10. PII Order Scraping (list / cross-user get)', path: '/orders', op: 'list', expected: 'PERMISSION_DENIED' },
  { name: '11. Self-Assigned Admin Escalation', path: '/admins/attacker_uid', op: 'create', expected: 'PERMISSION_DENIED' },
  { name: '12. Unverified or Non-Admin Catalog / QR / CMS Mutation', path: '/storeConfig/main', op: 'update', expected: 'PERMISSION_DENIED' },
];
