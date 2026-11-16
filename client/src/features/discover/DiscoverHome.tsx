import { useMemo } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";
import { ScrollShelf } from "../../components/ui/ScrollShelf";
import type {
  DiscoveryOverviewResponse,
  RecentPriceDrop,
} from "../../lib/api-types";
import { useLocale } from "../../lib/i18n-context";
import "./discover-home.css";

interface DiscoverHomeProps {
  onSearch: (query: string) => void;
  drops: RecentPriceDrop[];
  dropImages: Record<string, string>;
  dropsLoading: boolean;
  overview: DiscoveryOverviewResponse | null;
  overviewNote: string;
  onOpen: (productId: string) => void;
  onCompare: (productId: string) => void;
  compareIds: string[];
}

// Same query strings the discover results flow already uses for these categories.
const CATEGORY_TILES = [
  { id: "electronics", query: "Electronics" },
  { id: "mobiles", query: "Mobiles & Tablets" },
  { id: "computers", query: "Laptops & Computers" },
  { id: "home", query: "Home & Kitchen" },
  { id: "gaming", query: "Gaming" },
  { id: "audio", query: "Audio" },
  { id: "fashion", query: "Fashion" },
  { id: "beauty", query: "Beauty & Health" },
] as const;

type CategoryTileId = (typeof CATEGORY_TILES)[number]["id"];

// Minimal stroke glyphs matching the existing Icon set style (24x24, currentColor).
const CATEGORY_GLYPHS: Record<CategoryTileId, string> = {
  electronics: "M3 5h18v11H3zM8 20h8M12 16v4",
  mobiles:
    "M8 2.5h8a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1zM11 18.5h2",
  computers: "M4 5.5h16v9.5H4zM2 18.5h20",
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
  gaming:
    "M6.5 6h11a4 4 0 0 1 4 4v4.5a3 3 0 0 1-5.4 1.8L14.6 14h-5.2l-1.5 2.3A3 3 0 0 1 2.5 14.5V10a4 4 0 0 1 4-4zM6 10v3M4.5 11.5h3M15 10.5h.01M17.5 12.5h.01",
  audio:
    "M4 18v-5a8 8 0 0 1 16 0v5M4 13h2.5v6H6a2 2 0 0 1-2-2zM20 13h-2.5v6H18a2 2 0 0 0 2-2z",
  fashion: "M8.5 3.5 4 6.5l2 3 2-1v11h8V8.5l2 1 2-3-4.5-3a3.5 3.5 0 0 1-7 0z",
  beauty:
    "M12 20.5S5 15.7 5 10.3a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 5.4-7 10.2-7 10.2z",
};

function CategoryGlyph({ id }: { id: CategoryTileId }) {
  return (
    <svg
      className="home-cat-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={CATEGORY_GLYPHS[id]} />
    </svg>
  );
}

function localizeCategory(
  tileId: CategoryTileId,
  strings: ReturnType<typeof useLocale>,
) {
  const map: Record<CategoryTileId, string> = {
    electronics: strings.dealCategoryElectronics,
    mobiles: strings.dealCategoryMobiles,
    computers: strings.dealCategoryComputers,
    home: strings.dealCategoryHome,
    gaming: strings.dealCategoryGaming,
    audio: strings.dealCategoryAudio,
    fashion: strings.dealCategoryFashion,
    beauty: strings.dealCategoryBeauty,
  };
  return map[tileId];
}

function ShelfSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="home-card-skeleton" key={index} aria-hidden="true">
          <div className="home-card-skeleton-photo skeleton-box" />
          <div className="skeleton-box" style={{ width: "80%", height: 13 }} />
          <div className="skeleton-box" style={{ width: "45%", height: 13 }} />
        </div>
      ))}
    </>
  );
}

