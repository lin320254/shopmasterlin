# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Storefront Settings (`/store_settings/{docId}`)**: Publicly readable (`get`) for rendering storefront branding, announcements, and discounts; only verified Admins can create, update, or delete.
2. **Catalog Products (`/products/{productId}`)**: Active products (`active == true`) are publicly readable (`get` and `list`); inactive drafts and all mutations (`create`, `update`, `delete`) are strictly restricted to verified Admins.
3. **Payment Methods & QR Codes (`/payment_methods/{methodId}`)**: Active channels (`active == true`) are readable (`get` and `list`) for checkout; only verified Admins can create, update, or delete channels and QR images.
4. **Promotions (`/promotions/{promoId}`)**: Active promo codes (`active == true`) are readable (`get` and `list`) for storefront promo banners and bag validation; creating, editing, pausing, and deleting promo codes are strictly restricted to verified Admins.
5. **Orders (`/orders/{orderId}`)**:
   - Strictly isolated PII: Only the owning customer (`userId == request.auth.uid`) or an Admin can `get` or `list` an order.
   - Customers can only create orders for themselves (`incoming().userId == request.auth.uid`), referencing an existing `payment_methods/{paymentMethodId}` document, with initial `status == 'pending_verification'`, empty `deliveryPayload` and `adminNote`, valid 4-digit `receiptLast4` (`^[0-9]{4}$`), and bounded `receiptImageDataUrl`.
   - Customers can ONLY update `receiptLast4`, `receiptScreenshotUrl`/`receiptImageDataUrl`, and `updatedAt` on their own order while `existing().status == 'pending_verification'`.
   - Only verified Admins can update order `status` (`pending_verification` / `verified_delivered` / `rejected`), attach `deliveryPayload`, or add `adminNote`.
6. **Product Reviews (`/product_reviews/{reviewId}`)**:
   - Contains zero PII (only `authorName`, `rating` 1..5, `comment`, `productId`, `orderId`, `orderNumber`, `verifiedPurchase`). Publicly readable (`get` and `list`).
   - Only verified authenticated users (`email_verified == true`) can create a review, strictly keyed as `{productId}__{uid}` (one review per product per customer), referencing an existing `products/{productId}` and an existing `orders/{orderId}` owned by `request.auth.uid` whose `status == 'verified_delivered'`.
   - Authors can only update their own `rating`, `comment`, `authorName`, and `updatedAt` (cannot spoof `userId`, `productId`, `orderId`, or `verifiedPurchase`). Authors or Admins can delete reviews.
7. **User Profiles (`/users/{userId}`)**: Strictly readable/writable by the owning user or an Admin. Non-admin users can only create profiles with `role == 'customer'` and cannot escalate `role` on update.
8. **Admin Registry (`/admins/{adminUid}`)**: Only the bootstrapped store owner (`junighkhan786@gmail.com` with `email_verified == true`) can list, create, update, or delete admin records.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Order Creation**: Anonymous request attempting `create` on `/orders/ord_1`.
2. **Spoofed User ID on Order**: Authenticated User A setting `userId: "user_b_uid"` when creating an order.
3. **Self-Approved Order State**: Authenticated user creating an order with `status: "verified_delivered"` or non-empty `deliveryPayload`.
4. **Shadow Field Injection on Order**: Adding `"isPaid": true` or `"adminOverride": true` to order create payload.
5. **Invalid Receipt Last 4 Digits**: Creating an order with `receiptLast4: "abcd"` or `"123456"` (violates `^[0-9]{4}$`).
6. **Orphaned Payment Method Reference**: Creating an order referencing a non-existent `payment_methods/{id}`.
7. **Unverified Purchase Review**: User attempting `create` on `/product_reviews/{id}` referencing a `pending_verification` order or another user's order.
8. **Out-of-Range / Float Review Rating**: Creating a review with `rating: 6`, `rating: 0`, or `rating: 4.5`.
9. **Review Identity Spoofing / Duplicate Spam**: Creating a review with a mismatched doc ID (not `{productId}__{uid}`) or `userId != request.auth.uid`.
10. **Cross-User Order Read (PII Leak)**: User A calling `get` on User B's order or `list` on `/orders` without filtering to `userId == userA.uid`.
11. **Self-Assigned Admin Escalation**: Non-bootstrapped user attempting `create` on `/admins/{uid}` or `role: "admin"` on `/users/{uid}`.
12. **Non-Admin Storefront / Product / QR Mutation**: Customer or unverified admin email attempting to mutate `/store_settings`, `/products`, `/payment_methods`, or `/promotions`.
