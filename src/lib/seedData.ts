import type { PaymentMethod, Product, Promotion, StoreSettings } from '../types';
import { buildSampleQrDataUrl } from './imageUtils';

export const PRESET_IMAGES = [
  {
    label: 'Desert Titanium Showcase',
    url: '/src/assets/images/hero_desert_titanium_showcase_1794974668652.jpg',
  },
  {
    label: 'iPhone Pro Max Desert Bronze',
    url: '/src/assets/images/product_iphone_bronze_1794974669129.jpg',
  },
  {
    label: 'Digital & AI Suite Prism',
    url: '/src/assets/images/product_ai_software_suite_1794974666758.jpg',
  },
  {
    label: 'Cream & Bronze Studio Audio',
    url: '/src/assets/images/product_audio_headphones_1794974668587.jpg',
  },
  {
    label: 'VIP Bronze Membership Pass',
    url: '/src/assets/images/product_gift_card_pass_1794974667648.jpg',
  },
];

export const DEFAULT_STORE_SETTINGS: Omit<StoreSettings, 'updatedAt'> = {
  storeName: 'Aurelia Commerce',
  announcementEn: '1 USD = 4,600 MMK · Verified KBZPay & WavePay QR Checkout',
  announcementMm: 'ဆိုင်သတ်မှတ်ဈေးနှုန်း - 1 USD = 4,600 ကျပ် · KBZPay / WavePay QR ဖြင့် စိတ်ချစွာဝယ်ယူနိုင်ပါသည်',
  heroTitleEn: 'Desert Titanium & Curated Digital Essentials',
  heroTitleMm: 'အရည်အသွေးမြင့် Hardware နှင့် Digital ဝန်ဆောင်မှုများ',
  heroSubtitleEn:
    'Shop flagship devices, studio gear, and verified digital subscriptions with instant MMK QR checkout and transparent order tracking.',
  heroSubtitleMm:
    'နောက်ဆုံးပေါ် ဖုန်းနှင့် Accessories များ၊ AI နှင့် Software Plan များကို QR Scan ဖတ်၍ ပြေစာတင်ကာ လွယ်ကူစွာ ဝယ်ယူနိုင်ပါသည်။',
  heroImageUrl: '/src/assets/images/hero_desert_titanium_showcase_1794974668652.jpg',
  sitewideDiscountPercent: 0,
  sitewidePromoLabelEn: 'Desert Titanium Season Offer',
  sitewidePromoLabelMm: 'အထူးရာသီ လျှော့ဈေး',
  exchangeRateMmk: 4600,
  supportPhone: '09-777-888-999',
  supportTelegram: '@aurelia_support',
  footerNoteEn: 'Direct Merchant QR Checkout · Manual Slip Verification · Full Order History',
  footerNoteMm: 'တိုက်ရိုက် QR ငွေလွဲစနစ် · Admin မှ ပြေစာစိစစ်ပေးပို့မှု · အော်ဒါမှတ်တမ်းစနစ်',
};