// Store-front home state of the Discover page (no search query set).
export function DiscoverHome({
  onSearch,
  drops,
  dropImages,
  dropsLoading,
  overview,
  overviewNote,
  onOpen,
  onCompare,
  compareIds,
}: DiscoverHomeProps) {
  const strings = useLocale();

  const dealOfDay = useMemo(() => {
    if (!drops.length) return null;
    return drops.reduce(
      (best, drop) => (drop.dropPercent > best.dropPercent ? drop : best),
      drops[0],
    );
  }, [drops]);

  const shelfDrops = useMemo(
    () =>
      (dealOfDay
        ? drops.filter((drop) => drop.listingId !== dealOfDay.listingId)
        : drops
      ).slice(0, 12),
    [drops, dealOfDay],
  );

  const trending = overview?.trendingProducts ?? [];
  const recentlyAdded = overview?.recentlyAddedProducts ?? [];
  const stores = overview?.recentlyAddedStores ?? [];
  const overviewLoading = !overview && !overviewNote;

  return (
    <div className="home-page">
      <h1 className="sr-only">{strings.navDiscover}</h1>
      <section
        className="home-categories"
        aria-label={strings.overviewCategoriesHeading}
      >
        {CATEGORY_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="home-cat-tile"
            onClick={() => onSearch(tile.query)}
          >
            <CategoryGlyph id={tile.id} />
            <span>{localizeCategory(tile.id, strings)}</span>
          </button>
        ))}
      </section>

      {dealOfDay ? (
        <section className="home-deal-day" aria-labelledby="home-deal-heading">
          <div className="section-heading">
            <div>
              <h2 id="home-deal-heading">
                {strings.discoverHomeDealOfDayHeading}
              </h2>
            </div>
          </div>
          <article className="home-deal-card">
            <div className="home-deal-media">
              <span className="home-deal-badge">
                -{Math.round(dealOfDay.dropPercent)}%
              </span>
              <ProductImage
                source={dropImages[dealOfDay.productId]}
                baseUrl={undefined}
                productId={dealOfDay.productId}
                alt={dealOfDay.productName}
                layered
              />
            </div>
            <div className="home-deal-body">
              <span className="home-deal-store">{dealOfDay.storeName}</span>
              <button
                type="button"
                className="home-deal-name"
                onClick={() => onOpen(dealOfDay.productId)}
              >
                {dealOfDay.productName}
              </button>
              <div className="home-deal-pricing">
                <Price
                  className="home-deal-price"
                  amount={dealOfDay.currentPrice}
                  currencyCode={dealOfDay.currencyCode}
                />
                <del className="home-deal-was">
                  <Price
                    amount={dealOfDay.previousPrice}
                    currencyCode={dealOfDay.currencyCode}
                    className={undefined}
                  />
                </del>
              </div>
              <div className="home-deal-savings">
                {strings.discoverSave}{" "}
                <Price
                  amount={dealOfDay.previousPrice - dealOfDay.currentPrice}
                  currencyCode={dealOfDay.currencyCode}
                  className={undefined}
                />
              </div>
              <div className="home-deal-actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => onOpen(dealOfDay.productId)}
                >
                  {strings.discoverViewDeal} <Icon name="arrow" />
                </button>
                <button
                  type="button"
                  className={`button ${compareIds.includes(dealOfDay.productId) ? "button--tonal" : "button--quiet"}`}
                  onClick={() => onCompare(dealOfDay.productId)}
                >
                  {compareIds.includes(dealOfDay.productId)
                    ? strings.discoverCompared
                    : strings.discoverCompare}
                </button>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {shelfDrops.length || dropsLoading ? (
        <ScrollShelf
          heading={
            <>
              <div className="eyebrow">{strings.overviewTrendingEyebrow}</div>
              <h2>{strings.discoverTopPriceDrops}</h2>
            </>
          }
          ariaLabel={strings.discoverTopPriceDrops}
        >
          {dropsLoading ? (
            <ShelfSkeleton count={4} />
          ) : (
            shelfDrops.map((drop) => (
              <article className="home-card" key={drop.listingId}>
                <button
                  type="button"
                  className="home-card-media"
                  onClick={() => onOpen(drop.productId)}
                >
                  {dropImages[drop.productId] ? (
                    <ProductImage
                      source={dropImages[drop.productId]}
                      baseUrl={undefined}
                      productId={drop.productId}
                      alt={drop.productName}
                      layered
                      loading="lazy"
                    />
                  ) : (
                    /* Imageless drops get the shared Anton monogram so the
                     empty media slot reads intentional at every width. */
                    <span
                      className="home-card-thumb-fallback"
                      aria-hidden="true"
                    >
                      {(drop.productName || "?").trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="home-card-badge">
                    -{Math.round(drop.dropPercent)}%
                  </span>
                </button>
                <div className="home-card-body">
                  <button
                    type="button"
                    className="home-card-name"
                    onClick={() => onOpen(drop.productId)}
                  >
                    {drop.productName}
                  </button>
                  <span className="home-card-meta">
                    {drop.storeName} · {drop.currencyCode}
                  </span>
                  <div className="home-card-pricing">
                    <Price
                      className="home-card-price"
                      amount={drop.currentPrice}
                      currencyCode={drop.currencyCode}
                    />
                    <del className="home-card-was">
                      <Price
                        amount={drop.previousPrice}
                        currencyCode={drop.currencyCode}
                        className={undefined}
                      />
                    </del>
                  </div>
                  <button
                    type="button"
                    className="text-button home-card-view"
                    onClick={() => onOpen(drop.productId)}
                  >
                    {strings.discoverViewDeal} <Icon name="arrow" />
                  </button>
                </div>
              </article>
            ))
          )}
        </ScrollShelf>
      ) : null}

      {trending.length || overviewLoading ? (
        <ScrollShelf
          heading={
            <>
              <div className="eyebrow">{strings.overviewTrendingEyebrow}</div>
              <h2>{strings.overviewTrendingHeading}</h2>
            </>
          }
          ariaLabel={strings.overviewTrendingHeading}
        >
          {overviewLoading ? (
            <ShelfSkeleton count={4} />
          ) : (
            trending.map((product) => (
              <article className="home-card" key={product.productId}>
                <button
                  type="button"
                  className="home-card-media"
                  onClick={() => onOpen(product.productId)}
                >
                  {product.imageUrl ? (
                    <ProductImage
                      source={product.imageUrl}
                      baseUrl={undefined}
                      productId={product.productId}
                      alt={product.name}
                      layered
                      loading="lazy"
                    />
                  ) : null}
                </button>
                <div className="home-card-body">
                  <button
                    type="button"
                    className="home-card-name"
                    onClick={() => onOpen(product.productId)}
                  >
                    {product.name}
                  </button>
                  <span className="home-card-meta">
                    {product.category ? `${product.category} · ` : ""}
                    {strings.overviewNewTracking(product.newTrackingsInWindow)}
                  </span>
                </div>
              </article>
            ))
          )}
        </ScrollShelf>
      ) : null}

      {recentlyAdded.length || overviewLoading ? (
        <ScrollShelf
          heading={
            <>
              <h2>{strings.overviewProductsHeading}</h2>
            </>
          }
          ariaLabel={strings.overviewProductsHeading}
        >
          {overviewLoading ? (
            <ShelfSkeleton count={4} />
          ) : (
            recentlyAdded.map((product) => (
              <article className="home-card" key={product.productId}>
                <button
                  type="button"
                  className="home-card-media"
                  onClick={() => onOpen(product.productId)}
                >
                  {product.imageUrl ? (
                    <ProductImage
                      source={product.imageUrl}
                      baseUrl={undefined}
                      productId={product.productId}
                      alt={product.name}
                      layered
                      loading="lazy"
                    />
                  ) : null}
                </button>
                <div className="home-card-body">
                  <button
                    type="button"
                    className="home-card-name"
                    onClick={() => onOpen(product.productId)}
                  >
                    {product.name}
                  </button>
                  <span className="home-card-meta">
                    {product.category ? `${product.category} · ` : ""}
                    {strings.discoverHomeOfferCount(product.verifiedOfferCount)}
                  </span>
                </div>
              </article>
            ))
          )}
        </ScrollShelf>
      ) : null}

      {stores.length || overviewLoading ? (
        <ScrollShelf
          heading={
            <>
              <h2>{strings.overviewStoresHeading}</h2>
            </>
          }
          ariaLabel={strings.overviewStoresHeading}
          className="home-stores"
        >
          {overviewLoading ? (
            <ShelfSkeleton count={4} />
          ) : (
            stores.map((store) => (
              <button
                key={store.storeId}
                type="button"
                className="home-store-tile"
                onClick={() => onSearch(store.name)}
                title={strings.globalSearchLabel}
              >
                <span className="home-store-mark" aria-hidden="true">
                  {(store.name || "?")
                    .replace(/^www\./i, "")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="home-store-name">{store.name}</span>
                <span className="home-store-meta">{store.country}</span>
                <span className="home-store-meta">
                  {strings.discoverHomeOfferCount(store.verifiedOfferCount)}
                </span>
              </button>
            ))
          )}
        </ScrollShelf>
      ) : null}

      {!dropsLoading && !drops.length ? (
        <EmptyState
          className="home-empty"
          title={strings.discoverNoRecentDrops}
          body={strings.discoverNoRecentDropsBody}
          action={undefined}
        />
      ) : null}
      {overviewNote ? (
        <p className="verification-note" role="status">
          {overviewNote}
        </p>
      ) : null}
    </div>
  );
}
