import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileDown,
  Loader2,
  Package,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { formatMmk, translations } from '../lib/i18n';
import {
  downloadCompletedOrdersSummaryPdf,
  downloadOrderInvoicePdf,
} from '../lib/invoicePdf';
import type { Language, Order, OrderStatus, StoreSettings } from '../types';

interface CustomerOrdersDashboardProps {
  orders: Order[];
  lang: Language;
  user: FirebaseUser | null;
  storeSettings?: StoreSettings;
  reviewedProductIds?: Set<string>;
  onReviewProduct?: (productId: string) => void;
  onSignIn: () => void;
  onBackToShop: () => void;
}

export function CustomerOrdersDashboard({
  orders,
  lang,
  user,
  storeSettings,
  reviewedProductIds,
  onReviewProduct,
  onSignIn,
  onBackToShop,
}: CustomerOrdersDashboardProps) {
  const t = translations[lang];
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center">
        <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-8 sm:p-10">
          <Package className="w-10 h-10 text-[#E50914] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-white">{t.myOrdersTitle}</h2>
          <p className="mt-2 text-sm text-[#B3B3BE] max-w-md mx-auto">{t.signInToCheckout}</p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#C40812] shadow-[0_0_20px_rgba(229,9,20,0.28)] cursor-pointer"
          >
            {t.signIn}
          </button>
        </div>
      </section>
    );
  }

  const filteredOrders =
    filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter((o) => o.status === 'pending_verification').length;
  const deliveredCount = orders.filter((o) => o.status === 'verified_delivered').length;
  const totalSpent = orders
    .filter((o) => o.status !== 'rejected')
    .reduce((acc, o) => acc + o.totalMmk, 0);

  const handleCopyPayload = (orderId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 1500);
  };

  const handleDownloadInvoice = async (order: Order) => {
    setPdfError(null);
    setGeneratingPdfId(order.id);
    try {
      await downloadOrderInvoicePdf(order, lang, storeSettings);
    } catch {
      setPdfError(t.pdfDownloadError);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadSummary = async () => {
    setPdfError(null);
    setGeneratingPdfId('summary');
    try {
      const customerLabel = user.displayName || user.email || undefined;
      await downloadCompletedOrdersSummaryPdf(orders, lang, storeSettings, customerLabel);
    } catch {
      setPdfError(t.pdfDownloadError);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const renderStatus = (status: OrderStatus) => {
    if (status === 'verified_delivered') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22C55E]">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.statusDelivered}</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5C67]">
          <XCircle className="w-4 h-4" />
          <span>{t.statusRejected}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
        <Clock className="w-4 h-4" />
        <span>{t.statusPending}</span>
      </span>
    );
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {t.myOrdersTitle}
          </h1>
          <p className="mt-1.5 text-sm text-[#B3B3BE]">{t.myOrdersSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {deliveredCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadSummary}
              disabled={generatingPdfId !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-semibold hover:bg-[#C40812] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {generatingPdfId === 'summary' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>
                {generatingPdfId === 'summary' ? t.generatingPdf : t.downloadCompletedSummary}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToShop}
            className="px-4 py-2 rounded-xl border border-[#2A2A34] bg-[#111115] text-xs font-medium text-white hover:border-[#E50914]/60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            ← {t.backToShop}
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#6E1721] bg-[#230B0F] px-4 py-3 text-xs font-medium text-[#FF8A92]">
          <span>{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError(null)}
            className="p-0.5 text-[#FF8A92] hover:text-white cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-7 sm:mb-8">
        <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-[#858594]">{t.totalOrders}</div>
          <div className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-white">
            {orders.length}
          </div>
        </div>
        <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-[#858594]">{t.pendingCount}</div>
          <div className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-[#F59E0B]">
            {pendingCount}
          </div>
        </div>
        <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-[#858594]">{t.deliveredCount}</div>
          <div className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-[#22C55E]">
            {deliveredCount}
          </div>
        </div>
        <div className="bg-[#111115] border border-[#3D181C] rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-[#858594]">{t.totalSpent}</div>
          <div className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-[#FF2A36]">
            {formatMmk(totalSpent, lang)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#111115] border border-[#24242C] rounded-xl mb-6 overflow-x-auto no-scrollbar max-w-full">
        {(
          [
            { key: 'all', label: t.filterAll },
            { key: 'pending_verification', label: t.statusPending },
            { key: 'verified_delivered', label: t.statusDelivered },
            { key: 'rejected', label: t.statusRejected },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === tab.key
                ? 'bg-[#E50914] text-white'
                : 'text-[#B3B3BE] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#111115] border border-[#24242C] rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-[#454554] mx-auto mb-3" />
          <h3 className="font-display text-base font-semibold text-white">{t.noOrdersYet}</h3>
          <p className="mt-1 text-sm text-[#B3B3BE]">{t.noOrdersDesc}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const dateStr = order.createdAt?.toDate
              ? order.createdAt.toDate().toLocaleString()
              : 'Just now';
            return (
              <article
                key={order.id}
                className="bg-[#111115] border border-[#24242C] rounded-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#202028]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#858594]">
                      <span className="font-mono-tabular font-semibold text-white text-sm">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>{order.paymentMethodName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-[#D4D4DE]">
                        Slip #{order.receiptLast4}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {renderStatus(order.status)}
                    <span className="font-mono-tabular text-base font-bold text-white">
                      {formatMmk(order.totalMmk, lang)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-7 space-y-2">
                    {order.items.map((item, idx) => {
                      const alreadyReviewed = reviewedProductIds?.has(item.productId) ?? false;
                      return (
                        <div
                          key={`${item.productId}_${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <div className="text-white min-w-0">
                            <span className="font-mono-tabular text-xs text-[#FF4D57] mr-2">
                              {item.quantity}x
                            </span>
                            <span className="font-medium">
                              {lang === 'mm' ? item.titleMm : item.titleEn}
                            </span>
                            <span className="text-xs text-[#858594] ml-1.5">
                              ({lang === 'mm' ? item.variantLabelMm : item.variantLabelEn})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {order.status === 'verified_delivered' && onReviewProduct && (
                              <button
                                type="button"
                                onClick={() => onReviewProduct(item.productId)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#FF4D57] hover:underline whitespace-nowrap cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    alreadyReviewed
                                      ? 'fill-[#E50914] text-[#E50914]'
                                      : 'text-[#FF4D57]'
                                  }`}
                                />
                                <span>{alreadyReviewed ? t.editReview : t.writeReview}</span>
                              </button>
                            )}
                            <span className="font-mono-tabular text-xs font-medium text-[#B3B3BE]">
                              {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 text-xs text-[#858594]">
                      {t.deliveryContactLabel}:{' '}
                      <span className="text-white font-medium">{order.deliveryContact}</span>
                    </div>
                  </div>

                  {/* Delivery Output & Receipt Preview */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    {order.status === 'verified_delivered' && order.deliveryPayload && (
                      <div className="p-3.5 rounded-xl bg-[#0D2618] border border-[#166534]">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-[#22C55E]">
                            {t.deliveredOutputLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(order.id, order.deliveryPayload)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#4ADE80] hover:underline cursor-pointer"
                          >
                            {copiedOrderId === order.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedOrderId === order.id ? t.copied : t.copy}</span>
                          </button>
                        </div>
                        <pre className="text-xs font-mono-tabular text-[#DCFCE7] whitespace-pre-wrap break-all">
                          {order.deliveryPayload}
                        </pre>
                      </div>
                    )}

                    {order.adminNote && (
                      <div className="p-3 rounded-xl bg-[#0C0C10] border border-[#24242C] text-xs text-[#B3B3BE]">
                        <span className="font-semibold text-white">{t.adminNoteLabel}: </span>
                        {order.adminNote}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                      {order.status === 'verified_delivered' && (
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={generatingPdfId !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E50914] text-xs font-semibold text-white hover:bg-[#C40812] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {generatingPdfId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {generatingPdfId === order.id ? t.generatingPdf : t.downloadInvoice}
                          </span>
                        </button>
                      )}

                      {order.receiptImageDataUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(order.receiptImageDataUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#3D181C] bg-[#180C0E] text-xs font-medium text-white hover:border-[#E50914] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FF4D57]" />
                          <span>{t.viewReceipt}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Receipt Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-[#111115] border border-[#2C2C36] rounded-2xl p-4 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 text-[#B3B3BE] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Payment receipt"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-[#070709]"
            />
          </div>
        </div>
      )}
    </section>
  );
}