export const STARTER_PRODUCTS: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    titleEn: 'iPhone Pro Max — Desert Titanium Edition',
    titleMm: 'iPhone Pro Max — Desert Titanium (အညိုရောင်)',
    brand: 'Apple Flagship',
    category: 'Smartphones & Hardware',
    deliveryType: 'physical',
    descriptionEn:
      'Factory unlocked flagship in brushed Desert Titanium bronze finish. Includes 1-year official warranty and express Yangon/Mandalay delivery.',
    descriptionMm:
      'Factory Unlocked အသစ်စက်စက် Desert Titanium အညိုရောင်ဖြစ်ပြီး အာမခံ ၁ နှစ်နှင့် အမြန်ပို့ဆောင်မှု ပါဝင်ပါသည်။',
    deliveryLabelEn: 'Express Courier · 1 Year Warranty',
    deliveryLabelMm: 'အိမ်အရောက်ပို့ဆောင်မှု · ၁ နှစ်အာမခံ',
    imageUrl: '/src/assets/images/product_iphone_bronze_1794974669129.jpg',
    priceMmk: 5650000,
    compareAtMmk: 5900000,
    stock: 8,
    variants: [
      {
        id: '256gb',
        labelEn: '256GB · Desert Titanium',
        labelMm: '256GB · အညိုရောင်',
        priceMmk: 5650000,
        compareAtMmk: 5900000,
        stock: 5,
      },
      {
        id: '512gb',
        labelEn: '512GB · Desert Titanium',
        labelMm: '512GB · အညိုရောင်',
        priceMmk: 6350000,
        compareAtMmk: 6600000,
        stock: 3,
      },
    ],
    featured: true,
    active: true,
    badgeTextEn: 'Flagship',
    badgeTextMm: 'လူကြိုက်များ',
  },
  {
    titleEn: 'Gemini Pro & Creative AI Workspace',
    titleMm: 'Gemini Pro နှင့် AI Tools စုံလင် Package',
    brand: 'Digital Suite',
    category: 'Digital & AI Tools',
    deliveryType: 'digital',
    descriptionEn:
      'Official private account activation or invite link with 2TB cloud storage, advanced reasoning models, and full warranty.',
    descriptionMm:
      'ကိုယ်ပိုင် Gmail ဖြင့် တိုက်ရိုက် Activate လုပ်နိုင်သော Official Invite Link နှင့် အာမခံအပြည့် ပါဝင်ပါသည်။',
    deliveryLabelEn: 'Email Invite Link · Instant Verification',
    deliveryLabelMm: 'အီးမေးလ် ဖိတ်ခေါ်ချက် · အမြန်ပေးပို့မှု',
    imageUrl: '/src/assets/images/product_ai_software_suite_1794974666758.jpg',
    priceMmk: 14500,
    compareAtMmk: 18500,
    stock: 42,
    variants: [
      {
        id: '6m',
        labelEn: '6 Months Private Plan',
        labelMm: '၆ လ အသုံးပြုခွင့်',
        priceMmk: 14500,
        compareAtMmk: 18500,
        stock: 25,
      },
      {
        id: '12m',
        labelEn: '12 Months Full Warranty',
        labelMm: '၁၂ လ အာမခံအပြည့်',
        priceMmk: 26500,
        compareAtMmk: 34000,
        stock: 17,
      },
    ],
    featured: true,
    active: true,
    badgeTextEn: 'Best Seller',
    badgeTextMm: 'ရောင်းအားကောင်း',
  },
  {
    titleEn: 'Aura Studio ANC Wireless Headphones',
    titleMm: 'Aura Studio ANC ကြိုးမဲ့ နားကြပ် (Cream Bronze)',
    brand: 'Aura Acoustics',
    category: 'Audio & Accessories',
    deliveryType: 'physical',
    descriptionEn:
      'Brushed titanium-bronze hinges with memory foam cream leather earcups, 45-hour battery life, and lossless USB-C audio.',
    descriptionMm:
      'နားသက်သာသော Cream သားရေနှင့် Bronze သတ္တုကိုယ်ထည်၊ ဘက်ထရီ ၄၅ နာရီခံ Noise Cancelling နားကြပ်။',
    deliveryLabelEn: 'Same-Day Dispatch · Sealed Box',
    deliveryLabelMm: 'နေ့ချင်းပို့ဆောင်မှု · ပါကင်ပိတ်',
    imageUrl: '/src/assets/images/product_audio_headphones_1794974668587.jpg',
    priceMmk: 420000,
    compareAtMmk: 465000,
    stock: 12,
    variants: [
      {
        id: 'standard',
        labelEn: 'Champagne Cream Edition',
        labelMm: 'Champagne Cream အရောင်',
        priceMmk: 420000,
        compareAtMmk: 465000,
        stock: 12,
      },
    ],
    featured: true,
    active: true,
    badgeTextEn: 'Limited Stock',
    badgeTextMm: 'အကန့်အသတ်ရှိ',
  },
  {
    titleEn: 'Adobe Creative Cloud All Apps',
    titleMm: 'Adobe Creative Cloud (App အားလုံးပါဝင်)',
    brand: 'Adobe Official',
    category: 'Digital & AI Tools',
    deliveryType: 'digital',
    descriptionEn:
      'Photoshop, Premiere Pro, After Effects, Illustrator with generative AI credits on your own email account.',
    descriptionMm:
      'Photoshop, Premiere, Illustrator အစရှိသော App အားလုံးကို ကိုယ်ပိုင်အီးမေးလ်ဖြင့် အသုံးပြုနိုင်ပါသည်။',
    deliveryLabelEn: 'Account Credentials / Invite · Full Warranty',
    deliveryLabelMm: 'အီးမေးလ် ဖိတ်ခေါ်ချက် · အာမခံအပြည့်',
    imageUrl: '/src/assets/images/product_ai_software_suite_1794974666758.jpg',
    priceMmk: 69000,
    compareAtMmk: 85000,
    stock: 18,
    variants: [
      {
        id: '1m',
        labelEn: '1 Month Full Warranty',
        labelMm: '၁ လ အာမခံအပြည့်',
        priceMmk: 69000,
        compareAtMmk: 85000,
        stock: 10,
      },
      {
        id: '3m',
        labelEn: '3 Months Pro Plan',
        labelMm: '၃ လ Pro Plan',
        priceMmk: 195000,
        compareAtMmk: 240000,
        stock: 8,
      },
    ],
    featured: false,
    active: true,
    badgeTextEn: '',
    badgeTextMm: '',
  },
  {
    titleEn: 'Aurelia VIP Priority Membership Pass',
    titleMm: 'Aurelia VIP အဖွဲ့ဝင် ကတ် (Gift & Priority Pass)',
    brand: 'Aurelia Elite',
    category: 'VIP & Gift Cards',
    deliveryType: 'service',
    descriptionEn:
      'Redeemable store credit voucher plus priority order verification and 5% lifetime member savings across all collections.',
    descriptionMm:
      'စတိုးအတွင်း မည်သည့်ပစ္စည်းမဆို ဝယ်ယူနိုင်သော ငွေဖြည့်ကတ်နှင့် VIP ဦးစားပေး ဝန်ဆောင်မှု။',
    deliveryLabelEn: 'Digital Pass Code · Instant Credit',
    deliveryLabelMm: 'ဒစ်ဂျစ်တယ် ကတ်ကုဒ် · ချက်ချင်းအသုံးပြုနိုင်',
    imageUrl: '/src/assets/images/product_gift_card_pass_1794974667648.jpg',
    priceMmk: 100000,
    compareAtMmk: 110000,
    stock: 25,
    variants: [
      {
        id: '100k',
        labelEn: '100,000 MMK Store Pass',
        labelMm: '၁၀၀,၀၀၀ ကျပ်တန် Pass',
        priceMmk: 100000,
        compareAtMmk: 110000,
        stock: 15,
      },
      {
        id: '300k',
        labelEn: '300,000 MMK Elite Pass',
        labelMm: '၃၀၀,၀၀၀ ကျပ်တန် Elite Pass',
        priceMmk: 285000,
        compareAtMmk: 330000,
        stock: 10,
      },
    ],
    featured: false,
    active: true,
    badgeTextEn: 'VIP Pass',
    badgeTextMm: 'VIP ကတ်',
  },
];

