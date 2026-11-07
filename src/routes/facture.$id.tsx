import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site";
import { ProductImage } from "@/components/ProductImage";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { ReceiptPrinter, type ReceiptPrinterStage } from "@/components/ReceiptPrinter";
import { formatDate, formatPrice } from "@/lib/format";
import { fitInBox, loadImage } from "@/lib/pdf-image";
import { useOrderReceipt } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { whatsappUrl } from "@/lib/whatsapp";
import { type Order, type OrderStatus, type StoreSettings, variantLabel } from "@/lib/types";
import logo from "@/assets/logo-new-era-hub-241.jpeg";

/** Le contenu de la facture existe déjà dès que `order` est chargé (ce n'est pas une
 * opération en cours) — "processing" ne doit donc jamais être utilisé ici : ce stage
 * masque le ticket, ce qui bloquerait son affichage indéfiniment pour une commande
 * "Nouvelle" (le tout premier statut, juste après la commande client). */
function stageForStatus(status: OrderStatus): ReceiptPrinterStage {
  switch (status) {
    case "Nouvelle":
    case "Contacté":
    case "Paiement en attente":
    case "Payée":
    case "En préparation":
      return "printing";
    case "Expédiée":
    case "Livrée":
      return "complete";
    case "Annulée":
      return "cancelled";
  }
}

const RECEIPT_PAGE_WIDTH = 80;
const RECEIPT_PAGE_HEIGHT = 200;
const RECEIPT_MARGIN = 6;
const RECEIPT_CONTENT_WIDTH = RECEIPT_PAGE_WIDTH - RECEIPT_MARGIN * 2;
const RECEIPT_ITEM_IMAGE_BOX = 15;

/** Génère un PDF au format reçu thermique (papier étroit, police mono, séparateurs
 * pointillés) qui reprend la mise en page du ticket animé affiché sur la page — plutôt
 * qu'un rapport A4, pour que le fichier téléchargé ressemble vraiment à ce que montre
 * l'imprimante à l'écran. Pagine automatiquement si la commande compte beaucoup d'articles. */
