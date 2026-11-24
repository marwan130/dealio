import { useMemo } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import {
  PRODUCT_ILLUSTRATION_FALLBACK,
  ProductImage,
} from "../../components/ui/ProductImage";
import { EditorialPhoto } from "../../components/ui/EditorialPhoto";
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

const CATEGORY_TILES = [
  { id: "electronics", query: "Electronics" },
  { id: "mobiles", query: "Mobiles & Tablets" },
  { id: "computers", query: "Laptops & Computers" },
  { id: "home", query: "Home & Kitchen" },
  { id: "gaming", query: "Gaming" },
  { id: "audio", query: "Audio" },
  { id: "fashion", query: "Fashion" },
  { id: "beauty", query: "Beauty & Health" },
  { id: "sports", query: "Sports & Outdoors" },
  { id: "toys", query: "Toys & Games" },
  { id: "books", query: "Books & Media" },
  { id: "groceries", query: "Groceries" },
] as const;

type CategoryTileId = (typeof CATEGORY_TILES)[number]["id"];

function CategoryMark({ id }: { id: CategoryTileId }) {
  return (
    <img
      className="home-cat-mark"
      src={`/dealio-context/illustrations/cat-${id}.svg`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
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
    sports: strings.dealCategorySports,
    toys: strings.dealCategoryToys,
    books: strings.dealCategoryBooks,
    groceries: strings.dealCategoryGroceries,
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
        className="home-mosaic"
        aria-label={strings.overviewCategoriesHeading}
      >
        <EditorialPhoto className="home-editorial-photo" image="headphones" />
        <div className="home-category-panel">
          <h2>{strings.overviewCategoriesHeading}</h2>
          <div className="home-categories">
            {CATEGORY_TILES.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className="home-cat-tile"
                onClick={() => onSearch(tile.query)}
              >
                <CategoryMark id={tile.id} />
                <span>{localizeCategory(tile.id, strings)}</span>
              </button>
            ))}
          </div>
        </div>
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
                fallback={PRODUCT_ILLUSTRATION_FALLBACK}
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
                  <ProductImage
                    source={dropImages[drop.productId]}
                    baseUrl={undefined}
                    productId={drop.productId}
                    alt={drop.productName}
                    layered
                    loading="lazy"
                    fallback={PRODUCT_ILLUSTRATION_FALLBACK}
                  />
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
                  <ProductImage
                    source={product.imageUrl}
                    baseUrl={undefined}
                    productId={product.productId}
                    alt={product.name}
                    layered
                    loading="lazy"
                    fallback={PRODUCT_ILLUSTRATION_FALLBACK}
                  />
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
                  <ProductImage
                    source={product.imageUrl}
                    baseUrl={undefined}
                    productId={product.productId}
                    alt={product.name}
                    layered
                    loading="lazy"
                    fallback={PRODUCT_ILLUSTRATION_FALLBACK}
                  />
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