export const STARTER_PAYMENT_METHODS: Array<Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'KBZPay (KPay)',
    accountName: 'Store Merchant Account',
    accountNumber: '09777888999',
    qrImageDataUrl: buildSampleQrDataUrl('KBZPay', '09777888999'),
    instructionsEn: 'Verify recipient name before confirming transfer. Upload clear slip screenshot.',
    instructionsMm: 'ငွေမလွဲမီ လက်ခံသူအမည်ကို စစ်ဆေးပါ။ ငွေလွဲပြီးပါက ပြေစာပုံနှင့် နောက်ဆုံးဂဏန်း ၄ လုံးထည့်ပါ။',
    active: true,
    sortOrder: 1,
  },
  {
    name: 'WavePay',
    accountName: 'Store Merchant Account',
    accountNumber: '09777888999',
    qrImageDataUrl: buildSampleQrDataUrl('WavePay', '09777888999'),
    instructionsEn: 'Transfer exact MMK total via WavePay QR or phone number.',
    instructionsMm: 'WavePay QR ကို Scan ဖတ်၍ ကျသင့်ငွေအတိအကျ လွဲပြောင်းပေးပါ။',
    active: true,
    sortOrder: 2,
  },
];

export const STARTER_PROMOTIONS: Array<Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    code: 'DESERT10',
    titleEn: '10% Off First Order',
    titleMm: 'ပထမဆုံး အော်ဒါအတွက် ၁၀% လျှော့ဈေး',
    discountType: 'percent',
    discountValue: 10,
    minOrderMmk: 10000,
    maxUses: 100,
    usedCount: 0,
    active: true,
    expiresAtIso: '2027-12-31',
  },
  {
    code: 'WELCOME5000',
    titleEn: '5,000 MMK Instant Voucher',
    titleMm: '၅,၀၀၀ ကျပ် တိုက်ရိုက်လျှော့ဈေး',
    discountType: 'fixed',
    discountValue: 5000,
    minOrderMmk: 30000,
    maxUses: 50,
    usedCount: 0,
    active: true,
    expiresAtIso: '2027-12-31',
  },
];
