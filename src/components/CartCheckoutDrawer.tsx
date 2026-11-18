import {
  Check,
  CheckCircle2,
  Copy,
  ImagePlus,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMmk, translations } from '../lib/i18n';
import { compressImageFile } from '../lib/imageUtils';
import type { CartItem, Language, PaymentMethod, Promotion } from '../types';

interface CartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  cart: CartItem[];
  onUpdateQty: (key: string, qty: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  paymentMethods: PaymentMethod[];
  promotions: Promotion[];
  user: FirebaseUser | null;
  storeName?: string;
  onSignIn: () => void;
  onViewOrders: () => void;
}

export function CartCheckoutDrawer({
  open,
  onClose,
  lang,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  paymentMethods,
  promotions,
  user,
  storeName,
  onSignIn,
  onViewOrders,
}: CartCheckoutDrawerProps) {
  const t = translations[lang];
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [receiptLast4, setReceiptLast4] = useState('');
  const [receiptImageDataUrl, setReceiptImageDataUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [qrZoomOpen, setQrZoomOpen] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState('');

  useEffect(() => {
    if (user) {
      if (!customerName && user.displayName) setCustomerName(user.displayName);
      if (!deliveryContact && user.email) setDeliveryContact(user.email);
    }
  }, [user, customerName, deliveryContact]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.some((p) => p.id === selectedPaymentId)) {
      setSelectedPaymentId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentId]);

  if (!open) return null;

  const subtotalMmk = cart.reduce((sum, item) => sum + item.unitPriceMmk * item.quantity, 0);

  let discountMmk = 0;
  if (appliedPromo && subtotalMmk >= appliedPromo.minOrderMmk) {
    if (appliedPromo.discountType === 'percent') {
      discountMmk = Math.round((subtotalMmk * appliedPromo.discountValue) / 100);
    } else {
      discountMmk = Math.min(subtotalMmk, appliedPromo.discountValue);
    }
  }
  const totalMmk = Math.max(0, subtotalMmk - discountMmk);

  const selectedMethod =
    paymentMethods.find((p) => p.id === selectedPaymentId) || paymentMethods[0] || null;

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = promotions.find((p) => p.active && p.code.toUpperCase() === code);
    if (!found) {
      setPromoError(lang === 'mm' ? 'Promotion ကုဒ် မှားယွင်းနေပါသည်' : 'Invalid or expired promo code.');
      return;
    }
    if (subtotalMmk < found.minOrderMmk) {
      setPromoError(
        lang === 'mm'
          ? `အနည်းဆုံး ${formatMmk(found.minOrderMmk, lang)} မှာယူမှ အသုံးပြုနိုင်ပါမည်`
          : `Minimum order of ${formatMmk(found.minOrderMmk, lang)} required.`
      );
      return;
    }
    if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
      setPromoError(lang === 'mm' ? 'ကုဒ်အသုံးပြုမှု ပြည့်သွားပါပြီ' : 'Promo usage limit reached.');
      return;
    }
    setAppliedPromo(found);
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setUploadingImage(true);
    try {
      const compressed = await compressImageFile(file, {
        maxDim: 920,
        quality: 0.76,
        maxChars: 280000,
      });
      setReceiptImageDataUrl(compressed);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to process screenshot.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 1400);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!user) {
      onSignIn();
      return;
    }
    if (!selectedMethod) {
      setFormError(lang === 'mm' ? 'ငွေလွဲနည်းလမ်း ရွေးချယ်ပါ' : 'Please select a payment method.');
      return;
    }
    if (!customerName.trim() || !deliveryContact.trim()) {
      setFormError(
        lang === 'mm'
          ? 'အမည်နှင့် ပစ္စည်း/ကုဒ် လက်ခံမည့် အီးမေးလ် သို့မဟုတ် လိပ်စာ ထည့်သွင်းပါ'
          : 'Please enter your name and delivery email or address.'
      );
      return;
    }
    if (!/^[0-9]{4}$/.test(receiptLast4.trim())) {
      setFormError(
        lang === 'mm'
          ? 'ငွေလွဲပြေစာ၏ နောက်ဆုံးဂဏန်း (၄) လုံး တိတိကျကျ ထည့်သွင်းပါ (ဥပမာ 5829)'
          : 'Please enter exactly 4 numeric digits for the receipt suffix (e.g. 5829).'
      );
      return;
    }
    if (!receiptImageDataUrl) {
      setFormError(
        lang === 'mm'
          ? 'ငွေလွဲပြေစာ Screenshot ပုံ တင်ပေးပါ'
          : 'Please upload your payment receipt screenshot.'
      );
      return;
    }

    setSubmitting(true);
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const payload = {
      orderNumber,
      userId: user.uid,
      customerEmail: (user.email || '').slice(0, 160),
      customerName: customerName.trim().slice(0, 100),
      customerPhone: customerPhone.trim().slice(0, 40),
      deliveryContact: deliveryContact.trim().slice(0, 300),
      items: cart.slice(0, 20).map((item) => ({
        productId: item.productId,
        titleEn: item.titleEn.slice(0, 120),
        titleMm: item.titleMm.slice(0, 120),
        variantId: item.variantId,
        variantLabelEn: item.variantLabelEn.slice(0, 80),
        variantLabelMm: item.variantLabelMm.slice(0, 80),
        unitPriceMmk: item.unitPriceMmk,
        quantity: item.quantity,
        imageUrl: '',
      })),
      subtotalMmk,
      discountMmk,
      totalMmk,
      promoCode: appliedPromo ? appliedPromo.code : '',
      paymentMethodId: selectedMethod.id,
      paymentMethodName: selectedMethod.name.slice(0, 60),
      receiptLast4: receiptLast4.trim(),
      receiptImageDataUrl,
      status: 'pending_verification' as const,
      deliveryPayload: '',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'orders', orderId), payload);

      // Fire-and-forget Telegram shop-owner notification with receipt screenshot
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/telegram/notify-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            ...payload,
            storeName: storeName || 'Aurelia Commerce',
          }),
        });
      } catch {
        // Non-blocking: order is already persisted in Firestore
      }

      setSubmittedOrderNumber(orderNumber);
      onClearCart();
      setReceiptLast4('');
      setReceiptImageDataUrl('');
      setAppliedPromo(null);
      setPromoInput('');
      setStep('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('cart');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1E1612]/50 backdrop-blur-xs flex justify-end"
      onClick={resetAndClose}
    >
      <div
        className="bg-white w-full max-w-xl h-full flex flex-col border-l border-[#E7DFD7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E7DFD7] flex items-center justify-between bg-[#FAF8F6]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#5C4030]" />
            <h2 className="font-display text-lg font-bold text-[#1E1612]">
              {step === 'cart'
                ? `${t.cart} (${cart.reduce((s, i) => s + i.quantity, 0)})`
                : step === 'checkout'
                  ? t.checkoutTitle
                  : t.orderSubmittedTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close drawer"
            className="p-2 rounded-lg text-[#63554C] hover:bg-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'success' ? (
            <div className="py-8 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#1E1612]">
                {t.orderSubmittedTitle}
              </h3>
              <p className="mt-2 text-sm text-[#63554C] leading-relaxed">
                {t.orderSubmittedDesc}
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7] text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#63554C]">{t.orderNumber}</span>
                  <span className="font-mono-tabular font-semibold text-[#1E1612]">
                    {submittedOrderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#63554C]">{t.statusPending}</span>
                  <span className="text-[#B45309] font-medium">{t.statusPending}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onViewOrders();
                  }}
                  className="h-11 px-4 rounded-xl bg-[#4B3427] text-white text-sm font-medium hover:bg-[#38251B] transition-colors cursor-pointer"
                >
                  {t.viewMyOrders}
                </button>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="h-11 px-4 rounded-xl border border-[#D2C1B4] text-sm font-medium text-[#1E1612] hover:bg-[#FAF8F6] transition-colors cursor-pointer"
                >
                  {t.backToShop}
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-[#C5B2A3] mx-auto mb-3" />
              <h3 className="font-display text-base font-semibold text-[#1E1612]">
                {t.emptyCartTitle}
              </h3>
              <p className="mt-1.5 text-sm text-[#63554C] max-w-xs mx-auto">{t.emptyCartDesc}</p>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-6">
              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-2xl border border-[#E7DFD7] bg-white flex items-center gap-3.5"
                  >
                    <img
                      src={item.imageUrl}
                      alt={lang === 'mm' ? item.titleMm : item.titleEn}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-[#FAF8F6] border border-[#E7DFD7] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#1E1612] truncate">
                        {lang === 'mm' ? item.titleMm : item.titleEn}
                      </div>
                      <div className="text-xs text-[#8C6A52] truncate">
                        {lang === 'mm' ? item.variantLabelMm : item.variantLabelEn}
                      </div>
                      <div className="mt-1.5 font-mono-tabular text-sm font-semibold text-[#1E1612]">
                        {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        aria-label={t.remove}
                        className="text-[#8B7B71] hover:text-[#BE123C] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="inline-flex items-center border border-[#E7DFD7] rounded-lg bg-[#FAF8F6]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity - 1)}
                          className="p-1.5 hover:bg-white rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-mono-tabular font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity + 1)}
                          className="p-1.5 hover:bg-white rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1E1612] mb-2">
                  <Tag className="w-3.5 h-3.5 text-[#5C4030]" />
                  <span>{lang === 'mm' ? 'Discount / Promotion ကုဒ်' : 'Promo Code'}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder={t.promoCodePlaceholder}
                    className="flex-1 h-10 px-3 rounded-xl bg-white border border-[#D2C1B4] text-xs font-mono-tabular uppercase text-[#1E1612] focus:outline-none focus:border-[#5C4030]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-10 px-4 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {t.apply}
                  </button>
                </div>
                {promoError && <p className="mt-2 text-xs text-[#BE123C]">{promoError}</p>}
                {appliedPromo && (
                  <div className="mt-2 flex items-center justify-between text-xs text-[#15803D] font-medium">
                    <span>
                      {appliedPromo.code} —{' '}
                      {lang === 'mm' ? appliedPromo.titleMm : appliedPromo.titleEn}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedPromo(null)}
                      className="underline cursor-pointer"
                    >
                      {t.remove}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="text-xs font-medium text-[#5C4030] hover:underline cursor-pointer"
              >
                ← {lang === 'mm' ? 'ခြင်းတောင်းသို့ ပြန်သွားမည်' : 'Back to Cart'}
              </button>

              {!user && (
                <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#D2C1B4] flex items-center justify-between gap-3">
                  <p className="text-xs text-[#1E1612] font-medium">{t.signInToCheckout}</p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-3.5 py-2 rounded-xl bg-[#4B3427] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.signIn}
                  </button>
                </div>
              )}

              {/* Order Totals Summary */}
              <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#E7DFD7] space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-[#63554C]">
                  <span>{t.orderSummary}</span>
                  <span>{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                </div>
                <div className="flex justify-between text-[#1E1612]">
                  <span>{t.subtotal}</span>
                  <span className="font-mono-tabular">{formatMmk(subtotalMmk, lang)}</span>
                </div>
                {discountMmk > 0 && (
                  <div className="flex justify-between text-[#15803D]">
                    <span>
                      {t.promoDiscount} ({appliedPromo?.code})
                    </span>
                    <span className="font-mono-tabular">-{formatMmk(discountMmk, lang)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E7DFD7] flex justify-between font-bold text-[#1E1612]">
                  <span>{t.total}</span>
                  <span className="font-mono-tabular text-base text-[#5C4030]">
                    {formatMmk(totalMmk, lang)}
                  </span>
                </div>
              </div>

              {/* Customer Delivery Info */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-[#1E1612]">
                  {t.customerDetails}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#63554C] mb-1">{t.fullName} *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-sm text-[#1E1612] focus:outline-none focus:border-[#5C4030]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#63554C] mb-1">{t.phone}</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09xxxxxxxxx"
                      className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-sm text-[#1E1612] focus:outline-none focus:border-[#5C4030]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">
                    {t.deliveryContactLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryContact}
                    onChange={(e) => setDeliveryContact(e.target.value)}
                    placeholder={t.deliveryContactPlaceholder}
                    className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-sm text-[#1E1612] focus:outline-none focus:border-[#5C4030]"
                  />
                </div>
              </div>

              {/* Payment Method & QR Code */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-[#1E1612]">
                  {t.paymentMethodTitle}
                </h3>

                {paymentMethods.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E7DFD7] text-xs text-[#63554C]">
                    {lang === 'mm'
                      ? 'ငွေလွဲ QR အကောင့်များ မထည့်သွင်းရသေးပါ။ Admin မှ Admin Studio > QR & Page Control တွင် ထည့်သွင်းပေးပါ။'
                      : 'No active payment QR channels configured yet. Sign in as Admin to add KBZPay / WavePay QR channels.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {paymentMethods.map((pm) => {
                      const active = selectedMethod?.id === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setSelectedPaymentId(pm.id)}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#4B3427] bg-[#FAF8F6]'
                              : 'border-[#E7DFD7] bg-white hover:border-[#C5B2A3]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#1E1612] truncate">
                            {pm.name}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[#63554C] truncate mt-0.5">
                            {pm.accountNumber}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedMethod && (
                  <div className="p-4 rounded-2xl border border-[#D2C1B4] bg-[#FAF8F6] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-5 flex flex-col items-center">
                      {selectedMethod.qrImageDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setQrZoomOpen(true)}
                          className="bg-white p-2 rounded-xl border border-[#E7DFD7] hover:border-[#5C4030] transition-colors cursor-pointer"
                          title="Click to enlarge QR"
                        >
                          <img
                            src={selectedMethod.qrImageDataUrl}
                            alt={`${selectedMethod.name} QR`}
                            className="w-36 h-36 object-contain"
                          />
                        </button>
                      ) : (
                        <div className="w-36 h-36 rounded-xl bg-white border border-[#E7DFD7] flex items-center justify-center text-[#8B7B71]">
                          <QrCode className="w-10 h-10" />
                        </div>
                      )}
                      <span className="mt-1.5 text-[11px] text-[#8C6A52]">
                        {lang === 'mm' ? 'QR ချဲ့ကြည့်ရန် နှိပ်ပါ' : 'Tap QR to enlarge'}
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2 text-xs">
                      <div>
                        <span className="text-[#63554C]">{t.accountName}: </span>
                        <span className="font-semibold text-[#1E1612]">
                          {selectedMethod.accountName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E7DFD7]">
                        <div>
                          <div className="text-[11px] text-[#63554C]">{t.accountNumber}</div>
                          <div className="font-mono-tabular text-sm font-bold text-[#1E1612]">
                            {selectedMethod.accountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(selectedMethod.accountNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#E7DFD7] text-[#4B3427] font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedAcc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedAcc ? t.copied : t.copy}</span>
                        </button>
                      </div>
                      <div>
                        <span className="text-[#63554C]">{t.amountToPay}: </span>
                        <span className="font-mono-tabular font-bold text-[#5C4030]">
                          {formatMmk(totalMmk, lang)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#63554C] leading-relaxed">
                        {lang === 'mm'
                          ? selectedMethod.instructionsMm
                          : selectedMethod.instructionsEn}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Last 4 Digits + Receipt Screenshot Upload */}
              <div className="space-y-4 pt-2 border-t border-[#E7DFD7]">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1612] mb-1">
                    {t.receiptLast4Label} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={receiptLast4}
                    onChange={(e) => setReceiptLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={t.receiptLast4Placeholder}
                    className="w-full h-11 px-4 rounded-xl border border-[#D2C1B4] font-mono-tabular text-lg tracking-[0.25em] font-semibold text-[#1E1612] focus:outline-none focus:border-[#5C4030]"
                  />
                  <p className="mt-1 text-[11px] text-[#63554C]">{t.receiptLast4Hint}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1612] mb-1.5">
                    {t.uploadScreenshotLabel} *
                  </label>
                  <label className="block rounded-2xl border border-dashed border-[#C5B2A3] bg-[#FAF8F6] hover:bg-[#F4EFE9] transition-colors p-4 text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    {receiptImageDataUrl ? (
                      <div className="space-y-2.5">
                        <img
                          src={receiptImageDataUrl}
                          alt="Payment receipt preview"
                          className="max-h-48 mx-auto rounded-xl border border-[#E7DFD7] object-contain"
                        />
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C4030]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t.changeScreenshot}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center">
                        <ImagePlus className="w-7 h-7 text-[#8C6A52] mb-2" />
                        <span className="text-xs font-medium text-[#1E1612]">
                          {uploadingImage
                            ? lang === 'mm'
                              ? 'ပုံပြင်ဆင်နေပါသည်...'
                              : 'Compressing screenshot...'
                            : t.uploadScreenshotLabel}
                        </span>
                        <span className="mt-1 text-[11px] text-[#63554C]">
                          {t.uploadScreenshotHint}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#BE123C]">
                  {formError}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && step !== 'success' && (
          <div className="p-5 border-t border-[#E7DFD7] bg-[#FAF8F6]">
            {step === 'cart' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#63554C]">{t.total}</span>
                  <span className="font-mono-tabular text-lg font-bold text-[#1E1612]">
                    {formatMmk(totalMmk, lang)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full h-11 rounded-xl bg-[#4B3427] text-white text-sm font-medium hover:bg-[#38251B] transition-colors cursor-pointer"
                >
                  {t.proceedCheckout}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || uploadingImage}
                className="w-full h-11 rounded-xl bg-[#4B3427] text-white text-sm font-medium hover:bg-[#38251B] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? t.submitting : t.submitPayment}
              </button>
            )}
          </div>
        )}
      </div>

      {/* QR Enlarge Lightbox */}
      {qrZoomOpen && selectedMethod?.qrImageDataUrl && (
        <div
          className="fixed inset-0 z-[60] bg-[#1E1612]/75 flex items-center justify-center p-4"
          onClick={() => setQrZoomOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-semibold text-sm text-[#1E1612]">
                {selectedMethod.name}
              </span>
              <button
                type="button"
                onClick={() => setQrZoomOpen(false)}
                className="p-1 text-[#63554C] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={selectedMethod.qrImageDataUrl}
              alt={selectedMethod.name}
              className="w-full max-h-80 object-contain rounded-xl border border-[#E7DFD7]"
            />
            <p className="mt-3 font-mono-tabular text-sm font-semibold text-[#4B3427]">
              {selectedMethod.accountNumber} · {selectedMethod.accountName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
