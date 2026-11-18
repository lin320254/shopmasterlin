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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-10">
          <Package className="w-10 h-10 text-[#8C6A52] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-[#1E1612]">{t.myOrdersTitle}</h2>
          <p className="mt-2 text-sm text-[#63554C] max-w-md mx-auto">{t.signInToCheckout}</p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[#4B3427] text-white text-sm font-medium hover:bg-[#38251B] cursor-pointer"
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
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.statusDelivered}</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BE123C]">
          <XCircle className="w-4 h-4" />
          <span>{t.statusRejected}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
        <Clock className="w-4 h-4" />
        <span>{t.statusPending}</span>
      </span>
    );
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1612]">
            {t.myOrdersTitle}
          </h1>
          <p className="mt-1.5 text-sm text-[#63554C]">{t.myOrdersSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {deliveredCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadSummary}
              disabled={generatingPdfId !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4B3427] text-white text-xs font-medium hover:bg-[#38251B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
            className="px-4 py-2 rounded-xl border border-[#D2C1B4] text-xs font-medium text-[#4B3427] hover:bg-[#FAF8F6] whitespace-nowrap shrink-0 cursor-pointer"
          >
            ← {t.backToShop}
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-xs font-medium text-[#BE123C]">
          <span>{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError(null)}
            className="p-0.5 text-[#BE123C] hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
          <div className="text-xs text-[#63554C]">{t.totalOrders}</div>
          <div className="mt-1.5 font-mono-tabular text-2xl font-bold text-[#1E1612]">
            {orders.length}
          </div>
        </div>
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
          <div className="text-xs text-[#63554C]">{t.pendingCount}</div>
          <div className="mt-1.5 font-mono-tabular text-2xl font-bold text-[#B45309]">
            {pendingCount}
          </div>
        </div>
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
          <div className="text-xs text-[#63554C]">{t.deliveredCount}</div>
          <div className="mt-1.5 font-mono-tabular text-2xl font-bold text-[#15803D]">
            {deliveredCount}
          </div>
        </div>
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-5">
          <div className="text-xs text-[#63554C]">{t.totalSpent}</div>
          <div className="mt-1.5 font-mono-tabular text-2xl font-bold text-[#5C4030]">
            {formatMmk(totalSpent, lang)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#FAF8F6] border border-[#E7DFD7] rounded-xl mb-6">
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filter === tab.key
                ? 'bg-white text-[#1E1612] border border-[#E7DFD7]'
                : 'text-[#63554C] hover:text-[#1E1612]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-[#E7DFD7] rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-[#C5B2A3] mx-auto mb-3" />
          <h3 className="font-display text-base font-semibold text-[#1E1612]">{t.noOrdersYet}</h3>
          <p className="mt-1 text-sm text-[#63554C]">{t.noOrdersDesc}</p>
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
                className="bg-white border border-[#E7DFD7] rounded-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F4EFE9]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#63554C]">
                      <span className="font-mono-tabular font-semibold text-[#1E1612] text-sm">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>{order.paymentMethodName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Slip #{order.receiptLast4}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderStatus(order.status)}
                    <span className="font-mono-tabular text-base font-bold text-[#1E1612]">
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
                          <div className="text-[#1E1612] min-w-0">
                            <span className="font-mono-tabular text-xs text-[#8C6A52] mr-2">
                              {item.quantity}x
                            </span>
                            <span className="font-medium">
                              {lang === 'mm' ? item.titleMm : item.titleEn}
                            </span>
                            <span className="text-xs text-[#63554C] ml-1.5">
                              ({lang === 'mm' ? item.variantLabelMm : item.variantLabelEn})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {order.status === 'verified_delivered' && onReviewProduct && (
                              <button
                                type="button"
                                onClick={() => onReviewProduct(item.productId)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#5C4030] hover:underline whitespace-nowrap cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    alreadyReviewed
                                      ? 'fill-[#B45309] text-[#B45309]'
                                      : 'text-[#8C6A52]'
                                  }`}
                                />
                                <span>{alreadyReviewed ? t.editReview : t.writeReview}</span>
                              </button>
                            )}
                            <span className="font-mono-tabular text-xs font-medium text-[#63554C]">
                              {formatMmk(item.unitPriceMmk * item.quantity, lang)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 text-xs text-[#63554C]">
                      {t.deliveryContactLabel}:{' '}
                      <span className="text-[#1E1612] font-medium">{order.deliveryContact}</span>
                    </div>
                  </div>

                  {/* Delivery Output & Receipt Preview */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    {order.status === 'verified_delivered' && order.deliveryPayload && (
                      <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-[#15803D]">
                            {t.deliveredOutputLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(order.id, order.deliveryPayload)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] hover:underline cursor-pointer"
                          >
                            {copiedOrderId === order.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedOrderId === order.id ? t.copied : t.copy}</span>
                          </button>
                        </div>
                        <pre className="text-xs font-mono-tabular text-[#14532D] whitespace-pre-wrap break-all">
                          {order.deliveryPayload}
                        </pre>
                      </div>
                    )}

                    {order.adminNote && (
                      <div className="p-3 rounded-xl bg-[#FAF8F6] border border-[#E7DFD7] text-xs text-[#63554C]">
                        <span className="font-semibold text-[#1E1612]">{t.adminNoteLabel}: </span>
                        {order.adminNote}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                      {order.status === 'verified_delivered' && (
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={generatingPdfId !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4B3427] text-xs font-medium text-white hover:bg-[#38251B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D2C1B4] text-xs font-medium text-[#4B3427] hover:bg-[#FAF8F6] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
          className="fixed inset-0 z-50 bg-[#1E1612]/75 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-md w-full"
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
              alt="Payment receipt"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
