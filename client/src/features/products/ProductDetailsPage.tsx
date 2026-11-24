import { APP_NAME } from "../../lib/brand";
import { Dropdown } from "../../components/ui/Dropdown";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import {
  PRODUCT_ILLUSTRATION_FALLBACK,
  ProductImage,
} from "../../components/ui/ProductImage";
import { apiFetch, asUuid } from "../../lib/api";
import { convertCurrency } from "../../lib/currency-client";
import type {
  ListingResponse,
  PriceObservation,
  ProductResponse,
  TrackingResponse,
} from "../../lib/api-types";
import {
  formatDateTime,
  formatDisplayValue,
  formatDateOnly,
  formatShortDateOrDash,
} from "../../lib/format";
import { useEffect, useState, useContext } from "react";
import { DisplayCurrencyContext, useLocale } from "../../lib/i18n-context";
import "./product-details.css";

const SERIES_COLORS = ["#ff6257", "#4d91d8", "#55a878", "#f28c38"];
const HISTORY_PAGE_SIZE = 200;
const MAX_CHART_ZOOM = 8;
const DAY_MS = 864e5;
const STALE_AFTER_DAYS = 14;

type DateFormatOptions = Parameters<typeof formatDateTime>[1];
const CHART_DATE_OPTIONS = {
  month: "short",
  day: "numeric",
} as unknown as DateFormatOptions;

interface SearchCandidate {
  name?: string;
  description?: string;
  storeName?: string;
  productUrl: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  isVerified?: boolean;
}

interface TrackPayload {
  name?: string;
  productUrl?: string;
  imageUrl?: string | null;
  storeName?: string | null;
  currency?: string | null;
  price?: number | null;
  isVerified?: boolean;
  existingProductId?: string;
}

interface SpecSheet {
  fields?: { label: string; value: string }[];
  updatedAt?: string | null;
}

interface ProductDetailsPageProps {
  id: string;
  candidate?: SearchCandidate | null;
  token?: string | null;
  notify: (message: string) => void;
  onCompare: (productId: string) => void;
  compareIds: string[];
  onBack: () => void;
  onTrack: (item: SearchCandidate | TrackPayload) => void;
  onSignIn: () => void;
}

interface Movement {
  storeName: string;
  dir: "down" | "up";
  percent: number;
  since: string;
}

type OfferTrust = "inactive" | "noprice" | "stale" | "unverified" | "verified";

function offerTrust(listing: ListingResponse): OfferTrust {
  if (!listing.isActive) return "inactive";
  if (listing.currentPrice == null) return "noprice";
  const checkedAt = listing.lastScrapedAt
    ? new Date(listing.lastScrapedAt).getTime()
    : NaN;
  if (
    !Number.isFinite(checkedAt) ||
    Date.now() - checkedAt > STALE_AFTER_DAYS * DAY_MS
  )
    return "stale";
  return listing.hasVerifiedPrice ? "verified" : "unverified";
}

type StoreObservation = PriceObservation & { storeName: string };

function heroMovement(observations: StoreObservation[]): Movement | null {
  if (!observations.length) return null;
  const byCurrency = new Map<string, StoreObservation[]>();
  for (const obs of observations) {
    const key = obs.currencyCode || "";
    if (!byCurrency.has(key)) byCurrency.set(key, []);
    byCurrency.get(key)!.push(obs);
  }
  const currencyGroup = [...byCurrency.values()].sort(
    (a, b) => b.length - a.length,
  )[0];
  if (!currencyGroup || currencyGroup.length < 2) return null;

  const byStore = new Map<string, StoreObservation[]>();
  for (const obs of currencyGroup) {
    if (!byStore.has(obs.storeName)) byStore.set(obs.storeName, []);
    byStore.get(obs.storeName)!.push(obs);
  }
  const movements: Movement[] = [];
  for (const [storeName, list] of byStore) {
    list.sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
    const latest = list[list.length - 1];
    const previous = list
      .slice(0, -1)
      .reverse()
      .find((obs) => {
        const gap = +new Date(latest.recordedAt) - +new Date(obs.recordedAt);
        return gap > DAY_MS && gap <= 30 * DAY_MS;
      });
    if (!previous || previous.price <= 0) continue;
    const percent = Math.round(
      Math.abs(((latest.price - previous.price) / previous.price) * 100),
    );
    if (percent === 0) continue;
    movements.push({
      storeName: storeName || "",
      dir: latest.price < previous.price ? "down" : "up",
      percent,
      since: formatDateOnly(previous.recordedAt),
    });
  }
  if (!movements.length) return null;
  const floorStoreName = [...byStore.entries()]
    .map(
      ([store, list]) =>
        list[list.length - 1] && { store, latest: list[list.length - 1] },
    )
    .filter((entry): entry is { store: string; latest: StoreObservation } =>
      Boolean(entry.latest),
    )
    .sort((a, b) => a.latest.price - b.latest.price)[0]?.store;
  const downAtFloor =
    movements.find((m) => m.dir === "down" && m.storeName === floorStoreName) ||
    movements.find((m) => m.dir === "down") ||
    movements.sort((a, b) => a.storeName.localeCompare(b.storeName))[0];
  if (downAtFloor.dir === "down" && floorStoreName)
    downAtFloor.storeName = floorStoreName;
  return downAtFloor;
}