async function downloadInvoicePdf(order: Order, settings: StoreSettings) {
  const [{ default: JsPDF }, logoImg, itemImages] = await Promise.all([
    import("jspdf"),
    loadImage(logo, "JPEG"),
    Promise.all(order.items.map((item) => loadImage(item.image, "PNG"))),
  ]);

  const doc = new JsPDF({ unit: "mm", format: [RECEIPT_PAGE_WIDTH, RECEIPT_PAGE_HEIGHT] });
  doc.setFont("courier");
  const centerX = RECEIPT_PAGE_WIDTH / 2;
  const rightX = RECEIPT_PAGE_WIDTH - RECEIPT_MARGIN;
  let y = RECEIPT_MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > RECEIPT_PAGE_HEIGHT - RECEIPT_MARGIN) {
      doc.addPage([RECEIPT_PAGE_WIDTH, RECEIPT_PAGE_HEIGHT]);
      y = RECEIPT_MARGIN;
    }
  }

  function divider() {
    ensureSpace(6);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(RECEIPT_MARGIN, y, rightX, y);
    doc.setLineDashPattern([], 0);
    y += 5;
  }

  function row(label: string, value: string, size = 8) {
    ensureSpace(4);
    doc.setFontSize(size);
    doc.text(label, RECEIPT_MARGIN, y);
    doc.text(value, rightX, y, { align: "right" });
    y += 4;
  }

  if (logoImg) {
    const { w, h } = fitInBox(logoImg.width, logoImg.height, 15);
    doc.addImage(logoImg.dataUrl, "JPEG", centerX - w / 2, y, w, h);
    y += 17;
  }
  doc.setFontSize(11);
  doc.text(settings.storeName, centerX, y, { align: "center" });
  y += 5;
  doc.setFontSize(7);
  if (settings.address) {
    doc.text(settings.address, centerX, y, { align: "center" });
    y += 4;
  }
  if (settings.phone || settings.whatsappNumber) {
    doc.text(settings.phone || settings.whatsappNumber || "", centerX, y, { align: "center" });
    y += 4;
  }

  divider();
  row("N° commande", order.orderNumber);
  row("Date", formatDate(order.createdAt));
  row("Statut", order.status);

  divider();
  ensureSpace(4);
  doc.setFontSize(7.5);
  doc.text("CLIENT", RECEIPT_MARGIN, y);
  y += 4;
  const customerLines = [
    `${order.customer.lastName} ${order.customer.firstName}`,
    order.customer.phone,
    order.customer.deliveryLocation,
    ...(order.customer.address ? [order.customer.address] : []),
    ...(order.customer.note ? [`Note : ${order.customer.note}`] : []),
  ];
  doc.setFontSize(8);
  for (const line of customerLines) {
    const wrapped = doc.splitTextToSize(line, RECEIPT_CONTENT_WIDTH) as string[];
    ensureSpace(wrapped.length * 4);
    doc.text(wrapped, RECEIPT_MARGIN, y);
    y += wrapped.length * 4;
  }

  divider();
  order.items.forEach((item, i) => {
    const img = itemImages[i];
    const textX = img ? RECEIPT_MARGIN + RECEIPT_ITEM_IMAGE_BOX + 3 : RECEIPT_MARGIN;
    const textWidth = img
      ? RECEIPT_CONTENT_WIDTH - RECEIPT_ITEM_IMAGE_BOX - 3
      : RECEIPT_CONTENT_WIDTH;
    const label = variantLabel(item.variantColor, item.variantSize, item.variantSizeKind);
    doc.setFontSize(7.5);
    // jsPDF's built-in fonts (pas de police embarquée ici) rendent mal le tiret cadratin
    // "—" (glyphes corrompus) - un simple tiret ASCII est sans risque.
    const nameLines = doc.splitTextToSize(
      `${item.brand} ${item.name}${label ? ` - ${label}` : ""}`,
      textWidth,
    ) as string[];
    const rowHeight = Math.max(RECEIPT_ITEM_IMAGE_BOX, 3 + nameLines.length * 3.2 + 4) + 2;
    ensureSpace(rowHeight);
    const rowTop = y;

    if (img) {
      const { w, h } = fitInBox(img.width, img.height, RECEIPT_ITEM_IMAGE_BOX);
      doc.addImage(
        img.dataUrl,
        "PNG",
        RECEIPT_MARGIN + (RECEIPT_ITEM_IMAGE_BOX - w) / 2,
        rowTop + (RECEIPT_ITEM_IMAGE_BOX - h) / 2,
        w,
        h,
      );
    }
    doc.text(nameLines, textX, rowTop + 3);
    doc.text(
      `${item.quantity} x ${formatPrice(item.unitPrice, settings.currency)}`,
      textX,
      rowTop + 3 + nameLines.length * 3.2,
    );
    doc.text(formatPrice(item.unitPrice * item.quantity, settings.currency), rightX, rowTop + 3, {
      align: "right",
    });

    y = rowTop + rowHeight;
  });

  divider();
  row("Sous-total", formatPrice(order.subtotal, settings.currency));
  row(
    `Réduction${order.promoCode ? ` (${order.promoCode})` : ""}`,
    order.discount > 0 ? `-${formatPrice(order.discount, settings.currency)}` : "-",
  );
  y += 1;
  row("TOTAL", formatPrice(order.total, settings.currency), 10);

  y += 4;
  ensureSpace(6);
  doc.setFontSize(7);
  doc.text("Merci pour votre achat ! À bientôt !", centerX, y, { align: "center" });

  const safeNumber = order.orderNumber.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  doc.save(`facture-${safeNumber}.pdf`);
}

