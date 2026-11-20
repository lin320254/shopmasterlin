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
import { db, getReadableFirestoreError, OperationType } from '../lib/firebase';
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
      setFormError(getReadableFirestoreError(err, OperationType.CREATE, `orders/${orderId}`));
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
      onClick={resetAndClose}
    >
      <div
        className="bg-[#111115] w-full max-w-xl h-full flex flex-col border-l border-[#24242C]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#24242C] flex items-center justify-between bg-[#0C0C10]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="w-5 h-5 text-[#E50914] shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
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
            className="p-2 rounded-lg text-[#B3B3BE] hover:bg-[#1C1C24] hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {step === 'success' ? (
            <div className="py-8 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#0D2618] border border-[#166534] text-[#22C55E] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                {t.orderSubmittedTitle}
              </h3>
              <p className="mt-2 text-sm text-[#B3B3BE] leading-relaxed">
                {t.orderSubmittedDesc}
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-[#0C0C10] border border-[#24242C] text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#858594]">{t.orderNumber}</span>
                  <span className="font-mono-tabular font-semibold text-white">
                    {submittedOrderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#858594]">{t.statusPending}</span>
                  <span className="text-[#F59E0B] font-medium">{t.statusPending}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetAndClose();
                    onViewOrders();
                  }}
                  className="h-11 px-4 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] transition-colors cursor-pointer"
                >
                  {t.viewMyOrders}
                </button>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="h-11 px-4 rounded-xl border border-[#2A2A34] bg-[#17171D] text-sm font-medium text-white hover:border-[#E50914]/60 transition-colors cursor-pointer"
                >
                  {t.backToShop}
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-[#454554] mx-auto mb-3" />
              <h3 className="font-display text-base font-semibold text-white">
                {t.emptyCartTitle}
              </h3>
              <p className="mt-1.5 text-sm text-[#B3B3BE] max-w-xs mx-auto">{t.emptyCartDesc}</p>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-6">
              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-2xl border border-[#24242C] bg-[#0C0C10] flex items-center gap-3.5"
                  >
                    <img
                      src={item.imageUrl}
                      alt={lang === 'mm' ? item.titleMm : item.titleEn}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-[#17171D] border border-[#24242C] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {lang === 'mm' ? item.titleMm : item.titleEn}
                      </div>
                      <div className="text-xs text-[#FF4D57] truncate">
                        {lang === 'mm' ? item.variantLabelMm : item.variantLabelEn}
                      </div>
                      <div className="mt-1.5 font-mono-tabular text-sm font-semibold text-white">
                        {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.key)}
                        aria-label={t.remove}
                        className="text-[#858594] hover:text-[#FF5C67] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="inline-flex items-center border border-[#2A2A34] rounded-lg bg-[#17171D]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity - 1)}
                          className="p-1.5 text-white hover:bg-[#24242C] rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-mono-tabular font-semibold text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, item.quantity + 1)}
                          className="p-1.5 text-white hover:bg-[#24242C] rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="p-4 rounded-2xl bg-[#0C0C10] border border-[#24242C]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                  <Tag className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>{lang === 'mm' ? 'Discount / Promotion ကုဒ်' : 'Promo Code'}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder={t.promoCodePlaceholder}
                    className="flex-1 h-10 px-3 rounded-xl bg-[#17171D] border border-[#2A2A34] text-xs font-mono-tabular uppercase text-white placeholder:text-[#787886] focus:outline-none focus:border-[#E50914]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-10 px-4 rounded-xl bg-[#E50914] text-white text-xs font-semibold hover:bg-[#C40812] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {t.apply}
                  </button>
                </div>
                {promoError && <p className="mt-2 text-xs text-[#FF5C67]">{promoError}</p>}
                {appliedPromo && (
                  <div className="mt-2 flex items-center justify-between text-xs text-[#22C55E] font-medium">
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
                className="text-xs font-semibold text-[#FF4D57] hover:underline cursor-pointer"
              >
                ← {lang === 'mm' ? 'ခြင်းတောင်းသို့ ပြန်သွားမည်' : 'Back to Cart'}
              </button>

              {!user && (
                <div className="p-4 rounded-2xl bg-[#1B0B0E] border border-[#471B20] flex items-center justify-between gap-3">
                  <p className="text-xs text-white font-medium">{t.signInToCheckout}</p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-3.5 py-2 rounded-xl bg-[#E50914] text-white text-xs font-semibold hover:bg-[#C40812] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.signIn}
                  </button>
                </div>
              )}

              {/* Order Totals Summary */}
              <div className="p-4 rounded-2xl bg-[#0C0C10] border border-[#24242C] space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-[#858594]">
                  <span>{t.orderSummary}</span>
                  <span>{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                </div>
                <div className="flex justify-between text-[#D4D4DE]">
                  <span>{t.subtotal}</span>
                  <span className="font-mono-tabular">{formatMmk(subtotalMmk, lang)}</span>
                </div>
                {discountMmk > 0 && (
                  <div className="flex justify-between text-[#22C55E]">
                    <span>
                      {t.promoDiscount} ({appliedPromo?.code})
                    </span>
                    <span className="font-mono-tabular">-{formatMmk(discountMmk, lang)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#24242C] flex justify-between font-bold text-white">
                  <span>{t.total}</span>
                  <span className="font-mono-tabular text-base text-[#FF2A36]">
                    {formatMmk(totalMmk, lang)}
                  </span>
                </div>
              </div>

              {/* Customer Delivery Info */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-white">
                  {t.customerDetails}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#B3B3BE] mb-1">{t.fullName} *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#0C0C10] border border-[#2A2A34] text-sm text-white focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#B3B3BE] mb-1">{t.phone}</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09xxxxxxxxx"
                      className="w-full h-10 px-3 rounded-xl bg-[#0C0C10] border border-[#2A2A34] text-sm text-white placeholder:text-[#787886] focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#B3B3BE] mb-1">
                    {t.deliveryContactLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryContact}
                    onChange={(e) => setDeliveryContact(e.target.value)}
                    placeholder={t.deliveryContactPlaceholder}
                    className="w-full h-10 px-3 rounded-xl bg-[#0C0C10] border border-[#2A2A34] text-sm text-white placeholder:text-[#787886] focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              {/* Payment Method & QR Code */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-white">
                  {t.paymentMethodTitle}
                </h3>

                {paymentMethods.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0C0C10] border border-[#24242C] text-xs text-[#B3B3BE]">
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
                              ? 'border-[#E50914] bg-[#1E0C0F]'
                              : 'border-[#2A2A34] bg-[#0C0C10] hover:border-[#471B20]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-white truncate">
                            {pm.name}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[#B3B3BE] truncate mt-0.5">
                            {pm.accountNumber}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedMethod && (
                  <div className="p-4 rounded-2xl border border-[#3D181C] bg-[#0C0C10] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-5 flex flex-col items-center">
                      {selectedMethod.qrImageDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setQrZoomOpen(true)}
                          className="bg-white p-2.5 rounded-xl border-2 border-[#E50914]/50 hover:border-[#E50914] transition-colors cursor-pointer"
                          title="Click to enlarge QR"
                        >
                          <img
                            src={selectedMethod.qrImageDataUrl}
                            alt={`${selectedMethod.name} QR`}
                            className="w-36 h-36 object-contain"
                          />
                        </button>
                      ) : (
                        <div className="w-36 h-36 rounded-xl bg-[#17171D] border border-[#2A2A34] flex items-center justify-center text-[#858594]">
                          <QrCode className="w-10 h-10" />
                        </div>
                      )}
                      <span className="mt-1.5 text-[11px] text-[#FF4D57]">
                        {lang === 'mm' ? 'QR ချဲ့ကြည့်ရန် နှိပ်ပါ' : 'Tap QR to enlarge'}
                      </span>
                    </div>

                    <div className="sm:col-span-7 space-y-2 text-xs">
                      <div>
                        <span className="text-[#858594]">{t.accountName}: </span>
                        <span className="font-semibold text-white">
                          {selectedMethod.accountName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-[#17171D] px-3 py-2 rounded-xl border border-[#2A2A34]">
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#858594]">{t.accountNumber}</div>
                          <div className="font-mono-tabular text-sm font-bold text-white truncate">
                            {selectedMethod.accountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(selectedMethod.accountNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#180C0E] border border-[#471B20] text-white font-medium hover:bg-[#E50914] hover:border-[#E50914] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedAcc ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedAcc ? t.copied : t.copy}</span>
                        </button>
                      </div>
                      <div>
                        <span className="text-[#858594]">{t.amountToPay}: </span>
                        <span className="font-mono-tabular font-bold text-[#FF2A36]">
                          {formatMmk(totalMmk, lang)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#B3B3BE] leading-relaxed">
                        {lang === 'mm'
                          ? selectedMethod.instructionsMm
                          : selectedMethod.instructionsEn}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Last 4 Digits + Receipt Screenshot Upload */}
              <div className="space-y-4 pt-2 border-t border-[#24242C]">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
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
                    className="w-full h-11 px-4 rounded-xl bg-[#0C0C10] border border-[#2A2A34] font-mono-tabular text-lg tracking-[0.25em] font-semibold text-white placeholder:text-[#787886] focus:outline-none focus:border-[#E50914]"
                  />
                  <p className="mt-1 text-[11px] text-[#858594]">{t.receiptLast4Hint}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    {t.uploadScreenshotLabel} *
                  </label>
                  <label className="block rounded-2xl border border-dashed border-[#471B20] bg-[#0C0C10] hover:bg-[#171012] transition-colors p-4 text-center cursor-pointer">
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
                          className="max-h-48 mx-auto rounded-xl border border-[#24242C] object-contain"
                        />
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FF4D57]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t.changeScreenshot}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center">
                        <ImagePlus className="w-7 h-7 text-[#E50914] mb-2" />
                        <span className="text-xs font-medium text-white">
                          {uploadingImage
                            ? lang === 'mm'
                              ? 'ပုံပြင်ဆင်နေပါသည်...'
                              : 'Compressing screenshot...'
                            : t.uploadScreenshotLabel}
                        </span>
                        <span className="mt-1 text-[11px] text-[#858594]">
                          {t.uploadScreenshotHint}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-[#230B0F] border border-[#6E1721] text-xs text-[#FF8A92]">
                  {formError}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && step !== 'success' && (
          <div className="p-5 border-t border-[#24242C] bg-[#0C0C10]">
            {step === 'cart' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#B3B3BE]">{t.total}</span>
                  <span className="font-mono-tabular text-lg font-bold text-white">
                    {formatMmk(totalMmk, lang)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full h-11 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_20px_rgba(229,9,20,0.28)] transition-colors cursor-pointer"
                >
                  {t.proceedCheckout}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || uploadingImage}
                className="w-full h-11 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_20px_rgba(229,9,20,0.28)] disabled:opacity-50 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setQrZoomOpen(false)}
        >
          <div
            className="bg-[#111115] border border-[#3D181C] rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-semibold text-sm text-white">
                {selectedMethod.name}
              </span>
              <button
                type="button"
                onClick={() => setQrZoomOpen(false)}
                className="p-1 text-[#B3B3BE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-xl">
              <img
                src={selectedMethod.qrImageDataUrl}
                alt={selectedMethod.name}
                className="w-full max-h-80 object-contain"
              />
            </div>
            <p className="mt-3 font-mono-tabular text-sm font-semibold text-[#FF4D57]">
              {selectedMethod.accountNumber} · {selectedMethod.accountName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