export function ProductDetailsPage({
  id,
  candidate,
  token,
  notify,
  onCompare,
  compareIds,
  onBack,
  onTrack,
  onSignIn,
}: ProductDetailsPageProps) {
  const v = useLocale();

  const [product, setProduct] = useState<ProductResponse | null>(null);
  useEffect(() => {
    if (product?.name) document.title = `${product.name} · ${APP_NAME}`;
  }, [product?.name]);

  const [offers, setOffers] = useState<ListingResponse[]>([]);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [trackings, setTrackings] = useState<TrackingResponse[]>([]);
  const [targetBusyId, setTargetBusyId] = useState<string | null>(null);
  const [histories, setHistories] = useState<
    Record<string, PriceObservation[]>
  >({});
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySampled, setHistorySampled] = useState(false);
  const [historyReloadTick, setHistoryReloadTick] = useState(0);
  const [pageError, setPageError] = useState("");
  const [range, setRange] = useState("30");
  const [hiddenStores, setHiddenStores] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"offers" | "history">("offers");
  const [chartZoom, setChartZoom] = useState(1);
  const [specSheet, setSpecSheet] = useState<SpecSheet | null>(null);
  const [specsResearching, setSpecsResearching] = useState(false);

  async function saveTarget(
    tracking: TrackingResponse,
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const targetPrice = Number(data.get("targetPrice"));
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      notify(v.previewInvalidPrice);
      return;
    }
    setTargetBusyId(tracking.trackingId);
    try {
      const saved = await apiFetch(`/v1/tracking/${tracking.trackingId}`, {
        method: "PUT",
        body: JSON.stringify({
          targetPrice,
          notifyEmail: data.has("notifyEmail"),
          notifyFurtherDecreaseEmail: data.has("notifyFurtherDecreaseEmail"),
        }),
      });
      setTrackings((items) =>
        items.map((t) =>
          t.trackingId === tracking.trackingId ? { ...t, ...saved } : t,
        ),
      );
      notify(v.trackingPreferencesSaved);
    } catch (err) {
      notify(err instanceof Error ? err.message : v.actionFailed);
    } finally {
      setTargetBusyId(null);
    }
  }

  async function toggleOfferExclusion(listing: ListingResponse) {
    try {
      await apiFetch(
        `/v1/listings/${listing.listingId}/${listing.isExcluded ? "include" : "exclude"}`,
        { method: "PATCH" },
      );
      setOffers((items) =>
        items.map((t) =>
          t.listingId === listing.listingId
            ? { ...t, isExcluded: !listing.isExcluded }
            : t,
        ),
      );
      notify(
        listing.isExcluded
          ? v.productOfferIncluded(listing.storeName)
          : v.productOfferExcluded(listing.storeName),
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : v.actionFailed);
    }
  }
  async function researchSpecs() {
    if (!token || !asUuid(id) || specsResearching) return;
    setSpecsResearching(true);
    try {
      const sheet = await apiFetch(`/v1/products/${id}/specs/generate`, {
        method: "POST",
      });
      if (sheet) setSpecSheet(sheet);
    } catch {
      notify(v.compareSpecsFailed);
    } finally {
      setSpecsResearching(false);
    }
  }

  useEffect(() => {
    let alive = true;
    setPageError("");
    setTargetBusyId(null);
    setProduct(null);
    setOffers([]);
    setOffersLoaded(false);
    setTrackings([]);
    setSpecSheet(null);
    if (!asUuid(id)) {
      if (id === "candidate" && candidate?.productUrl) {
        setProduct({
          productId: null,
          name: candidate.name || "",
          description: candidate.description || "",
          brand: "",
          category: "",
          storeName: candidate.storeName || "",
          productUrl: candidate.productUrl,
          primaryImage: candidate.imageUrl || "",
          lowestPrice: candidate.price,
          currency: candidate.currency || "",
          isVerified: candidate.isVerified === true,
        });
        setOffersLoaded(true);
        return () => {
          alive = false;
        };
      }
      setPageError(v.productDetailsUnavailable);
      return () => {
        alive = false;
      };
    }
    (async () => {
      try {
        const loaded = await apiFetch(`/v1/products/${id}`);
        if (!alive) return;
        setProduct(loaded);
        const [listings, trackingRows, sheet] = await Promise.all([
          apiFetch(`/v1/listings/by-product/${id}`).catch(() => []),
          token
            ? apiFetch("/v1/tracking").catch(() => [])
            : Promise.resolve([]),
          apiFetch(`/v1/products/${id}/specs`).catch(() => null),
        ]);
        if (!alive) return;
        setSpecSheet(sheet || null);
        setTrackings(
          Array.isArray(trackingRows)
            ? trackingRows.filter((t: TrackingResponse) => t.productId === id)
            : [],
        );
        setOffers(
          (Array.isArray(listings) ? listings : []).sort(
            (a: ListingResponse, b: ListingResponse) =>
              (a.currencyCode || "").localeCompare(b.currencyCode || "") ||
              (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity),
          ),
        );
        setOffersLoaded(true);
      } catch (err) {
        alive &&
          setPageError(
            err instanceof Error ? err.message : v.productDetailsUnavailable,
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, token, candidate, v.productDetailsUnavailable]);

  useEffect(() => {
    if (!offers.length) {
      setHistories({});
      setHistoryError("");
      setHistorySampled(false);
      setHistoryLoading(false);
      return;
    }
    let alive = true;
    let failures = 0;
    let sampled = false;
    setHistories({});
    setHistoryError("");
    setHistorySampled(false);
    setHistoryLoading(true);
    const rangeQuery = (page: number) => {
      const params = new URLSearchParams({
        Page: String(page),
        Size: String(HISTORY_PAGE_SIZE),
      });
      if (range !== "all")
        params.set(
          "From",
          new Date(Date.now() - Number(range) * DAY_MS).toISOString(),
        );
      return params;
    };
    Promise.all(
      offers.map(async (listing) => {
        try {
          const first = await apiFetch(
            `/v1/price-history/by-listing/${listing.listingId}?${rangeQuery(0)}`,
          );
          const pageCount = Math.ceil(first.totalElements / HISTORY_PAGE_SIZE);
          if (pageCount <= 1) return [listing.listingId, first.content];
          sampled = sampled || pageCount > 3;
          const extraPages = [
            ...new Set([0, Math.floor((pageCount - 1) / 2), pageCount - 1]),
          ].filter((page) => page > 0);
          const rest = await Promise.all(
            extraPages.map(async (page) => {
              try {
                return (
                  await apiFetch(
                    `/v1/price-history/by-listing/${listing.listingId}?${rangeQuery(page)}`,
                  )
                ).content;
              } catch {
                failures += 1;
                return [];
              }
            }),
          );
          const merged = [first.content, ...rest].flat();
          return [
            listing.listingId,
            [
              ...new Map(
                merged.map((obs: PriceObservation) => [obs.id, obs]),
              ).values(),
            ].sort(
              (a: PriceObservation, b: PriceObservation) =>
                +new Date(a.recordedAt) - +new Date(b.recordedAt),
            ),
          ];
        } catch {
          failures += 1;
          return [listing.listingId, []];
        }
      }),
    )
      .then((results) => {
        if (!alive) return;
        setHistories(Object.fromEntries(results));
        setHistorySampled(sampled);
        if (failures) setHistoryError(v.productHistoryLoadFailed);
      })
      .finally(() => {
        alive && setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [offers, range, historyReloadTick, v.productHistoryLoadFailed]);

  const visibleOffers = offers;
  const verifiedOffers = visibleOffers.filter(
    (listing) =>
      !listing.isExcluded &&
      offerTrust(listing) === "verified" &&
      (listing.currentPrice ?? 0) > 0,
  );
  const verifiedCurrencies = new Set(
    verifiedOffers.map((listing) => listing.currencyCode),
  );
  const currentOffer =
    verifiedCurrencies.size === 1
      ? verifiedOffers.sort(
          (a, b) => (a.currentPrice ?? 0) - (b.currentPrice ?? 0),
        )[0]
      : null;
  const isCatalog = Boolean(asUuid(id));
  const heroPrice = isCatalog
    ? offersLoaded
      ? (currentOffer?.currentPrice ?? null)
      : null
    : (product?.lowestPrice ?? null);
  const heroCurrency =
    currentOffer?.currencyCode ||
    product?.currencyCode ||
    product?.currency ||
    null;
  const heroPriceLabel = currentOffer
    ? v.productPriceSource(currentOffer.storeName)
    : isCatalog
      ? v.productPriceNotConfirmed
      : product?.isVerified
        ? v.productPriceSource(product.storeName ?? "")
        : v.productOfferUnverified;

  const currentOfferHistory = currentOffer
    ? (histories[currentOffer.listingId] ?? []).toSorted(
        (a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt),
      )
    : [];
  const previousObservation =
    currentOfferHistory.length >= 2
      ? currentOfferHistory[currentOfferHistory.length - 2]
      : null;
  const heroOldPrice =
    currentOffer &&
    previousObservation &&
    previousObservation.price > (currentOffer.currentPrice ?? 0)
      ? previousObservation.price
      : null;

  const trackableOffer =
    currentOffer ||
    visibleOffers.find(
      (listing) =>
        listing.isActive && !listing.isExcluded && listing.productUrl,
    ) ||
    null;
  const canTrack = !isCatalog || offers.some((listing) => listing.isActive);
  const trackDisabled = isCatalog ? !trackableOffer : !product?.productUrl;
  const handleTrack = () => {
    if (!isCatalog) {
      if (candidate) onTrack({ ...candidate });
      return;
    }
    if (trackableOffer) {
      onTrack({
        name: product?.name,
        productUrl: trackableOffer.productUrl,
        imageUrl: product?.primaryImage,
        storeName: trackableOffer.storeName,
        currency: trackableOffer.currencyCode,
        price: trackableOffer.currentPrice,
        isVerified: trackableOffer.hasVerifiedPrice,
        existingProductId: id,
      });
    }
  };

  const since = range === "all" ? 0 : Date.now() - Number(range) * DAY_MS;
  const observations: StoreObservation[] = visibleOffers
    .flatMap((listing) =>
      (histories[listing.listingId] || [])
        .filter((obs) => +new Date(obs.recordedAt) >= since)
        .map((obs) => ({ ...obs, storeName: listing.storeName })),
    )
    .sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
  const visible = observations.filter(
    (obs) => !hiddenStores.includes(obs.storeName),
  );
  const storeNames = [...new Set(observations.map((obs) => obs.storeName))];
  const chartCurrencies = [...new Set(visible.map((obs) => obs.currencyCode))];

  const spanStart = visible.length ? +new Date(visible[0].recordedAt) : 0;
  const spanEnd = visible.length
    ? +new Date(visible[visible.length - 1].recordedAt)
    : 0;
  const windowAt = (factor: number) =>
    factor <= 1
      ? visible
      : visible.filter(
          (obs) =>
            +new Date(obs.recordedAt) >=
            spanEnd - (spanEnd - spanStart) / factor,
        );

  const zoom =
    visible.length < 2 || windowAt(chartZoom).length >= 2 ? chartZoom : 1;
  const chartRows = windowAt(zoom);
  const canZoomIn =
    zoom < MAX_CHART_ZOOM &&
    spanEnd > spanStart &&
    windowAt(zoom * 2).length >= 2;

  const minPrice = chartRows.length
    ? Math.min(...chartRows.map((o) => o.price))
    : 0;
  const maxPrice = chartRows.length
    ? Math.max(...chartRows.map((o) => o.price))
    : 0;
  const minTime = chartRows.length ? +new Date(chartRows[0].recordedAt) : 0;
  const maxTime = chartRows.length
    ? +new Date(chartRows[chartRows.length - 1].recordedAt)
    : 0;

  const xPct = (obs: StoreObservation) =>
    maxTime === minTime
      ? 50
      : ((+new Date(obs.recordedAt) - minTime) / (maxTime - minTime)) * 84 + 8;
  const yPct = (obs: StoreObservation) =>
    maxPrice === minPrice
      ? 50
      : 92 - ((obs.price - minPrice) / (maxPrice - minPrice)) * 84;

  const displayCurrency = useContext(DisplayCurrencyContext);
  const chartTarget =
    displayCurrency || heroCurrency || chartCurrencies[0] || "";
  const [chartRates, setChartRates] = useState<Record<string, number>>({});
  const chartCurrencyKey = chartCurrencies.join("|");
  useEffect(() => {
    if (!chartTarget || !chartCurrencyKey) return;
    let alive = true;
    Promise.all(
      chartCurrencyKey.split("|").map((code) =>
        convertCurrency(1, code, chartTarget)
          .then((rate) => [code, rate?.amount ?? 1] as const)
          .catch(() => [code, 1] as const),
      ),
    ).then((entries) => {
      if (alive) setChartRates(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [chartTarget, chartCurrencyKey]);
  const chartDisplay = (price: number, code: string) => {
    const rate = chartRates[code];
    return rate != null && chartTarget
      ? formatDisplayValue(price * rate, chartTarget)
      : formatDisplayValue(price, code);
  };

  const seriesPath = () =>
    chartRows
      .map(
        (obs, index) => `${index === 0 ? "M" : "L"} ${xPct(obs)} ${yPct(obs)}`,
      )
      .join(" ");
  const bestListingId =
    visibleOffers.find(
      (listing) =>
        listing.currentPrice != null &&
        listing.isActive &&
        !listing.isExcluded &&
        offerTrust(listing) === "verified",
    )?.listingId ?? null;
  const movement = product ? heroMovement(observations) : null;

  if (pageError) {
    return (
      <EmptyState
        title={v.productDetailsUnavailable}
        body={pageError}
        action={
          <button className="button button--tonal" onClick={onBack}>
            {v.compareBackToProducts}
          </button>
        }
      />
    );
  }
  if (!product) {
    return <div className="loading-surface">{v.productDetailsLoading}</div>;
  }

  const tabs = [
    {
      key: "offers" as const,
      label: v.productNavOffers,
      count: visibleOffers.length,
    },
    {
      key: "history" as const,
      label: v.productNavHistory,
      count: visible.length,
    },
  ];

  return (
    <div className="product-detail-page">
      <button className="back-link product-detail-back" onClick={onBack}>
        <Icon name="chevron-left" />
        {v.compareBackToProducts}
      </button>

      <header className="product-hero">
        <div className="product-hero-media">
          <div className="product-hero-image">
            {product.primaryImage ? (
              <ProductImage
                source={product.primaryImage}
                baseUrl={product.productUrl ?? undefined}
                productId={product.productId ?? undefined}
                alt={product.name}
                layered
                fallback={PRODUCT_ILLUSTRATION_FALLBACK}
              />
            ) : (
              <div
                className="product-hero-image-fallback"
                role="img"
                aria-label={v.productImageMissing}
              >
                <img
                  className="product-illustration"
                  src={PRODUCT_ILLUSTRATION_FALLBACK}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                />
              </div>
            )}
          </div>
        </div>
        <div className="product-hero-main">
          <h1>{product.name}</h1>
          <div className="product-hero-meta">
            {[product.brand, product.category, product.storeName]
              .filter(Boolean)
              .map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
          </div>
          <div className="product-hero-price">
            <span className="product-hero-price-label">
              {v.productBestPriceLabel}
            </span>
            <strong>
              <Price
                amount={heroPrice}
                currencyCode={heroCurrency ?? undefined}
                className={undefined}
              />
            </strong>
            {heroOldPrice != null ? (
              <del className="product-hero-old-price">
                <span>{v.productWasLabel}</span>
                <Price
                  amount={heroOldPrice}
                  currencyCode={heroCurrency ?? undefined}
                  className={undefined}
                />
              </del>
            ) : null}
            {currentOffer?.dealQuality?.score != null ? (
              <span
                className="deal-quality deal-quality--scored"
                title={v.dealQualityTooltip}
              >
                {v.dealQualityScoreLabel(currentOffer.dealQuality.score)}
              </span>
            ) : null}
          </div>
          <p className="product-hero-price-source">{heroPriceLabel}</p>
          {movement ? (
            <p
              className={`product-detail-movement product-detail-movement--${movement.dir} comic-note ${movement.dir === "down" ? "comic-note--green" : "comic-note--warm"}`}
            >
              <strong>
                {movement.dir === "down" ? "↓" : "↑"} {movement.percent}%
              </strong>
              <span>
                {movement.dir === "down"
                  ? v.productMovementDown(movement.percent, movement.since)
                  : v.productMovementUp(movement.percent, movement.since)}
              </span>
            </p>
          ) : null}
          <div className="product-hero-cta">
            {canTrack ? (
              <button
                className="button button--primary"
                disabled={trackDisabled}
                onClick={handleTrack}
              >
                {v.discoverTrackPrice}
              </button>
            ) : null}
            {isCatalog ? (
              <button
                className="button button--tonal"
                data-compare-state={compareIds.includes(id) ? "in" : "out"}
                onClick={() => onCompare(id)}
              >
                {compareIds.includes(id)
                  ? v.discoverRemoveCompare
                  : v.discoverAddCompare}
              </button>
            ) : null}
          </div>
          <div className="product-hero-actions">
            <a
              className="quiet-link"
              href={isCatalog ? "#offers" : (product.productUrl ?? "#")}
              target={isCatalog ? undefined : "_blank"}
              rel="noreferrer"
              onClick={isCatalog ? () => setActiveTab("offers") : undefined}
            >
              {v.compareViewProduct} <Icon name="external" />
            </a>
          </div>
          {trackings.length ? (
            <div className="product-detail-targets">
              <strong>{v.colTargetPrice}</strong>
              {trackings.map((tracking) => (
                <span
                  key={tracking.trackingId}
                  className={`status ${tracking.isActive ? "status--active" : "status--paused"}`}
                >
                  <i />
                  <Price
                    amount={tracking.targetPrice}
                    currencyCode={tracking.currencyCode}
                    className={undefined}
                  />
                  {" · "}
                  {tracking.isActive ? v.statusTracking : v.statusPaused}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="product-tabs">
        <div
          className="product-tablist"
          role="tablist"
          aria-label={v.breadcrumbProductDetails}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              data-tab={tab.key}
              className="product-tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const current =
                  event.currentTarget.dataset.tab === "history"
                    ? "history"
                    : "offers";
                const next =
                  event.key === "Home"
                    ? "offers"
                    : event.key === "End"
                      ? "history"
                      : current === "offers"
                        ? "history"
                        : "offers";
                setActiveTab(next);
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
                  ?.focus();
              }}
            >
              {tab.label}
              {tab.count ? (
                <span className="product-tab-count" aria-hidden="true">
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <section
          className="content-section product-detail-section product-offers-section"
          id="offers"
          role="tabpanel"
          aria-labelledby="tab-offers"
          hidden={activeTab !== "offers"}
        >
          <div className="product-offers-toolbar">
            <p className="product-offers-heading">{v.storeOffersHeading}</p>
            <span className="results-count">
              {v.productOffersCount(visibleOffers.length)}
            </span>
          </div>
          {visibleOffers.length ? (
            <div className="table-wrap">
              <table className="offers-table">
                <thead>
                  <tr>
                    <th>{v.colStore}</th>
                    <th>{v.colCurrentPrice}</th>
                    <th>{v.productLastChecked}</th>
                    <th>{v.dealQualityHeading}</th>
                    <th>{v.colStatus}</th>
                    <th>{v.productMonitoring}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOffers.map((listing) => {
                    const trust = offerTrust(listing);
                    const isBest = listing.listingId === bestListingId;
                    return (
                      <tr
                        key={listing.listingId}
                        className={isBest ? "offer-row--best" : ""}
                        data-offer-row=""
                        data-offer-store={listing.storeName}
                        data-offer-checked={formatDateOnly(
                          listing.lastScrapedAt,
                        )}
                        data-offer-trust={trust}
                      >
                        <td>
                          <a
                            className="product-link"
                            href={listing.productUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {listing.storeName}
                            <Icon name="external" />
                          </a>
                          {isBest ? (
                            <span className="offer-best-flag">
                              {v.productOfferBest}
                            </span>
                          ) : null}
                        </td>
                        <td className="price-cell">
                          <div className="offer-price">
                            <Price
                              amount={listing.currentPrice}
                              currencyCode={listing.currencyCode}
                              className={undefined}
                            />
                            <span
                              className={`offer-flag offer-flag--${trust}`}
                              title={
                                trust === "verified"
                                  ? v.productOfferVerifiedHint
                                  : trust === "stale"
                                    ? v.productOfferStaleHint
                                    : trust === "unverified"
                                      ? v.productOfferUnverifiedHint
                                      : v.productOfferNoPriceHint
                              }
                            >
                              {trust === "verified"
                                ? v.productOfferVerified
                                : trust === "stale"
                                  ? v.productOfferStale
                                  : trust === "unverified"
                                    ? v.productOfferUnverified
                                    : trust === "inactive"
                                      ? v.productInactiveListing
                                      : v.productOfferNoPrice}
                            </span>
                          </div>
                        </td>
                        <td>{formatDateOnly(listing.lastScrapedAt)}</td>
                        <td>
                          <span
                            className={`deal-quality${listing.dealQuality?.score != null ? " deal-quality--scored" : ""}`}
                            title={v.dealQualityTooltip}
                            aria-label={
                              listing.dealQuality?.score != null
                                ? `${v.dealQualityScoreLabel(listing.dealQuality.score)}. ${v.dealQualityTooltip}`
                                : v.dealQualityInsufficient
                            }
                          >
                            {listing.dealQuality?.score != null
                              ? v.dealQualityScoreLabel(
                                  listing.dealQuality.score,
                                )
                              : v.dealQualityInsufficient}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status ${listing.isActive ? "status--active" : "status--paused"}`}
                          >
                            <i />
                            {listing.isActive
                              ? v.productActiveListing
                              : v.productInactiveListing}
                          </span>
                        </td>
                        <td>
                          {token && trackings.length > 0 ? (
                            <button
                              className="text-button"
                              disabled={!listing.isActive}
                              onClick={() => toggleOfferExclusion(listing)}
                            >
                              {listing.isExcluded
                                ? v.productIncludeOffer
                                : v.productExcludeOffer}
                            </button>
                          ) : listing.isExcluded ? (
                            <span className="status status--paused comic-note comic-note--warm">
                              <i />
                              {v.productExcluded}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={v.productNoStoredOffers}
              body={v.productNoStoredOffersBody}
              action={undefined}
            />
          )}
        </section>

        <section
          className="content-section product-detail-section product-history-section"
          id="history"
          role="tabpanel"
          aria-labelledby="tab-history"
          hidden={activeTab !== "history"}
        >
          <div className="product-history-toolbar">
            <Dropdown
              className="filter-dropdown range-select"
              ariaLabel={v.priceHistory}
              placeholder={undefined}
              value={range}
              options={[
                { value: "7", label: v.productHistoryPeriod7 },
                { value: "30", label: v.compareHistoryPeriod30 },
                { value: "90", label: v.compareHistoryPeriod90 },
                { value: "365", label: v.compareHistoryPeriod365 },
                { value: "all", label: v.compareHistoryPeriodAll },
              ]}
              onChange={(next: string) => setRange(next)}
            />
            {visible.length && chartCurrencies.length === 1 ? (
              <div
                className="chart-zoom"
                role="group"
                aria-label={v.productChartZoom}
              >
                <button
                  type="button"
                  className="chart-zoom-btn"
                  aria-label={v.productChartZoomOut}
                  title={v.productChartZoomOut}
                  disabled={zoom <= 1}
                  onClick={() => setChartZoom(Math.max(1, zoom / 2))}
                >
                  <Icon name="minus" />
                </button>
                <button
                  type="button"
                  className="chart-zoom-btn"
                  aria-label={v.productChartZoomIn}
                  title={v.productChartZoomIn}
                  disabled={!canZoomIn}
                  onClick={() =>
                    setChartZoom(Math.min(MAX_CHART_ZOOM, zoom * 2))
                  }
                >
                  <Icon name="plus" />
                </button>
              </div>
            ) : null}
          </div>
          <p className="sr-only" aria-live="polite">
            {v.productChartWindow(chartRows.length, visible.length)}
          </p>

          {storeNames.length > 1 ? (
            <div
              className="history-store-controls"
              role="group"
              aria-label={v.productHistoryByStore}
            >
              {storeNames.map((storeName, index) => (
                <label key={storeName}>
                  <input
                    type="checkbox"
                    checked={!hiddenStores.includes(storeName)}
                    onChange={() =>
                      setHiddenStores((current) =>
                        current.includes(storeName)
                          ? current.filter((s) => s !== storeName)
                          : [...current, storeName],
                      )
                    }
                  />
                  <i className={`legend-dot legend-dot--${index % 4}`} />
                  {storeName}
                </label>
              ))}
            </div>
          ) : null}

          {historyLoading ? (
            <div
              className="skeleton-box"
              style={{ height: "220px", borderRadius: "8px", margin: "14px 0" }}
            />
          ) : historyError && !visible.length ? (
            <EmptyState
              title={v.compareHistoryHeading}
              body={historyError}
              action={
                <button
                  className="button button--quiet"
                  onClick={() => setHistoryReloadTick((tick) => tick + 1)}
                >
                  {v.tryAgain}
                </button>
              }
            />
          ) : visible.length ? (
            <>
              {historyError ? (
                <p className="verification-note" role="status">
                  {v.productHistoryPartial}
                </p>
              ) : null}
              {historySampled ? (
                <p className="verification-note" role="status">
                  {v.productHistorySampled}
                </p>
              ) : null}
              {chartCurrencies.length === 1 ? (
                <>
                  <div className="history-chart" id="price-history-chart">
                    <div className="chart-scale" aria-hidden="true">
                      <span>{chartDisplay(maxPrice, chartCurrencies[0])}</span>
                      <span>
                        {chartDisplay(
                          (minPrice + maxPrice) / 2,
                          chartCurrencies[0],
                        )}
                      </span>
                      <span>{chartDisplay(minPrice, chartCurrencies[0])}</span>
                    </div>
                    <div
                      className="chart-plot"
                      role="group"
                      aria-label={v.productHistoryChartLabel(
                        formatShortDateOrDash(chartRows[0].recordedAt),
                        formatShortDateOrDash(
                          chartRows[chartRows.length - 1].recordedAt,
                        ),
                        chartDisplay(minPrice, chartCurrencies[0]),
                        chartDisplay(maxPrice, chartCurrencies[0]),
                      )}
                    >
                      <svg
                        className="chart-series"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <path
                          d={seriesPath()}
                          fill="none"
                          stroke={SERIES_COLORS[0]}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {chartRows.map((obs, index) => (
                        <button
                          key={`${obs.id}-${index}`}
                          type="button"
                          className="chart-point"
                          tabIndex={-1}
                          data-align={
                            index === 0
                              ? "start"
                              : index === chartRows.length - 1
                                ? "end"
                                : "center"
                          }
                          style={{
                            left: `${xPct(obs)}%`,
                            top: `${yPct(obs)}%`,
                            backgroundColor:
                              SERIES_COLORS[
                                Math.max(0, storeNames.indexOf(obs.storeName)) %
                                  SERIES_COLORS.length
                              ],
                          }}
                          aria-label={`${chartDisplay(obs.price, obs.currencyCode)} · ${formatShortDateOrDash(obs.recordedAt)} · ${obs.storeName}`}
                        >
                          <span className="chart-point-tip" aria-hidden="true">
                            <strong>
                              {chartDisplay(obs.price, obs.currencyCode)}
                            </strong>
                            <span>{formatShortDateOrDash(obs.recordedAt)}</span>
                            <span>{obs.storeName}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="chart-date-labels" aria-hidden="true">
                      <span>
                        {formatDateTime(
                          chartRows[0].recordedAt,
                          CHART_DATE_OPTIONS,
                        )}
                      </span>
                      {chartRows.length > 2 ? (
                        <span>
                          {formatDateTime(
                            chartRows[Math.floor((chartRows.length - 1) / 2)]
                              .recordedAt,
                            CHART_DATE_OPTIONS,
                          )}
                        </span>
                      ) : null}
                      <span>
                        {formatDateTime(
                          chartRows[chartRows.length - 1].recordedAt,
                          CHART_DATE_OPTIONS,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="history-legend">
                    {storeNames.map((storeName, index) => (
                      <span key={storeName}>
                        <i className={`legend-dot legend-dot--${index % 4}`} />
                        {storeName}
                      </span>
                    ))}
                  </div>
                  {chartRows.length > 0 ? (
                    <div className="chart-checks">
                      <p className="chart-checks-heading">
                        {v.productChartChecks}
                      </p>
                      <ul>
                        {chartRows.toReversed().map((obs, index) => (
                          <li key={`${obs.id}-${obs.storeName}-${index}`}>
                            <span className="chart-checks-date">
                              {formatDateOnly(obs.recordedAt)}
                            </span>
                            <span className="chart-checks-store">
                              {obs.storeName}
                            </span>
                            <strong>
                              {chartDisplay(obs.price, obs.currencyCode)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="history-observation-list">
                  {visible.map((obs) => (
                    <p key={`${obs.id}-${obs.recordedAt}`}>
                      {chartDisplay(obs.price, obs.currencyCode)} ·{" "}
                      {formatShortDateOrDash(obs.recordedAt)} · {obs.storeName}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title={v.productHistoryEmpty}
              body={v.productHistoryEmptyBody}
              action={undefined}
            />
          )}
        </section>
      </div>

      {isCatalog || product.description ? (
        <section
          className="content-section product-detail-section product-details-section"
          id="details"
        >
          <div className="section-heading">
            <div>
              <h2>{v.productTabDetails}</h2>
            </div>
          </div>
          <div className="product-details-facts">
            <div>
              <span>{v.productMarketCurrency}</span>
              <strong>{heroCurrency || v.compareUnavailable}</strong>
            </div>
            <div>
              <span>{v.storeOffersHeading}</span>
              <strong>{v.productOffersCount(visibleOffers.length)}</strong>
            </div>
            {currentOffer ? (
              <div>
                <span>{v.colStore}</span>
                <strong>{currentOffer.storeName}</strong>
              </div>
            ) : null}
            <div>
              <span>{v.compareBrand}</span>
              <strong>{product.brand || v.compareUnavailable}</strong>
            </div>
            <div>
              <span>{v.compareCategory}</span>
              <strong>{product.category || v.compareUnavailable}</strong>
            </div>
          </div>

          {isCatalog ? (
            <div className="product-specs">
              <div className="product-specs-head">
                <h3>{v.productSpecsHeading}</h3>
                {specSheet?.fields?.length ? (
                  <span className="product-specs-note comic-note comic-note--blue">
                    {v.compareSpecsAiNote}
                  </span>
                ) : null}
              </div>
              {specSheet?.fields?.length ? (
                <>
                  <dl className="product-spec-grid">
                    {specSheet.fields.map((field, index) => (
                      <div key={`${field.label}-${index}`}>
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {specSheet.updatedAt ? (
                    <p className="product-specs-source">
                      {v.productSpecsUpdated(
                        formatDateOnly(specSheet.updatedAt),
                      )}
                    </p>
                  ) : null}
                </>
              ) : token ? (
                <div className="product-specs-empty">
                  <div>
                    <strong>{v.productSpecsEmpty}</strong>
                    <p>{v.productSpecsEmptyBody}</p>
                  </div>
                  <button
                    type="button"
                    className="button button--tonal button--small"
                    disabled={specsResearching}
                    onClick={researchSpecs}
                  >
                    <Icon name="search" />
                    {specsResearching
                      ? v.compareResearching
                      : v.compareResearchSpecs}
                  </button>
                </div>
              ) : (
                <p className="product-specs-signin">{v.compareSpecsSignIn}</p>
              )}
            </div>
          ) : null}

          {product.description ? (
            <p className="product-details-description">{product.description}</p>
          ) : null}
        </section>
      ) : null}

      <section
        className="content-section product-detail-section tracking-preference-section"
        id="alerts"
      >
        <div className="section-heading">
          <div>
            <h2>{v.trackingPreferencesHeading}</h2>
          </div>
        </div>
        {trackings.length ? (
          <div className="tracking-preference-grid">
            {trackings.map((tracking) => (
              <form
                key={tracking.trackingId}
                className="tracking-preference-card"
                onSubmit={(event) => saveTarget(tracking, event)}
              >
                <div className="tracking-preference-title">
                  <strong>
                    {tracking.storeName ||
                      tracking.marketCountry ||
                      product.name}
                  </strong>
                  <span
                    className={`status ${tracking.isActive ? "status--active" : "status--paused"}`}
                  >
                    <i />
                    {tracking.isActive ? v.statusTracking : v.statusPaused}
                  </span>
                </div>
                <label
                  className="field-label"
                  htmlFor={`target-${tracking.trackingId}`}
                >
                  {v.colTargetPrice} · {tracking.currencyCode}
                </label>
                <input
                  className="field"
                  id={`target-${tracking.trackingId}`}
                  name="targetPrice"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  defaultValue={tracking.targetPrice}
                  required
                />
                <fieldset className="email-preferences">
                  <legend>{v.previewEmailPreferences}</legend>
                  <label>
                    <input
                      type="checkbox"
                      name="notifyEmail"
                      defaultChecked={tracking.notifyEmail}
                    />
                    {v.trackingEmailTarget}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="notifyFurtherDecreaseEmail"
                      defaultChecked={
                        tracking.notifyFurtherDecreaseEmail ?? false
                      }
                    />
                    {v.trackingEmailFurther}
                  </label>
                </fieldset>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={targetBusyId === tracking.trackingId}
                >
                  {v.trackingSavePreferences}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyState
            title={v.productTabAlerts}
            body={token ? v.productAlertsTabEmpty : v.signIn}
            action={
              token ? undefined : (
                <button className="button button--blue" onClick={onSignIn}>
                  {v.settingsTrackingSignIn}
                </button>
              )
            }
          />
        )}
      </section>

      <div className="product-mobile-buybar">
        <div className="product-mobile-buybar-info">
          <strong>
            <Price
              amount={heroPrice}
              currencyCode={heroCurrency ?? undefined}
              className={undefined}
            />
          </strong>
        </div>
        {isCatalog ? (
          <button
            type="button"
            className="product-mobile-compare"
            aria-pressed={compareIds.includes(id)}
            aria-label={
              compareIds.includes(id)
                ? v.discoverRemoveCompare
                : v.discoverAddCompare
            }
            data-in-compare={compareIds.includes(id) ? "" : undefined}
            onClick={() => onCompare(id)}
          >
            <Icon name="compare" />
          </button>
        ) : null}
        {canTrack ? (
          <button
            className="button button--primary"
            disabled={trackDisabled}
            onClick={handleTrack}
          >
            {v.discoverTrackPrice}
          </button>
        ) : null}
      </div>
    </div>
  );
}
