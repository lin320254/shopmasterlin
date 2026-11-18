import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Package,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, getReadableFirestoreError, OperationType } from '../lib/firebase';
import { formatMmk, translations } from '../lib/i18n';
import { compressImageFile } from '../lib/imageUtils';
import { PRESET_IMAGES } from '../lib/seedData';
import type {
  Language,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  Promotion,
  StoreSettings,
} from '../types';
import { AdminProductModal } from './AdminProductModal';

interface AdminDashboardProps {
  lang: Language;
  user: FirebaseUser | null;
  isAdmin: boolean;
  onSignIn: () => void;
  settings: StoreSettings;
  products: Product[];
  paymentMethods: PaymentMethod[];
  promotions: Promotion[];
  orders: Order[];
}

type AdminTab = 'analytics' | 'orders' | 'products' | 'promos' | 'cms';

export function AdminDashboard({
  lang,
  user,
  isAdmin,
  onSignIn,
  settings,
  products,
  paymentMethods,
  promotions,
  orders,
}: AdminDashboardProps) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;
  const [deliveryPayload, setDeliveryPayload] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoTitleEn, setPromoTitleEn] = useState('');
  const [promoTitleMm, setPromoTitleMm] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState('10');
  const [promoMinOrder, setPromoMinOrder] = useState('10000');
  const [promoMaxUses, setPromoMaxUses] = useState('100');
  const [savingPromo, setSavingPromo] = useState(false);

  const [sitewidePct, setSitewidePct] = useState(String(settings.sitewideDiscountPercent));
  const [sitewideLabelEn, setSitewideLabelEn] = useState(settings.sitewidePromoLabelEn);
  const [sitewideLabelMm, setSitewideLabelMm] = useState(settings.sitewidePromoLabelMm);

  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [pmName, setPmName] = useState('');
  const [pmAccName, setPmAccName] = useState('');
  const [pmAccNumber, setPmAccNumber] = useState('');
  const [pmQrDataUrl, setPmQrDataUrl] = useState('');
  const [pmInstrEn, setPmInstrEn] = useState('');
  const [pmInstrMm, setPmInstrMm] = useState('');
  const [savingPm, setSavingPm] = useState(false);

  const [cmsForm, setCmsForm] = useState<StoreSettings>(settings);
  const [savingCms, setSavingCms] = useState(false);
  const [adminNotice, setAdminNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [telegramStatus, setTelegramStatus] = useState<{
    configured: boolean;
    hasBotToken: boolean;
    hasChatId: boolean;
  } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const showSyncSuccess = (customMsg?: string) => {
    setAdminNotice({ ok: true, msg: customMsg || t.adminSyncedMsg });
    setTimeout(() => setAdminNotice((prev) => (prev?.ok ? null : prev)), 3000);
  };

  const showSyncError = (err: unknown, op: OperationType, path: string) => {
    const detail = getReadableFirestoreError(err, op, path);
    setAdminNotice({ ok: false, msg: `${t.adminSaveFailed}: ${detail}` });
  };

  useEffect(() => {
    setCmsForm(settings);
    setSitewidePct(String(settings.sitewideDiscountPercent ?? 0));
    setSitewideLabelEn(settings.sitewidePromoLabelEn ?? '');
    setSitewideLabelMm(settings.sitewidePromoLabelMm ?? '');
  }, [settings]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch('/api/telegram/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.configured === 'boolean') {
          setTelegramStatus(data);
        }
      })
      .catch(() => {
        // Ignore status check error if offline
      });
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedOrder) {
      setDeliveryPayload(selectedOrder.deliveryPayload || '');
      setAdminNote(selectedOrder.adminNote || '');
    }
  }, [selectedOrder?.id, selectedOrder?.deliveryPayload, selectedOrder?.adminNote]);

  if (!user || !isAdmin) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white border border-[#EBDADA] rounded-2xl p-10">
          <ShieldCheck className="w-11 h-11 text-[#7A2229] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-[#241113]">{t.adminTitle}</h2>
          <p className="mt-2 text-sm text-[#6A4B4E] max-w-md mx-auto">
            {t.signInRequiredAdmin}
          </p>
          {user ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-[#BE123C]">
                {lang === 'mm'
                  ? `လက်ရှိဝင်ထားသော အကောင့် (${user.email}) သည် Admin မဟုတ်ပါ။ Customer အနေဖြင့် အော်ဒါတင်ရန်နှင့် မှတ်တမ်းကြည့်ရန် အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။`
                  : `Signed in as ${user.email} (Customer account). Switch to the Admin Google account to access Admin Studio.`}
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="px-5 py-2.5 rounded-xl bg-[#6B1D24] text-white text-xs sm:text-sm font-medium hover:bg-[#52141A] cursor-pointer"
              >
                {t.switchAccount}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 px-6 py-2.5 rounded-xl bg-[#6B1D24] text-white text-sm font-medium hover:bg-[#52141A] cursor-pointer"
            >
              {t.signIn}
            </button>
          )}
        </div>
      </section>
    );
  }

  const verifiedOrders = orders.filter((o) => o.status === 'verified_delivered');
  const pendingOrders = orders.filter((o) => o.status === 'pending_verification');
  const rejectedOrders = orders.filter((o) => o.status === 'rejected');

  const verifiedRevenue = verifiedOrders.reduce((s, o) => s + o.totalMmk, 0);
  const pendingValue = pendingOrders.reduce((s, o) => s + o.totalMmk, 0);
  const decidedCount = verifiedOrders.length + rejectedOrders.length;
  const approvalRate =
    decidedCount > 0 ? Math.round((verifiedOrders.length / decidedCount) * 100) : 100;

  const lowStockProducts = products.filter((p) => {
    const total =
      p.variants.length > 0
        ? p.variants.reduce((acc, v) => acc + v.stock, 0)
        : p.stock;
    return total <= 5;
  });

  const channelMap = new Map<string, { revenue: number; count: number }>();
  for (const o of verifiedOrders) {
    const prev = channelMap.get(o.paymentMethodName) || { revenue: 0, count: 0 };
    channelMap.set(o.paymentMethodName, {
      revenue: prev.revenue + o.totalMmk,
      count: prev.count + 1,
    });
  }
  const channelStats = Array.from(channelMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxChannelRev = Math.max(1, ...channelStats.map(([, v]) => v.revenue));

  const productSalesMap = new Map<string, { title: string; units: number; revenue: number }>();
  for (const o of verifiedOrders) {
    for (const item of o.items) {
      const prev = productSalesMap.get(item.productId) || {
        title: lang === 'mm' ? item.titleMm : item.titleEn,
        units: 0,
        revenue: 0,
      };
      productSalesMap.set(item.productId, {
        title: prev.title,
        units: prev.units + item.quantity,
        revenue: prev.revenue + item.unitPriceMmk * item.quantity,
      });
    }
  }
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (!orderSearch.trim()) return true;
    const q = orderSearch.trim().toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.receiptLast4.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  });

  const buildStoreSettingsPayload = (
    source: StoreSettings,
    overrides: Partial<StoreSettings> = {}
  ) => {
    const merged = { ...source, ...overrides };
    const rate = Number(merged.exchangeRateMmk);
    const pct = Number(merged.sitewideDiscountPercent);
    return {
      storeName: (merged.storeName || '').trim().slice(0, 80) || 'Aurelia Commerce',
      announcementEn: (merged.announcementEn || '').trim().slice(0, 200),
      announcementMm: (merged.announcementMm || '').trim().slice(0, 200),
      heroTitleEn: (merged.heroTitleEn || '').trim().slice(0, 140),
      heroTitleMm: (merged.heroTitleMm || '').trim().slice(0, 140),
      heroSubtitleEn: (merged.heroSubtitleEn || '').trim().slice(0, 400),
      heroSubtitleMm: (merged.heroSubtitleMm || '').trim().slice(0, 400),
      heroImageUrl: (merged.heroImageUrl || '').trim().slice(0, 350000),
      sitewideDiscountPercent: Number.isFinite(pct) ? Math.min(90, Math.max(0, pct)) : 0,
      sitewidePromoLabelEn: (merged.sitewidePromoLabelEn || '').trim().slice(0, 100),
      sitewidePromoLabelMm: (merged.sitewidePromoLabelMm || '').trim().slice(0, 100),
      exchangeRateMmk:
        Number.isFinite(rate) && rate >= 1 ? Math.min(1000000, Math.round(rate)) : 4600,
      supportPhone: (merged.supportPhone || '').trim().slice(0, 60),
      supportTelegram: (merged.supportTelegram || '').trim().slice(0, 80),
      footerNoteEn: (merged.footerNoteEn || '').trim().slice(0, 200),
      footerNoteMm: (merged.footerNoteMm || '').trim().slice(0, 200),
      updatedAt: serverTimestamp(),
    };
  };

  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingOrder(true);
    setAdminNotice(null);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        deliveryPayload: deliveryPayload.trim().slice(0, 2000),
        adminNote: adminNote.trim().slice(0, 500),
        updatedAt: serverTimestamp(),
      });
      setSelectedOrderId(null);
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    setAdminNotice(null);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        active: !product.active,
        updatedAt: serverTimestamp(),
      });
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setAdminNotice(null);
    try {
      await deleteDoc(doc(db, 'products', productId));
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminNotice(null);
    const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 2) {
      setAdminNotice({
        ok: false,
        msg:
          lang === 'mm'
            ? 'Promo code သည် အနည်းဆုံး စာလုံး ၂ လုံး (A-Z, 0-9) ရှိရပါမည်။'
            : 'Promo code must be at least 2 alphanumeric characters.',
      });
      return;
    }
    setSavingPromo(true);
    const id = `promo_${Date.now()}`;
    const rawVal = Number(promoValue);
    const discountValue =
      promoType === 'percent'
        ? Math.min(95, Math.max(1, Number.isFinite(rawVal) ? rawVal : 10))
        : Math.max(1, Number.isFinite(rawVal) ? rawVal : 1000);
    try {
      await setDoc(doc(db, 'promotions', id), {
        code: cleanCode.slice(0, 40),
        titleEn: promoTitleEn.trim().slice(0, 100) || `${cleanCode} Discount`,
        titleMm: promoTitleMm.trim().slice(0, 100) || `${cleanCode} လျှော့ဈေး`,
        discountType: promoType,
        discountValue,
        minOrderMmk: Math.max(0, Number(promoMinOrder) || 0),
        maxUses: Math.max(0, Number(promoMaxUses) || 100),
        usedCount: 0,
        active: true,
        expiresAtIso: '2027-12-31',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPromoCode('');
      setPromoTitleEn('');
      setPromoTitleMm('');
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.CREATE, `promotions/${id}`);
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: Promotion) => {
    setAdminNotice(null);
    try {
      await updateDoc(doc(db, 'promotions', promo.id), {
        active: !promo.active,
        updatedAt: serverTimestamp(),
      });
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, `promotions/${promo.id}`);
    }
  };

  const handleDeletePromo = async (id: string) => {
    setAdminNotice(null);
    try {
      await deleteDoc(doc(db, 'promotions', id));
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.DELETE, `promotions/${id}`);
    }
  };

  const handleSaveSitewidePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    setAdminNotice(null);
    try {
      const payload = buildStoreSettingsPayload(settings, {
        sitewideDiscountPercent: Math.min(90, Math.max(0, Number(sitewidePct) || 0)),
        sitewidePromoLabelEn: sitewideLabelEn.trim().slice(0, 100),
        sitewidePromoLabelMm: sitewideLabelMm.trim().slice(0, 100),
      });
      await setDoc(doc(db, 'store_settings', 'global'), payload);
      showSyncSuccess(t.cmsSaved);
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, 'store_settings/global');
    } finally {
      setSavingCms(false);
    }
  };

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdminNotice(null);
    try {
      const compressed = await compressImageFile(file, {
        maxDim: 600,
        quality: 0.85,
        maxChars: 250000,
      });
      setPmQrDataUrl(compressed);
    } catch (err) {
      setAdminNotice({
        ok: false,
        msg: err instanceof Error ? err.message : 'QR image upload failed.',
      });
    }
  };

  const handleUploadHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdminNotice(null);
    try {
      const compressed = await compressImageFile(file, {
        maxDim: 1200,
        quality: 0.8,
        maxChars: 300000,
      });
      setCmsForm((prev) => ({ ...prev, heroImageUrl: compressed }));
    } catch (err) {
      setAdminNotice({
        ok: false,
        msg: err instanceof Error ? err.message : 'Hero banner image upload failed.',
      });
    }
  };

  const startEditPaymentMethod = (pm: PaymentMethod) => {
    setEditingPmId(pm.id);
    setPmName(pm.name);
    setPmAccName(pm.accountName);
    setPmAccNumber(pm.accountNumber);
    setPmQrDataUrl(pm.qrImageDataUrl);
    setPmInstrEn(pm.instructionsEn);
    setPmInstrMm(pm.instructionsMm);
  };

  const resetPmForm = () => {
    setEditingPmId(null);
    setPmName('');
    setPmAccName('');
    setPmAccNumber('');
    setPmQrDataUrl('');
    setPmInstrEn('');
    setPmInstrMm('');
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmName.trim() || !pmAccName.trim() || !pmAccNumber.trim()) return;
    setSavingPm(true);
    setAdminNotice(null);
    const id = editingPmId || `pm_${Date.now()}`;
    const existing = paymentMethods.find((p) => p.id === editingPmId);

    try {
      await setDoc(doc(db, 'payment_methods', id), {
        name: pmName.trim().slice(0, 60),
        accountName: pmAccName.trim().slice(0, 80),
        accountNumber: pmAccNumber.trim().slice(0, 60),
        qrImageDataUrl: (pmQrDataUrl || '').slice(0, 350000),
        instructionsEn: pmInstrEn.trim().slice(0, 300),
        instructionsMm: pmInstrMm.trim().slice(0, 300),
        active: existing ? existing.active : true,
        sortOrder: existing ? existing.sortOrder : paymentMethods.length + 1,
        createdAt: existing?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      resetPmForm();
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.WRITE, `payment_methods/${id}`);
    } finally {
      setSavingPm(false);
    }
  };

  const handleTogglePm = async (pm: PaymentMethod) => {
    setAdminNotice(null);
    try {
      await updateDoc(doc(db, 'payment_methods', pm.id), {
        active: !pm.active,
        updatedAt: serverTimestamp(),
      });
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, `payment_methods/${pm.id}`);
    }
  };

  const handleDeletePm = async (id: string) => {
    setAdminNotice(null);
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
      showSyncSuccess();
    } catch (err) {
      showSyncError(err, OperationType.DELETE, `payment_methods/${id}`);
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    setAdminNotice(null);
    try {
      const payload = buildStoreSettingsPayload(cmsForm);
      await setDoc(doc(db, 'store_settings', 'global'), payload);
      showSyncSuccess(t.cmsSaved);
    } catch (err) {
      showSyncError(err, OperationType.UPDATE, 'store_settings/global');
    } finally {
      setSavingCms(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!user) return;
    setTestingTelegram(true);
    setTelegramFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeName: settings.storeName }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setTelegramFeedback({ ok: true, msg: t.telegramTestSuccess });
      } else {
        setTelegramFeedback({ ok: false, msg: json.error || t.telegramSecretsHint });
      }
    } catch {
      setTelegramFeedback({ ok: false, msg: t.telegramSecretsHint });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-medium text-[#9A4D53]">
            Admin · {user.email}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#241113] mt-1">
            {t.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-[#6A4B4E]">{t.adminSubtitle}</p>
        </div>

        {adminNotice && (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold ${
              adminNotice.ok
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                : 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]'
            }`}
          >
            {adminNotice.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{adminNotice.msg}</span>
            <button
              type="button"
              onClick={() => setAdminNotice(null)}
              className="ml-1 opacity-75 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-[#FCF8F8] border border-[#EBDADA] rounded-2xl mb-8">
        {(
          [
            { id: 'analytics', label: t.adminTabAnalytics, icon: BarChart3 },
            {
              id: 'orders',
              label: `${t.adminTabOrders} (${pendingOrders.length})`,
              icon: LayoutDashboard,
            },
            { id: 'products', label: `${t.adminTabProducts} (${products.length})`, icon: Package },
            { id: 'promos', label: t.adminTabPromos, icon: Tag },
            { id: 'cms', label: t.adminTabCms, icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#6B1D24] text-white'
                  : 'text-[#6A4B4E] hover:text-[#241113] hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#EBDADA] rounded-2xl p-5">
              <div className="text-xs text-[#6A4B4E]">{t.verifiedRevenue}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#241113]">
                {formatMmk(verifiedRevenue, lang)}
              </div>
              <div className="mt-1 text-xs text-[#15803D]">
                {verifiedOrders.length} {lang === 'mm' ? 'ခု အတည်ပြုပြီး' : 'completed orders'}
              </div>
            </div>

            <div className="bg-white border border-[#EBDADA] rounded-2xl p-5">
              <div className="text-xs text-[#6A4B4E]">{t.pendingQueueValue}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#B45309]">
                {formatMmk(pendingValue, lang)}
              </div>
              <div className="mt-1 text-xs text-[#6A4B4E]">
                {pendingOrders.length} {lang === 'mm' ? 'ခု စိစစ်ရန်ကျန်' : 'awaiting review'}
              </div>
            </div>

            <div className="bg-white border border-[#EBDADA] rounded-2xl p-5">
              <div className="text-xs text-[#6A4B4E]">{t.approvalRate}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#7A2229]">
                {approvalRate}%
              </div>
              <div className="mt-1 text-xs text-[#6A4B4E]">
                {rejectedOrders.length} {lang === 'mm' ? 'ခု ငြင်းပယ်ခဲ့သည်' : 'rejected'}
              </div>
            </div>

            <div className="bg-white border border-[#EBDADA] rounded-2xl p-5">
              <div className="text-xs text-[#6A4B4E]">{t.lowStockAlerts}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#241113]">
                {lowStockProducts.length}
              </div>
              <div className="mt-1 text-xs text-[#9A4D53]">
                {lang === 'mm' ? 'လက်ကျန် <= 5 ခုအောက်' : 'Items with stock <= 5'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-[#EBDADA] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#241113] mb-4">
                {t.revenueByChannel}
              </h3>
              {channelStats.length === 0 ? (
                <p className="text-sm text-[#6A4B4E]">
                  {lang === 'mm'
                    ? 'အတည်ပြုပြီးသော အော်ဒါများ ပေါ်လာသည်နှင့် ငွေလွဲနည်းလမ်းအလိုက် ဇယားပြသပါမည်။'
                    : 'Channel share bars appear as orders are verified.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {channelStats.map(([channel, stats]) => {
                    const widthPct = Math.max(8, Math.round((stats.revenue / maxChannelRev) * 100));
                    return (
                      <div key={channel}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-[#241113]">
                            {channel} ({stats.count})
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#7A2229]">
                            {formatMmk(stats.revenue, lang)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-[#FCF8F8] rounded-full overflow-hidden border border-[#EBDADA]">
                          <div
                            className="h-full bg-[#7A2229] rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white border border-[#EBDADA] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#241113] mb-4">
                {t.topProducts}
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-[#6A4B4E]">
                  {lang === 'mm'
                    ? 'ရောင်းချပြီးသော ပစ္စည်းစာရင်း မရှိသေးပါ။'
                    : 'No verified product sales recorded yet.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F7EEEE]">
                  {topProducts.map((p, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <span className="font-mono-tabular text-xs text-[#9A4D53] mr-2">
                          0{i + 1}.
                        </span>
                        <span className="font-medium text-[#241113]">{p.title}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono-tabular text-xs font-semibold text-[#241113]">
                          {formatMmk(p.revenue, lang)}
                        </div>
                        <div className="text-[11px] text-[#6A4B4E]">{p.units} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#EBDADA] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-[#241113]">
                  {t.pendingActions}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderFilter('pending_verification');
                  }}
                  className="text-xs font-medium text-[#7A2229] hover:underline cursor-pointer"
                >
                  {lang === 'mm' ? 'အားလုံးကြည့်ရန်' : 'Open Queue →'}
                </button>
              </div>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-[#6A4B4E]">
                  {lang === 'mm' ? 'စိစစ်ရန် ကျန်ရှိနေသော အော်ဒါမရှိပါ။' : 'All payment receipts are verified.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F7EEEE]">
                  {pendingOrders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-mono-tabular text-xs font-semibold text-[#241113]">
                          {ord.orderNumber} · Slip #{ord.receiptLast4}
                        </div>
                        <div className="text-xs text-[#6A4B4E] truncate">
                          {ord.customerName} · {ord.paymentMethodName}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono-tabular text-xs font-bold text-[#7A2229]">
                          {formatMmk(ord.totalMmk, lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('orders');
                            setSelectedOrderId(ord.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#6B1D24] text-white text-xs font-medium cursor-pointer"
                        >
                          {lang === 'mm' ? 'စစ်ဆေးမည်' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#EBDADA] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#241113] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                <span>{t.lowStockAlerts}</span>
              </h3>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-[#6A4B4E]">
                  {lang === 'mm' ? 'ပစ္စည်းလက်ကျန်အားလုံး လုံလောက်မှုရှိပါသည်။' : 'All inventory levels healthy.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F7EEEE]">
                  {lowStockProducts.map((p) => {
                    const total =
                      p.variants.length > 0
                        ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                        : p.stock;
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[#241113] truncate">
                          {lang === 'mm' ? p.titleMm : p.titleEn}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setProductModalOpen(true);
                          }}
                          className="font-mono-tabular font-semibold text-[#B45309] hover:underline shrink-0 cursor-pointer"
                        >
                          {total} left · Restock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="inline-flex flex-wrap gap-1 p-1 bg-[#FCF8F8] border border-[#EBDADA] rounded-xl">
              {(
                [
                  { id: 'all', label: t.filterAll },
                  { id: 'pending_verification', label: t.statusPending },
                  { id: 'verified_delivered', label: t.statusDelivered },
                  { id: 'rejected', label: t.statusRejected },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-white text-[#241113] border border-[#EBDADA]'
                      : 'text-[#6A4B4E]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#927275] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder={
                  lang === 'mm'
                    ? 'Order # / ဂဏန်း ၄ လုံး / အမည် ရှာရန်...'
                    : 'Search Order #, Last 4 digits, Customer...'
                }
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#D8BEBE] text-xs text-[#241113]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white border border-[#EBDADA] rounded-2xl p-10 text-center text-sm text-[#6A4B4E]">
                  {t.noOrdersYet}
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrderId(ord.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#FCF8F8] border-[#6B1D24]'
                          : 'bg-white border-[#EBDADA] hover:border-[#CCA9A9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono-tabular text-sm font-bold text-[#241113]">
                          {ord.orderNumber}{' '}
                          <span className="text-[#7A2229] ml-1">· #{ord.receiptLast4}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            ord.status === 'verified_delivered'
                              ? 'text-[#15803D]'
                              : ord.status === 'rejected'
                                ? 'text-[#BE123C]'
                                : 'text-[#B45309]'
                          }`}
                        >
                          {ord.status === 'verified_delivered' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : ord.status === 'rejected' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {ord.status === 'verified_delivered'
                              ? t.statusDelivered
                              : ord.status === 'rejected'
                                ? t.statusRejected
                                : t.statusPending}
                          </span>
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-xs text-[#6A4B4E]">
                        <span>
                          {ord.customerName} ({ord.paymentMethodName})
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#241113]">
                          {formatMmk(ord.totalMmk, lang)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#EBDADA] rounded-2xl p-6 sticky top-24">
              {selectedOrder ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F7EEEE] pb-3">
                    <div>
                      <div className="font-mono-tabular text-base font-bold text-[#241113]">
                        {selectedOrder.orderNumber}
                      </div>
                      <div className="text-xs text-[#6A4B4E]">{selectedOrder.customerEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#6A4B4E]">Last 4 Digits</div>
                      <div className="font-mono-tabular text-lg font-bold text-[#7A2229]">
                        {selectedOrder.receiptLast4}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#241113]">
                        {lang === 'mm' ? 'ငွေလွဲပြေစာ Screenshot' : 'Payment Screenshot'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLightboxImage(selectedOrder.receiptImageDataUrl)}
                        className="inline-flex items-center gap-1 text-xs text-[#7A2229] hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'mm' ? 'ပုံကြီးချဲ့ကြည့်ရန်' : 'Zoom'}</span>
                      </button>
                    </div>
                    <img
                      src={selectedOrder.receiptImageDataUrl}
                      alt="Receipt proof"
                      onClick={() => setLightboxImage(selectedOrder.receiptImageDataUrl)}
                      className="w-full max-h-56 object-contain rounded-xl border border-[#EBDADA] bg-[#FCF8F8] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#FCF8F8] border border-[#EBDADA] text-xs space-y-1.5">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-[#241113] font-medium">
                          {item.quantity}x {lang === 'mm' ? item.titleMm : item.titleEn} (
                          {lang === 'mm' ? item.variantLabelMm : item.variantLabelEn})
                        </span>
                        <span className="font-mono-tabular">
                          {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-[#EBDADA] flex justify-between font-bold text-[#241113]">
                      <span>{selectedOrder.paymentMethodName}</span>
                      <span className="font-mono-tabular text-[#7A2229]">
                        {formatMmk(selectedOrder.totalMmk, lang)}
                      </span>
                    </div>
                    <div className="pt-1 text-[#6A4B4E]">
                      <strong>Contact:</strong> {selectedOrder.deliveryContact}{' '}
                      {selectedOrder.customerPhone && `· ${selectedOrder.customerPhone}`}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#241113] mb-1">
                      {t.deliveredOutputLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryPayload}
                      onChange={(e) => setDeliveryPayload(e.target.value)}
                      placeholder={t.deliveryPayloadPlaceholder}
                      className="w-full p-2.5 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs text-[#241113]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#241113] mb-1">
                      {t.adminNoteLabel}
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t.adminNotePlaceholder}
                      className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs text-[#241113]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={updatingOrder}
                      onClick={() =>
                        handleUpdateOrderStatus(selectedOrder, 'verified_delivered')
                      }
                      className="h-10 px-3 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] disabled:opacity-50 cursor-pointer"
                    >
                      {t.approveDeliver}
                    </button>
                    <button
                      type="button"
                      disabled={updatingOrder}
                      onClick={() => handleUpdateOrderStatus(selectedOrder, 'rejected')}
                      className="h-10 px-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C] text-xs font-medium hover:bg-[#FFE4E6] disabled:opacity-50 cursor-pointer"
                    >
                      {t.rejectOrder}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#6A4B4E]">
                  {lang === 'mm'
                    ? 'စိစစ်ရန် ဘယ်ဘက်မှ အော်ဒါတစ်ခုကို ရွေးချယ်ပါ'
                    : 'Select an order on the left to inspect its receipt screenshot and approve delivery.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg font-bold text-[#241113]">
              {t.adminTabProducts}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addProduct}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const totalStock =
                p.variants.length > 0
                  ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                  : p.stock;
              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#EBDADA] rounded-2xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex gap-3.5">
                    <img
                      src={p.imageUrl}
                      alt={p.titleEn}
                      referrerPolicy="no-referrer"
                      className="w-20 h-16 rounded-xl object-cover border border-[#EBDADA] bg-[#FCF8F8] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-[#9A4D53] font-medium truncate">
                        {p.brand} · {p.category}
                      </div>
                      <div className="text-sm font-semibold text-[#241113] line-clamp-1">
                        {lang === 'mm' ? p.titleMm : p.titleEn}
                      </div>
                      <div className="mt-1 font-mono-tabular text-xs font-bold text-[#7A2229]">
                        {formatMmk(p.priceMmk, lang)} · Stock: {totalStock}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F7EEEE] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleProductActive(p)}
                      className={`font-medium cursor-pointer ${
                        p.active ? 'text-[#15803D]' : 'text-[#927275]'
                      }`}
                    >
                      {p.active ? 'Active' : 'Hidden'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(p);
                          setProductModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D8BEBE] text-[#6B1D24] hover:bg-[#FCF8F8] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{lang === 'mm' ? 'ပြင်မည်' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg text-[#BE123C] hover:bg-[#FFF1F2] cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'promos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleSaveSitewidePromo}
              className="bg-white border border-[#EBDADA] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-[#241113]">
                {lang === 'mm'
                  ? 'စတိုးတစ်ခုလုံး အထူးလျှော့ဈေး (Sitewide Discount)'
                  : 'Sitewide Seasonal Discount'}
              </h3>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">
                  {lang === 'mm' ? 'လျှော့ဈေး ရာခိုင်နှုန်း (%)' : 'Discount Percentage (%)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={sitewidePct}
                  onChange={(e) => setSitewidePct(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] font-mono-tabular text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Promo Label (EN)</label>
                <input
                  type="text"
                  value={sitewideLabelEn}
                  onChange={(e) => setSitewideLabelEn(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">ပရိုမိုးရှင်း အမည် (မြန်မာ)</label>
                <input
                  type="text"
                  value={sitewideLabelMm}
                  onChange={(e) => setSitewideLabelMm(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingCms}
                className="w-full h-10 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] cursor-pointer"
              >
                {lang === 'mm' ? 'Sitewide Discount သိမ်းမည်' : 'Apply Storewide Discount'}
              </button>
            </form>

            <form
              onSubmit={handleCreatePromo}
              className="bg-white border border-[#EBDADA] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-[#241113]">
                {t.addPromo}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#6A4B4E] mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="SAVE15"
                    className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] font-mono-tabular uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6A4B4E] mb-1">Type</label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed')}
                    className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] bg-white text-xs"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed MMK</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-[#6A4B4E] mb-1">Value</label>
                  <input
                    type="number"
                    min={1}
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6A4B4E] mb-1">Min MMK</label>
                  <input
                    type="number"
                    min={0}
                    value={promoMinOrder}
                    onChange={(e) => setPromoMinOrder(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6A4B4E] mb-1">Max Uses</label>
                  <input
                    type="number"
                    min={0}
                    value={promoMaxUses}
                    onChange={(e) => setPromoMaxUses(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <input
                type="text"
                value={promoTitleEn}
                onChange={(e) => setPromoTitleEn(e.target.value)}
                placeholder="Description (EN)"
                className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] text-xs"
              />
              <input
                type="text"
                value={promoTitleMm}
                onChange={(e) => setPromoTitleMm(e.target.value)}
                placeholder="ဖော်ပြချက် (မြန်မာ)"
                className="w-full h-10 px-3 rounded-xl border border-[#D8BEBE] text-xs"
              />
              <button
                type="submit"
                disabled={savingPromo}
                className="w-full h-10 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] cursor-pointer"
              >
                {t.addPromo}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#EBDADA] rounded-2xl p-6">
            <h3 className="font-display text-base font-bold text-[#241113] mb-4">
              {lang === 'mm' ? 'ဖန်တီးထားသော Coupon ကုဒ်များ' : 'Promo Codes'}
            </h3>
            <div className="divide-y divide-[#F7EEEE]">
              {promotions.map((promo) => {
                const liveUses = orders.filter(
                  (o) => o.promoCode === promo.code && o.status !== 'rejected'
                ).length;
                return (
                  <div
                    key={promo.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-sm font-bold text-[#7A2229]">
                          {promo.code}
                        </span>
                        <span className="text-xs text-[#6A4B4E]">
                          ·{' '}
                          {promo.discountType === 'percent'
                            ? `${promo.discountValue}% OFF`
                            : formatMmk(promo.discountValue, lang)}
                        </span>
                      </div>
                      <div className="text-xs text-[#6A4B4E] mt-0.5">
                        {lang === 'mm' ? promo.titleMm : promo.titleEn} · Min{' '}
                        {formatMmk(promo.minOrderMmk, lang)} · Used {liveUses}/{promo.maxUses}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePromo(promo)}
                        className={`text-xs font-semibold cursor-pointer ${
                          promo.active ? 'text-[#15803D]' : 'text-[#927275]'
                        }`}
                      >
                        {promo.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePromo(promo.id)}
                        className="p-1.5 text-[#BE123C] hover:bg-[#FFF1F2] rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#EBDADA] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#241113] flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#7A2229]" />
                  <span>
                    {lang === 'mm'
                      ? 'ငွေလွဲအကောင့်နှင့် QR Code များ'
                      : 'Merchant Payment Channels & QR'}
                  </span>
                </h3>
                {editingPmId && (
                  <button
                    type="button"
                    onClick={resetPmForm}
                    className="text-xs text-[#7A2229] underline cursor-pointer"
                  >
                    + New
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-3.5 rounded-xl border border-[#EBDADA] bg-[#FCF8F8] flex items-center gap-3"
                  >
                    {pm.qrImageDataUrl ? (
                      <img
                        src={pm.qrImageDataUrl}
                        alt={pm.name}
                        className="w-14 h-14 rounded-lg object-contain bg-white border border-[#EBDADA] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white border border-[#EBDADA] flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-[#9A4D53]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#241113]">{pm.name}</div>
                      <div className="text-xs text-[#6A4B4E] truncate">
                        {pm.accountName} · <span className="font-mono-tabular">{pm.accountNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePm(pm)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg cursor-pointer ${
                          pm.active ? 'text-[#15803D]' : 'text-[#927275]'
                        }`}
                      >
                        {pm.active ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditPaymentMethod(pm)}
                        className="p-1.5 text-[#6B1D24] hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePm(pm.id)}
                        className="p-1.5 text-[#BE123C] hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSavePaymentMethod}
                className="pt-4 border-t border-[#EBDADA] space-y-3"
              >
                <div className="text-xs font-semibold text-[#241113]">
                  {editingPmId ? 'Edit Payment Method & QR' : t.addPaymentMethod}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    value={pmName}
                    onChange={(e) => setPmName(e.target.value)}
                    placeholder="Channel (KBZPay)"
                    className="h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={pmAccName}
                    onChange={(e) => setPmAccName(e.target.value)}
                    placeholder="Account Name"
                    className="h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={pmAccNumber}
                    onChange={(e) => setPmAccNumber(e.target.value)}
                    placeholder="Phone / Acc No."
                    className="h-9 px-3 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={pmInstrEn}
                    onChange={(e) => setPmInstrEn(e.target.value)}
                    placeholder="Instructions (EN)"
                    className="h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                  />
                  <input
                    type="text"
                    value={pmInstrMm}
                    onChange={(e) => setPmInstrMm(e.target.value)}
                    placeholder="ညွှန်ကြားချက် (မြန်မာ)"
                    className="h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                  />
                </div>

                <label className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-[#CCA9A9] bg-[#FCF8F8] cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQr}
                    className="hidden"
                  />
                  {pmQrDataUrl ? (
                    <img
                      src={pmQrDataUrl}
                      alt="QR Preview"
                      className="w-16 h-16 rounded-lg object-contain bg-white border border-[#EBDADA]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white border border-[#EBDADA] flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-[#9A4D53]" />
                    </div>
                  )}
                  <div className="text-xs">
                    <div className="font-semibold text-[#241113]">
                      {lang === 'mm'
                        ? 'သင်၏ ကိုယ်ပိုင် QR Code ပုံ တင်ရန် နှိပ်ပါ'
                        : 'Click to Upload Your Merchant QR Code'}
                    </div>
                    <div className="text-[11px] text-[#6A4B4E]">
                      KBZPay / WavePay / CB Pay / Bank QR Screenshot
                    </div>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={savingPm}
                  className="w-full h-10 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] cursor-pointer"
                >
                  {savingPm
                    ? 'Saving...'
                    : editingPmId
                      ? 'Update Channel & QR'
                      : t.addPaymentMethod}
                </button>
              </form>
            </div>

            {/* Telegram Shop-Owner Alert Status & Test */}
            <div className="bg-white border border-[#EBDADA] rounded-2xl p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#241113] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#7A2229]" />
                  <span>{t.telegramSectionTitle}</span>
                </h3>
                {telegramStatus && (
                  <span
                    className={`text-xs font-semibold ${
                      telegramStatus.configured ? 'text-[#15803D]' : 'text-[#B45309]'
                    }`}
                  >
                    {telegramStatus.configured ? t.telegramConfigured : t.telegramMissing}
                  </span>
                )}
              </div>

              <p className="text-xs text-[#6A4B4E] leading-relaxed">{t.telegramSectionDesc}</p>
              <p className="text-[11px] font-mono-tabular text-[#927275]">
                {t.telegramSecretsHint}
              </p>

              {telegramFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    telegramFeedback.ok
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                      : 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]'
                  }`}
                >
                  {telegramFeedback.msg}
                </div>
              )}

              <button
                type="button"
                disabled={testingTelegram}
                onClick={handleTestTelegram}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D8BEBE] text-xs font-medium text-[#6B1D24] hover:bg-[#FCF8F8] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingTelegram ? t.telegramSendingTest : t.telegramSendTest}</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSaveCms}
            className="lg:col-span-6 bg-white border border-[#EBDADA] rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-[#241113]">
              {lang === 'mm'
                ? 'Website Page တစ်ခုလုံး စာသားနှင့် ပုံများ ထိန်းချုပ်ရန်'
                : 'Full Storefront CMS Control'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  value={cmsForm.storeName}
                  onChange={(e) => setCmsForm({ ...cmsForm, storeName: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">
                  1 USD Exchange Rate (MMK)
                </label>
                <input
                  type="number"
                  required
                  value={cmsForm.exchangeRateMmk}
                  onChange={(e) =>
                    setCmsForm({ ...cmsForm, exchangeRateMmk: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] font-mono-tabular text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Top Bar Notice (EN)</label>
                <input
                  type="text"
                  value={cmsForm.announcementEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, announcementEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">ထိပ်ဆုံးကြေညာချက် (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.announcementMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, announcementMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Hero Headline (EN)</label>
                <input
                  type="text"
                  value={cmsForm.heroTitleEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroTitleEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Hero ခေါင်းစဉ် (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.heroTitleMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroTitleMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Hero Subtitle (EN)</label>
                <textarea
                  rows={2}
                  value={cmsForm.heroSubtitleEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleEn: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Hero စာသား (မြန်မာ)</label>
                <textarea
                  rows={2}
                  value={cmsForm.heroSubtitleMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleMm: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FCF8F8] border border-[#EBDADA] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#241113]">Hero Banner Image</span>
                <label className="text-xs font-medium text-[#7A2229] cursor-pointer hover:underline">
                  Upload Banner
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadHeroImage}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                {cmsForm.heroImageUrl && (
                  <img
                    src={cmsForm.heroImageUrl}
                    alt="Hero preview"
                    className="w-16 h-12 rounded-lg object-cover border border-[#EBDADA] bg-white shrink-0"
                  />
                )}
                <input
                  type="text"
                  value={cmsForm.heroImageUrl}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroImageUrl: e.target.value })}
                  placeholder="Paste hero image URL or upload banner..."
                  className="flex-1 h-9 px-3 rounded-lg bg-white border border-[#D8BEBE] text-xs text-[#241113]"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IMAGES.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setCmsForm({ ...cmsForm, heroImageUrl: p.url })}
                    className="px-2 py-1 rounded-md bg-white border border-[#EBDADA] text-[11px] text-[#6A4B4E] hover:border-[#7A2229] cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Support Phone</label>
                <input
                  type="text"
                  value={cmsForm.supportPhone}
                  onChange={(e) => setCmsForm({ ...cmsForm, supportPhone: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Support Telegram</label>
                <input
                  type="text"
                  value={cmsForm.supportTelegram}
                  onChange={(e) => setCmsForm({ ...cmsForm, supportTelegram: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Footer Note (EN)</label>
                <input
                  type="text"
                  value={cmsForm.footerNoteEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, footerNoteEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6A4B4E] mb-1">Footer စာသား (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.footerNoteMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, footerNoteMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D8BEBE] text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCms}
              className="w-full h-11 rounded-xl bg-[#6B1D24] text-white text-xs font-medium hover:bg-[#52141A] inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{savingCms ? 'Saving...' : t.saveCms}</span>
            </button>
          </form>
        </div>
      )}

      {productModalOpen && (
        <AdminProductModal
          product={editingProduct}
          lang={lang}
          onSaved={() => showSyncSuccess()}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-[#241113]/75 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 text-[#6A4B4E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Customer payment receipt"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
