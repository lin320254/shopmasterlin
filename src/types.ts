import type { Timestamp } from 'firebase/firestore';

export type Language = 'mm' | 'en';

export type DeliveryType = 'digital' | 'physical' | 'service';

export type OrderStatus = 'pending_verification' | 'verified_delivered' | 'rejected';

export interface ProductVariant {
  id: string;
  labelEn: string;
  labelMm: string;
  priceMmk: number;
  compareAtMmk: number;
  stock: number;
}

export interface StoreSettings {
  storeName: string;
  announcementEn: string;
  announcementMm: string;
  heroTitleEn: string;
  heroTitleMm: string;
  heroSubtitleEn: string;
  heroSubtitleMm: string;
  heroImageUrl: string;
  sitewideDiscountPercent: number;
  sitewidePromoLabelEn: string;
  sitewidePromoLabelMm: string;
  exchangeRateMmk: number;
  supportPhone: string;
  supportTelegram: string;
  footerNoteEn: string;
  footerNoteMm: string;
  updatedAt?: Timestamp;
}

export interface Product {
  id: string;
  titleEn: string;
  titleMm: string;
  brand: string;
  category: string;
  deliveryType: DeliveryType;
  descriptionEn: string;
  descriptionMm: string;
  deliveryLabelEn: string;
  deliveryLabelMm: string;
  imageUrl: string;
  priceMmk: number;
  compareAtMmk: number;
  stock: number;
  variants: ProductVariant[];
  featured: boolean;
  active: boolean;
  badgeTextEn: string;
  badgeTextMm: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PaymentMethod {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  qrImageDataUrl: string;
  instructionsEn: string;
  instructionsMm: string;
  active: boolean;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Promotion {
  id: string;
  code: string;
  titleEn: string;
  titleMm: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderMmk: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAtIso: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrderItem {
  productId: string;
  titleEn: string;
  titleMm: string;
  variantId: string;
  variantLabelEn: string;
  variantLabelMm: string;
  unitPriceMmk: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryContact: string;
  items: OrderItem[];
  subtotalMmk: number;
  discountMmk: number;
  totalMmk: number;
  promoCode: string;
  paymentMethodId: string;
  paymentMethodName: string;
  receiptLast4: string;
  receiptImageDataUrl: string;
  status: OrderStatus;
  deliveryPayload: string;
  adminNote: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  defaultAddress: string;
  preferredLang: Language;
  role: 'customer' | 'admin';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CartItem {
  key: string;
  productId: string;
  titleEn: string;
  titleMm: string;
  variantId: string;
  variantLabelEn: string;
  variantLabelMm: string;
  unitPriceMmk: number;
  quantity: number;
  imageUrl: string;
  deliveryType: DeliveryType;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

