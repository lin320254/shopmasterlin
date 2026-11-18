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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
  const [cmsSavedBanner, setCmsSavedBanner] = useState(false);

  const [telegramStatus, setTelegramStatus] = useState<{
    configured: boolean;
    hasBotToken: boolean;
    hasChatId: boolean;
  } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setCmsForm(settings);
    setSitewidePct(String(settings.sitewideDiscountPercent));
    setSitewideLabelEn(settings.sitewidePromoLabelEn);
    setSitewideLabelMm(settings.sitewidePromoLabelMm);
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
  }, [selectedOrder]);

  if (!user || !isAdmin) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-10">
          <ShieldCheck className="w-11 h-11 text-[#5C4030] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-[#1E1612]">{t.adminTitle}</h2>
          <p className="mt-2 text-sm text-[#63554C] max-w-md mx-auto">
            {t.signInRequiredAdmin}
          </p>
          {user ? (
            <p className="mt-4 text-xs text-[#BE123C]">
              {lang === 'mm'
                ? `လက်ရှိဝင်ထားသော အကောင့် (${user.email}) သည် Admin မဟုတ်ပါ။`
                : `Signed in as ${user.email}, which does not have Admin permissions.`}
            </p>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 px-6 py-2.5 rounded-xl bg-[#4B3427] text-white text-sm font-medium hover:bg-[#38251B] cursor-pointer"
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

  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingOrder(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        deliveryPayload: deliveryPayload.trim().slice(0, 2000),
        adminNote: adminNote.trim().slice(0, 500),
        updatedAt: serverTimestamp(),
      });
      setSelectedOrder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        active: !product.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 2) return;
    setSavingPromo(true);
    const id = `promo_${Date.now()}`;
    try {
      await setDoc(doc(db, 'promotions', id), {
        code: cleanCode.slice(0, 40),
        titleEn: promoTitleEn.trim().slice(0, 100) || `${cleanCode} Discount`,
        titleMm: promoTitleMm.trim().slice(0, 100) || `${cleanCode} လျှော့ဈေး`,
        discountType: promoType,
        discountValue: Math.max(1, Number(promoValue) || 10),
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
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `promotions/${id}`);
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: Promotion) => {
    try {
      await updateDoc(doc(db, 'promotions', promo.id), {
        active: !promo.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `promotions/${promo.id}`);
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promotions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `promotions/${id}`);
    }
  };

  const handleSaveSitewidePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    try {
      await setDoc(doc(db, 'store_settings', 'global'), {
        ...cmsForm,
        sitewideDiscountPercent: Math.min(90, Math.max(0, Number(sitewidePct) || 0)),
        sitewidePromoLabelEn: sitewideLabelEn.trim().slice(0, 100),
        sitewidePromoLabelMm: sitewideLabelMm.trim().slice(0, 100),
        updatedAt: serverTimestamp(),
      });
      setCmsSavedBanner(true);
      setTimeout(() => setCmsSavedBanner(false), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'store_settings/global');
    } finally {
      setSavingCms(false);
    }
  };

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, {
      maxDim: 600,
      quality: 0.85,
      maxChars: 250000,
    });
    setPmQrDataUrl(compressed);
  };

  const handleUploadHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, {
      maxDim: 1200,
      quality: 0.8,
      maxChars: 300000,
    });
    setCmsForm((prev) => ({ ...prev, heroImageUrl: compressed }));
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
    const id = editingPmId || `pm_${Date.now()}`;
    const existing = paymentMethods.find((p) => p.id === editingPmId);

    try {
      await setDoc(doc(db, 'payment_methods', id), {
        name: pmName.trim().slice(0, 60),
        accountName: pmAccName.trim().slice(0, 80),
        accountNumber: pmAccNumber.trim().slice(0, 60),
        qrImageDataUrl: pmQrDataUrl.slice(0, 350000),
        instructionsEn: pmInstrEn.trim().slice(0, 300),
        instructionsMm: pmInstrMm.trim().slice(0, 300),
        active: existing ? existing.active : true,
        sortOrder: existing ? existing.sortOrder : paymentMethods.length + 1,
        createdAt: existing?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      resetPmForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `payment_methods/${id}`);
    } finally {
      setSavingPm(false);
    }
  };

  const handleTogglePm = async (pm: PaymentMethod) => {
    try {
      await updateDoc(doc(db, 'payment_methods', pm.id), {
        active: !pm.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payment_methods/${pm.id}`);
    }
  };

  const handleDeletePm = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `payment_methods/${id}`);
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    try {
      await setDoc(doc(db, 'store_settings', 'global'), {
        storeName: cmsForm.storeName.trim().slice(0, 80) || 'Aurelia Commerce',
        announcementEn: cmsForm.announcementEn.trim().slice(0, 200),
        announcementMm: cmsForm.announcementMm.trim().slice(0, 200),
        heroTitleEn: cmsForm.heroTitleEn.trim().slice(0, 140),
        heroTitleMm: cmsForm.heroTitleMm.trim().slice(0, 140),
        heroSubtitleEn: cmsForm.heroSubtitleEn.trim().slice(0, 400),
        heroSubtitleMm: cmsForm.heroSubtitleMm.trim().slice(0, 400),
        heroImageUrl: cmsForm.heroImageUrl.trim().slice(0, 350000),
        sitewideDiscountPercent: Math.min(90, Math.max(0, Number(cmsForm.sitewideDiscountPercent) || 0)),
        sitewidePromoLabelEn: cmsForm.sitewidePromoLabelEn.trim().slice(0, 100),
        sitewidePromoLabelMm: cmsForm.sitewidePromoLabelMm.trim().slice(0, 100),
        exchangeRateMmk: Math.max(1, Number(cmsForm.exchangeRateMmk) || 4600),
        supportPhone: cmsForm.supportPhone.trim().slice(0, 60),
        supportTelegram: cmsForm.supportTelegram.trim().slice(0, 80),
        footerNoteEn: cmsForm.footerNoteEn.trim().slice(0, 200),
        footerNoteMm: cmsForm.footerNoteMm.trim().slice(0, 200),
        updatedAt: serverTimestamp(),
      });
      setCmsSavedBanner(true);
      setTimeout(() => setCmsSavedBanner(false), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'store_settings/global');
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
          <div className="text-xs font-medium text-[#8C6A52]">
            Admin · {user.email}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1612] mt-1">
            {t.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-[#63554C]">{t.adminSubtitle}</p>
        </div>

        {cmsSavedBanner && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-semibold text-[#15803D]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.cmsSaved}</span>
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-[#FAF8F6] border border-[#E7DFD7] rounded-2xl mb-8">
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
                  ? 'bg-[#4B3427] text-white'
                  : 'text-[#63554C] hover:text-[#1E1612] hover:bg-white'
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
            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
              <div className="text-xs text-[#63554C]">{t.verifiedRevenue}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#1E1612]">
                {formatMmk(verifiedRevenue, lang)}
              </div>
              <div className="mt-1 text-xs text-[#15803D]">
                {verifiedOrders.length} {lang === 'mm' ? 'ခု အတည်ပြုပြီး' : 'completed orders'}
              </div>
            </div>

            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
              <div className="text-xs text-[#63554C]">{t.pendingQueueValue}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#B45309]">
                {formatMmk(pendingValue, lang)}
              </div>
              <div className="mt-1 text-xs text-[#63554C]">
                {pendingOrders.length} {lang === 'mm' ? 'ခု စိစစ်ရန်ကျန်' : 'awaiting review'}
              </div>
            </div>

            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
              <div className="text-xs text-[#63554C]">{t.approvalRate}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#5C4030]">
                {approvalRate}%
              </div>
              <div className="mt-1 text-xs text-[#63554C]">
                {rejectedOrders.length} {lang === 'mm' ? 'ခု ငြင်းပယ်ခဲ့သည်' : 'rejected'}
              </div>
            </div>

            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
              <div className="text-xs text-[#63554C]">{t.lowStockAlerts}</div>
              <div className="mt-2 font-mono-tabular text-2xl font-bold text-[#1E1612]">
                {lowStockProducts.length}
              </div>
              <div className="mt-1 text-xs text-[#8C6A52]">
                {lang === 'mm' ? 'လက်ကျန် <= 5 ခုအောက်' : 'Items with stock <= 5'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-[#E7DFD7] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#1E1612] mb-4">
                {t.revenueByChannel}
              </h3>
              {channelStats.length === 0 ? (
                <p className="text-sm text-[#63554C]">
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
                          <span className="font-medium text-[#1E1612]">
                            {channel} ({stats.count})
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#5C4030]">
                            {formatMmk(stats.revenue, lang)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-[#FAF8F6] rounded-full overflow-hidden border border-[#E7DFD7]">
                          <div
                            className="h-full bg-[#5C4030] rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white border border-[#E7DFD7] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#1E1612] mb-4">
                {t.topProducts}
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-[#63554C]">
                  {lang === 'mm'
                    ? 'ရောင်းချပြီးသော ပစ္စည်းစာရင်း မရှိသေးပါ။'
                    : 'No verified product sales recorded yet.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F4EFE9]">
                  {topProducts.map((p, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <span className="font-mono-tabular text-xs text-[#8C6A52] mr-2">
                          0{i + 1}.
                        </span>
                        <span className="font-medium text-[#1E1612]">{p.title}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono-tabular text-xs font-semibold text-[#1E1612]">
                          {formatMmk(p.revenue, lang)}
                        </div>
                        <div className="text-[11px] text-[#63554C]">{p.units} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E7DFD7] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-[#1E1612]">
                  {t.pendingActions}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderFilter('pending_verification');
                  }}
                  className="text-xs font-medium text-[#5C4030] hover:underline cursor-pointer"
                >
                  {lang === 'mm' ? 'အားလုံးကြည့်ရန်' : 'Open Queue →'}
                </button>
              </div>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-[#63554C]">
                  {lang === 'mm' ? 'စိစစ်ရန် ကျန်ရှိနေသော အော်ဒါမရှိပါ။' : 'All payment receipts are verified.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F4EFE9]">
                  {pendingOrders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-mono-tabular text-xs font-semibold text-[#1E1612]">
                          {ord.orderNumber} · Slip #{ord.receiptLast4}
                        </div>
                        <div className="text-xs text-[#63554C] truncate">
                          {ord.customerName} · {ord.paymentMethodName}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono-tabular text-xs font-bold text-[#5C4030]">
                          {formatMmk(ord.totalMmk, lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('orders');
                            setSelectedOrder(ord);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#4B3427] text-white text-xs font-medium cursor-pointer"
                        >
                          {lang === 'mm' ? 'စစ်ဆေးမည်' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E7DFD7] rounded-2xl p-6">
              <h3 className="font-display text-base font-bold text-[#1E1612] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                <span>{t.lowStockAlerts}</span>
              </h3>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-[#63554C]">
                  {lang === 'mm' ? 'ပစ္စည်းလက်ကျန်အားလုံး လုံလောက်မှုရှိပါသည်။' : 'All inventory levels healthy.'}
                </p>
              ) : (
                <div className="divide-y divide-[#F4EFE9]">
                  {lowStockProducts.map((p) => {
                    const total =
                      p.variants.length > 0
                        ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                        : p.stock;
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[#1E1612] truncate">
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
            <div className="inline-flex flex-wrap gap-1 p-1 bg-[#FAF8F6] border border-[#E7DFD7] rounded-xl">
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
                      ? 'bg-white text-[#1E1612] border border-[#E7DFD7]'
                      : 'text-[#63554C]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#8B7B71] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder={
                  lang === 'mm'
                    ? 'Order # / ဂဏန်း ၄ လုံး / အမည် ရှာရန်...'
                    : 'Search Order #, Last 4 digits, Customer...'
                }
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#D2C1B4] text-xs text-[#1E1612]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white border border-[#E7DFD7] rounded-2xl p-10 text-center text-sm text-[#63554C]">
                  {t.noOrdersYet}
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#FAF8F6] border-[#4B3427]'
                          : 'bg-white border-[#E7DFD7] hover:border-[#C5B2A3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono-tabular text-sm font-bold text-[#1E1612]">
                          {ord.orderNumber}{' '}
                          <span className="text-[#5C4030] ml-1">· #{ord.receiptLast4}</span>
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

                      <div className="mt-1.5 flex items-center justify-between text-xs text-[#63554C]">
                        <span>
                          {ord.customerName} ({ord.paymentMethodName})
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#1E1612]">
                          {formatMmk(ord.totalMmk, lang)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E7DFD7] rounded-2xl p-6 sticky top-24">
              {selectedOrder ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F4EFE9] pb-3">
                    <div>
                      <div className="font-mono-tabular text-base font-bold text-[#1E1612]">
                        {selectedOrder.orderNumber}
                      </div>
                      <div className="text-xs text-[#63554C]">{selectedOrder.customerEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#63554C]">Last 4 Digits</div>
                      <div className="font-mono-tabular text-lg font-bold text-[#5C4030]">
                        {selectedOrder.receiptLast4}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#1E1612]">
                        {lang === 'mm' ? 'ငွေလွဲပြေစာ Screenshot' : 'Payment Screenshot'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLightboxImage(selectedOrder.receiptImageDataUrl)}
                        className="inline-flex items-center gap-1 text-xs text-[#5C4030] hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'mm' ? 'ပုံကြီးချဲ့ကြည့်ရန်' : 'Zoom'}</span>
                      </button>
                    </div>
                    <img
                      src={selectedOrder.receiptImageDataUrl}
                      alt="Receipt proof"
                      onClick={() => setLightboxImage(selectedOrder.receiptImageDataUrl)}
                      className="w-full max-h-56 object-contain rounded-xl border border-[#E7DFD7] bg-[#FAF8F6] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF8F6] border border-[#E7DFD7] text-xs space-y-1.5">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-[#1E1612] font-medium">
                          {item.quantity}x {lang === 'mm' ? item.titleMm : item.titleEn} (
                          {lang === 'mm' ? item.variantLabelMm : item.variantLabelEn})
                        </span>
                        <span className="font-mono-tabular">
                          {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-[#E7DFD7] flex justify-between font-bold text-[#1E1612]">
                      <span>{selectedOrder.paymentMethodName}</span>
                      <span className="font-mono-tabular text-[#5C4030]">
                        {formatMmk(selectedOrder.totalMmk, lang)}
                      </span>
                    </div>
                    <div className="pt-1 text-[#63554C]">
                      <strong>Contact:</strong> {selectedOrder.deliveryContact}{' '}
                      {selectedOrder.customerPhone && `· ${selectedOrder.customerPhone}`}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1E1612] mb-1">
                      {t.deliveredOutputLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryPayload}
                      onChange={(e) => setDeliveryPayload(e.target.value)}
                      placeholder={t.deliveryPayloadPlaceholder}
                      className="w-full p-2.5 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs text-[#1E1612]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1E1612] mb-1">
                      {t.adminNoteLabel}
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t.adminNotePlaceholder}
                      className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs text-[#1E1612]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={updatingOrder}
                      onClick={() =>
                        handleUpdateOrderStatus(selectedOrder, 'verified_delivered')
                      }
                      className="h-10 px-3 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] disabled:opacity-50 cursor-pointer"
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
                <div className="py-12 text-center text-xs text-[#63554C]">
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
            <h2 className="font-display text-lg font-bold text-[#1E1612]">
              {t.adminTabProducts}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] cursor-pointer"
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
                  className="bg-white border border-[#E7DFD7] rounded-2xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex gap-3.5">
                    <img
                      src={p.imageUrl}
                      alt={p.titleEn}
                      referrerPolicy="no-referrer"
                      className="w-20 h-16 rounded-xl object-cover border border-[#E7DFD7] bg-[#FAF8F6] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-[#8C6A52] font-medium truncate">
                        {p.brand} · {p.category}
                      </div>
                      <div className="text-sm font-semibold text-[#1E1612] line-clamp-1">
                        {lang === 'mm' ? p.titleMm : p.titleEn}
                      </div>
                      <div className="mt-1 font-mono-tabular text-xs font-bold text-[#5C4030]">
                        {formatMmk(p.priceMmk, lang)} · Stock: {totalStock}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F4EFE9] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleProductActive(p)}
                      className={`font-medium cursor-pointer ${
                        p.active ? 'text-[#15803D]' : 'text-[#8B7B71]'
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D2C1B4] text-[#4B3427] hover:bg-[#FAF8F6] cursor-pointer"
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
              className="bg-white border border-[#E7DFD7] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-[#1E1612]">
                {lang === 'mm'
                  ? 'စတိုးတစ်ခုလုံး အထူးလျှော့ဈေး (Sitewide Discount)'
                  : 'Sitewide Seasonal Discount'}
              </h3>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">
                  {lang === 'mm' ? 'လျှော့ဈေး ရာခိုင်နှုန်း (%)' : 'Discount Percentage (%)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={sitewidePct}
                  onChange={(e) => setSitewidePct(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Promo Label (EN)</label>
                <input
                  type="text"
                  value={sitewideLabelEn}
                  onChange={(e) => setSitewideLabelEn(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">ပရိုမိုးရှင်း အမည် (မြန်မာ)</label>
                <input
                  type="text"
                  value={sitewideLabelMm}
                  onChange={(e) => setSitewideLabelMm(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingCms}
                className="w-full h-10 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] cursor-pointer"
              >
                {lang === 'mm' ? 'Sitewide Discount သိမ်းမည်' : 'Apply Storewide Discount'}
              </button>
            </form>

            <form
              onSubmit={handleCreatePromo}
              className="bg-white border border-[#E7DFD7] rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-[#1E1612]">
                {t.addPromo}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="SAVE15"
                    className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">Type</label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed')}
                    className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] bg-white text-xs"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed MMK</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">Value</label>
                  <input
                    type="number"
                    min={1}
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">Min MMK</label>
                  <input
                    type="number"
                    min={0}
                    value={promoMinOrder}
                    onChange={(e) => setPromoMinOrder(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#63554C] mb-1">Max Uses</label>
                  <input
                    type="number"
                    min={0}
                    value={promoMaxUses}
                    onChange={(e) => setPromoMaxUses(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <input
                type="text"
                value={promoTitleEn}
                onChange={(e) => setPromoTitleEn(e.target.value)}
                placeholder="Description (EN)"
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-xs"
              />
              <input
                type="text"
                value={promoTitleMm}
                onChange={(e) => setPromoTitleMm(e.target.value)}
                placeholder="ဖော်ပြချက် (မြန်မာ)"
                className="w-full h-10 px-3 rounded-xl border border-[#D2C1B4] text-xs"
              />
              <button
                type="submit"
                disabled={savingPromo}
                className="w-full h-10 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] cursor-pointer"
              >
                {t.addPromo}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E7DFD7] rounded-2xl p-6">
            <h3 className="font-display text-base font-bold text-[#1E1612] mb-4">
              {lang === 'mm' ? 'ဖန်တီးထားသော Coupon ကုဒ်များ' : 'Promo Codes'}
            </h3>
            <div className="divide-y divide-[#F4EFE9]">
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
                        <span className="font-mono-tabular text-sm font-bold text-[#5C4030]">
                          {promo.code}
                        </span>
                        <span className="text-xs text-[#63554C]">
                          ·{' '}
                          {promo.discountType === 'percent'
                            ? `${promo.discountValue}% OFF`
                            : formatMmk(promo.discountValue, lang)}
                        </span>
                      </div>
                      <div className="text-xs text-[#63554C] mt-0.5">
                        {lang === 'mm' ? promo.titleMm : promo.titleEn} · Min{' '}
                        {formatMmk(promo.minOrderMmk, lang)} · Used {liveUses}/{promo.maxUses}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePromo(promo)}
                        className={`text-xs font-semibold cursor-pointer ${
                          promo.active ? 'text-[#15803D]' : 'text-[#8B7B71]'
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
            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#1E1612] flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#5C4030]" />
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
                    className="text-xs text-[#5C4030] underline cursor-pointer"
                  >
                    + New
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-3.5 rounded-xl border border-[#E7DFD7] bg-[#FAF8F6] flex items-center gap-3"
                  >
                    {pm.qrImageDataUrl ? (
                      <img
                        src={pm.qrImageDataUrl}
                        alt={pm.name}
                        className="w-14 h-14 rounded-lg object-contain bg-white border border-[#E7DFD7] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white border border-[#E7DFD7] flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-[#8C6A52]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1E1612]">{pm.name}</div>
                      <div className="text-xs text-[#63554C] truncate">
                        {pm.accountName} · <span className="font-mono-tabular">{pm.accountNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePm(pm)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg cursor-pointer ${
                          pm.active ? 'text-[#15803D]' : 'text-[#8B7B71]'
                        }`}
                      >
                        {pm.active ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditPaymentMethod(pm)}
                        className="p-1.5 text-[#4B3427] hover:bg-white rounded-lg cursor-pointer"
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
                className="pt-4 border-t border-[#E7DFD7] space-y-3"
              >
                <div className="text-xs font-semibold text-[#1E1612]">
                  {editingPmId ? 'Edit Payment Method & QR' : t.addPaymentMethod}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    value={pmName}
                    onChange={(e) => setPmName(e.target.value)}
                    placeholder="Channel (KBZPay)"
                    className="h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={pmAccName}
                    onChange={(e) => setPmAccName(e.target.value)}
                    placeholder="Account Name"
                    className="h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={pmAccNumber}
                    onChange={(e) => setPmAccNumber(e.target.value)}
                    placeholder="Phone / Acc No."
                    className="h-9 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={pmInstrEn}
                    onChange={(e) => setPmInstrEn(e.target.value)}
                    placeholder="Instructions (EN)"
                    className="h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                  />
                  <input
                    type="text"
                    value={pmInstrMm}
                    onChange={(e) => setPmInstrMm(e.target.value)}
                    placeholder="ညွှန်ကြားချက် (မြန်မာ)"
                    className="h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                  />
                </div>

                <label className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-[#C5B2A3] bg-[#FAF8F6] cursor-pointer">
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
                      className="w-16 h-16 rounded-lg object-contain bg-white border border-[#E7DFD7]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white border border-[#E7DFD7] flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-[#8C6A52]" />
                    </div>
                  )}
                  <div className="text-xs">
                    <div className="font-semibold text-[#1E1612]">
                      {lang === 'mm'
                        ? 'သင်၏ ကိုယ်ပိုင် QR Code ပုံ တင်ရန် နှိပ်ပါ'
                        : 'Click to Upload Your Merchant QR Code'}
                    </div>
                    <div className="text-[11px] text-[#63554C]">
                      KBZPay / WavePay / CB Pay / Bank QR Screenshot
                    </div>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={savingPm}
                  className="w-full h-10 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] cursor-pointer"
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
            <div className="bg-white border border-[#E7DFD7] rounded-2xl p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#1E1612] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#5C4030]" />
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

              <p className="text-xs text-[#63554C] leading-relaxed">{t.telegramSectionDesc}</p>
              <p className="text-[11px] font-mono-tabular text-[#8B7B71]">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D2C1B4] text-xs font-medium text-[#4B3427] hover:bg-[#FAF8F6] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingTelegram ? t.telegramSendingTest : t.telegramSendTest}</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSaveCms}
            className="lg:col-span-6 bg-white border border-[#E7DFD7] rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-[#1E1612]">
              {lang === 'mm'
                ? 'Website Page တစ်ခုလုံး စာသားနှင့် ပုံများ ထိန်းချုပ်ရန်'
                : 'Full Storefront CMS Control'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  value={cmsForm.storeName}
                  onChange={(e) => setCmsForm({ ...cmsForm, storeName: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">
                  1 USD Exchange Rate (MMK)
                </label>
                <input
                  type="number"
                  required
                  value={cmsForm.exchangeRateMmk}
                  onChange={(e) =>
                    setCmsForm({ ...cmsForm, exchangeRateMmk: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] font-mono-tabular text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Top Bar Notice (EN)</label>
                <input
                  type="text"
                  value={cmsForm.announcementEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, announcementEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">ထိပ်ဆုံးကြေညာချက် (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.announcementMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, announcementMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Hero Headline (EN)</label>
                <input
                  type="text"
                  value={cmsForm.heroTitleEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroTitleEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Hero ခေါင်းစဉ် (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.heroTitleMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroTitleMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Hero Subtitle (EN)</label>
                <textarea
                  rows={2}
                  value={cmsForm.heroSubtitleEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleEn: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Hero စာသား (မြန်မာ)</label>
                <textarea
                  rows={2}
                  value={cmsForm.heroSubtitleMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitleMm: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F6] border border-[#E7DFD7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#1E1612]">Hero Banner Image</span>
                <label className="text-xs font-medium text-[#5C4030] cursor-pointer hover:underline">
                  Upload Banner
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadHeroImage}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IMAGES.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setCmsForm({ ...cmsForm, heroImageUrl: p.url })}
                    className="px-2 py-1 rounded-md bg-white border border-[#E7DFD7] text-[11px] text-[#63554C] cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Support Phone</label>
                <input
                  type="text"
                  value={cmsForm.supportPhone}
                  onChange={(e) => setCmsForm({ ...cmsForm, supportPhone: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Support Telegram</label>
                <input
                  type="text"
                  value={cmsForm.supportTelegram}
                  onChange={(e) => setCmsForm({ ...cmsForm, supportTelegram: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Footer Note (EN)</label>
                <input
                  type="text"
                  value={cmsForm.footerNoteEn}
                  onChange={(e) => setCmsForm({ ...cmsForm, footerNoteEn: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#63554C] mb-1">Footer စာသား (မြန်မာ)</label>
                <input
                  type="text"
                  value={cmsForm.footerNoteMm}
                  onChange={(e) => setCmsForm({ ...cmsForm, footerNoteMm: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-[#D2C1B4] text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCms}
              className="w-full h-11 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] inline-flex items-center justify-center gap-2 cursor-pointer"
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
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-[#1E1612]/75 flex items-center justify-center p-4"
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
                className="p-1 text-[#63554C] cursor-pointer"
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