export const Route = createFileRoute("/facture/$id")({
  head: () => ({
    meta: [
      { title: "Facture de commande | New Era Hub 241" },
      { name: "description", content: "Récapitulatif de votre commande et paiement via WhatsApp." },
      { property: "og:title", content: "Facture de commande | New Era Hub 241" },
      {
        property: "og:description",
        content: "Récapitulatif de commande et lien de paiement WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useOrderReceipt(id);
  const { data: settings } = useSettings();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Le ticket démarre "rentré" (stage "processing" masque le papier) puis, une fois la
  // commande chargée, passe à son vrai statut un instant plus tard — le temps que la
  // transition de ReceiptPrinter.Output anime visiblement le papier qui sort de la
  // machine. Sans ce délai, React monte directement dans l'état final et il n'y a
  // jamais rien à voir sortir.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!order) return;
    const timer = setTimeout(() => setRevealed(true), 450);
    return () => clearTimeout(timer);
  }, [order?.id]);

  async function handleDownload() {
    if (!order || !settings) return;
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(order, settings);
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isLoading || !settings) {
    return (
      <SiteLayout>
        <div className="container-page max-w-3xl py-8">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
            <div className="flex justify-between gap-4 border-b border-border pb-5">
              <Skeleton className="h-10 w-40 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-24 w-full rounded-xl" />
            <Skeleton className="mt-4 h-40 w-full rounded-xl" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="text-2xl">Commande introuvable.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez le numéro de commande, ou réessayez depuis la page de suivi.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/suivi-commande" className="btn-base btn-dark">
              Réessayer
            </Link>
            <Link to="/boutique" className="btn-base btn-outline">
              Retour à la boutique
            </Link>
            <Link to="/" className="btn-base btn-outline">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const stage = revealed ? stageForStatus(order.status) : "processing";

  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-8">
        <div className="print:hidden">
          <ReceiptPrinter.Root stage={stage} className="mx-auto">
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src={logo}
                    alt={settings.storeName}
                    className="h-7 w-7 shrink-0 rounded-full object-contain"
                  />
                  <span className="truncate text-sm font-bold text-primary-foreground">
                    {settings.storeName}
                  </span>
                </div>
                <Link
                  to="/"
                  className="flex min-h-0 shrink-0 items-center gap-1 rounded-full border border-primary-foreground/25 px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  <Home aria-hidden="true" size={12} />
                  Accueil
                </Link>
              </ReceiptPrinter.Header>

              <ReceiptPrinter.Screen>
                <div className="space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words">
                        Commande #{order.orderNumber}
                      </p>
                      <p className="text-xs text-primary-foreground/70">
                        {order.items.length} article{order.items.length > 1 ? "s" : ""} ·{" "}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <strong className="shrink-0 text-sm">
                      {formatPrice(order.total, settings.currency)}
                    </strong>
                  </div>
                  <ReceiptPrinter.Status>{order.status}</ReceiptPrinter.Status>
                </div>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>

            <ReceiptPrinter.Output>
              <ReceiptPrinter.Paper>
                <div className="text-center">
                  <p className="text-sm font-bold tracking-wide uppercase">{settings.storeName}</p>
                  {settings.address && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{settings.address}</p>
                  )}
                  {(settings.phone || settings.whatsappNumber) && (
                    <p className="text-[11px] text-muted-foreground">
                      {settings.phone || settings.whatsappNumber}
                    </p>
                  )}
                </div>

                <div className="my-4 border-t border-dashed border-foreground/30" />

                <div className="text-xs">
                  <div className="flex justify-between">
                    <span>N° commande</span>
                    <span className="font-semibold">{order.orderNumber}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Date</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="my-4 border-t border-dashed border-foreground/30" />

                <div className="text-xs">
                  <p className="font-semibold tracking-wide text-muted-foreground uppercase">
                    Client
                  </p>
                  <p className="mt-1">
                    {order.customer.lastName} {order.customer.firstName}
                  </p>
                  <p>{order.customer.phone}</p>
                  <p>{order.customer.deliveryLocation}</p>
                  {order.customer.address ? <p>{order.customer.address}</p> : null}
                  {order.customer.note ? (
                    <p className="mt-1 text-muted-foreground">Note : {order.customer.note}</p>
                  ) : null}
                </div>

                <div className="my-4 border-t border-dashed border-foreground/30" />

                <div className="space-y-3 text-xs">
                  {order.items.map((item, i) => {
                    const label = variantLabel(
                      item.variantColor,
                      item.variantSize,
                      item.variantSizeKind,
                    );
                    return (
                      <div
                        key={item.productId ?? `${item.sku}-${i}`}
                        className="flex items-start gap-2"
                      >
                        <ProductImage
                          src={item.image}
                          alt={`${item.brand} ${item.name}`}
                          width={40}
                          className="h-10 w-10 shrink-0 rounded border border-foreground/15 bg-white object-contain p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {item.brand} {item.name}
                            {label ? ` — ${label}` : ""}
                          </p>
                          <div className="flex justify-between text-muted-foreground">
                            <span>
                              {item.quantity} × {formatPrice(item.unitPrice, settings.currency)}
                            </span>
                            <span className="text-foreground">
                              {formatPrice(item.unitPrice * item.quantity, settings.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-4 border-t border-dashed border-foreground/30" />

                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sous-total</dt>
                    <dd>{formatPrice(order.subtotal, settings.currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Réduction{order.promoCode ? ` (${order.promoCode})` : ""}
                    </dt>
                    <dd>
                      {order.discount > 0
                        ? `-${formatPrice(order.discount, settings.currency)}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-foreground/20 pt-2 text-sm font-bold">
                    <dt>Total</dt>
                    <dd>{formatPrice(order.total, settings.currency)}</dd>
                  </div>
                </dl>

                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Merci pour votre achat ! À bientôt !
                </p>
              </ReceiptPrinter.Paper>
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>

          <a
            href={whatsappUrl(order, settings)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-success mx-auto mt-5 block w-full max-w-sm text-center text-base"
          >
            Procéder au paiement sur WhatsApp
          </a>
          <p className="mx-auto mt-2 max-w-sm text-center text-xs text-muted-foreground">
            Le message contient votre numéro de commande, vos informations et la liste des articles.
            Les photos des produits ne peuvent pas être jointes automatiquement.
          </p>

          {order.history.length > 0 && (
            <div className="mx-auto mt-6 max-w-sm">
              <h2 className="text-sm font-bold tracking-wide uppercase">Suivi de la commande</h2>
              <div className="mt-3">
                <OrderStatusTimeline history={order.history} />
              </div>
            </div>
          )}
        </div>

        <div className="hidden rounded-2xl border border-border bg-card p-5 shadow-sm print:block print:rounded-none print:border-black print:shadow-none sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <img src={logo} alt={settings.storeName} className="h-10 w-10 object-contain" />
                <span className="text-lg font-bold">{settings.storeName}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.address}
                <br />
                {settings.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline"
                  >
                    {settings.phone || settings.whatsappNumber}
                  </a>
                ) : (
                  settings.phone
                )}
                {" · "}
                {settings.email ? (
                  <a
                    href={`mailto:${settings.email}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {settings.email}
                  </a>
                ) : null}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-lg font-bold">Commande #{order.orderNumber}</p>
              <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
              <p className="mt-1 inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">
                {order.status}
              </p>
            </div>
          </div>

          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">Client</h2>
              <p className="mt-2 text-sm">
                {order.customer.lastName} {order.customer.firstName}
                <br />
                {order.customer.phone}
                <br />
                {order.customer.deliveryLocation}
                {order.customer.address ? (
                  <>
                    <br />
                    {order.customer.address}
                  </>
                ) : null}
              </p>
              {order.customer.note && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Précision : {order.customer.note}
                </p>
              )}
            </div>
            {order.history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide">Suivi de la commande</h2>
                <div className="mt-3">
                  <OrderStatusTimeline history={order.history} />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Article</th>
                  <th className="py-2 text-center">Qté</th>
                  <th className="py-2 text-right">Prix unitaire</th>
                  <th className="py-2 text-right">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.productId ?? `${item.sku}-${i}`} className="border-b border-border">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={item.image}
                          alt={`${item.brand} ${item.name}`}
                          width={56}
                          className="h-14 w-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                        />
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">
                            {item.brand}
                          </div>
                          <div className="font-medium">
                            {item.name}
                            {variantLabel(item.variantColor, item.variantSize, item.variantSizeKind)
                              ? ` — ${variantLabel(item.variantColor, item.variantSize, item.variantSizeKind)}`
                              : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatPrice(item.unitPrice, settings.currency)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatPrice(item.unitPrice * item.quantity, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sous-total</dt>
              <dd>{formatPrice(order.subtotal, settings.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Réduction{order.promoCode ? ` (${order.promoCode})` : ""}
              </dt>
              <dd>
                {order.discount > 0 ? `-${formatPrice(order.discount, settings.currency)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total, settings.currency)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <Link to="/boutique" className="btn-base btn-outline">
            Continuer mes achats
          </Link>
          <Link to="/" className="btn-base btn-outline">
            Retour à l'accueil
          </Link>
          <button type="button" className="btn-base btn-outline" onClick={() => window.print()}>
            Imprimer la facture
          </button>
          <button
            type="button"
            className="btn-base btn-outline"
            disabled={downloadingPdf}
            onClick={() => void handleDownload()}
          >
            {downloadingPdf ? <Spinner size={14} /> : <FileDown size={14} />}
            Télécharger (PDF)
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}
