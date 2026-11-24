// @ts-nocheck
import { Fragment, useEffect, useRef, useState } from "react";
import { CompareHistoryChart } from "./CompareHistoryChart";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import {
  PRODUCT_ILLUSTRATION_FALLBACK,
  ProductImage,
} from "../../components/ui/ProductImage";
import { SkeletonTable } from "../../components/ui/skeletons";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/i18n-context";
import "./compare-page.css";

export function ComparePage({
  token,
  ids,
  onRemove,
  onClear,
  onAdd,
  onOpen,
  onDiscover,
  notify,
}) {
  const copy = useLocale();
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState({});
  const [trackings, setTrackings] = useState({});
  const [specs, setSpecs] = useState({});
  const [researching, setResearching] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchInput = useRef(null);

  useEffect(() => {
    let active = true;
    if (!ids.length) {
      setProducts([]);
      setOffers({});
      setTrackings({});
      setSpecs({});
      return;
    }

    setLoading(true);
    Promise.all(
      ids.map(async (id) => {
        const [product, listings, sheet] = await Promise.all([
          apiFetch(`/v1/products/${id}`).catch(() => null),
          apiFetch(`/v1/listings/by-product/${id}`).catch(() => []),
          apiFetch(`/v1/products/${id}/specs`).catch(() => null),
        ]);
        return { id, product, listings, sheet };
      }),
    )
      .then(async (rows) => {
        if (!active) return;
        setProducts(rows.flatMap((row) => (row.product ? [row.product] : [])));
        setOffers(
          Object.fromEntries(rows.map((row) => [row.id, row.listings])),
        );
        setSpecs(Object.fromEntries(rows.map((row) => [row.id, row.sheet])));
        if (rows.some((row) => !row.product)) notify(copy.compareError);
        if (!token) return setTrackings({});
        try {
          const rows = await apiFetch("/v1/tracking");
          if (active) {
            const grouped: Record<string, typeof rows> = {};
            for (const row of rows) {
              if (!ids.includes(row.productId)) continue;
              (grouped[row.productId] ||= []).push(row);
            }
            setTrackings(grouped);
          }
        } catch {
          if (active) setTrackings({});
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [ids, token, notify, copy.compareError]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchFailed(false);
      return;
    }
    let active = true;
    setSearching(true);
    setSearchFailed(false);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ query: term, Size: "6" });
      apiFetch(`/v1/products?${params}`)
        .then((page) => {
          if (!active) return;
          setSearchResults(Array.isArray(page?.content) ? page.content : []);
        })
        .catch(() => {
          if (!active) return;
          setSearchResults([]);
          setSearchFailed(true);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const addableResults = searchResults.filter(
    (item) => !ids.includes(item.productId),
  );

  const focusSearch = () => {
    searchInput.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    searchInput.current?.focus({ preventScroll: true });
  };

  const addFromSearch = (productId) => {
    onAdd(productId);
    setSearchTerm("");
    setSearchResults([]);
  };

  const currentOffers = (productId) =>
    (offers[productId] || []).filter(
      (offer) =>
        offer.isActive && !offer.isExcluded && offer.currentPrice != null,
    );
  const bestOffer = (productId) =>
    currentOffers(productId).toSorted(
      (a, b) => a.currentPrice - b.currentPrice,
    )[0];

  const researchSpecs = async (productId) => {
    if (!token || researching[productId]) return;
    setResearching((state) => ({ ...state, [productId]: true }));
    try {
      const sheet = await apiFetch(`/v1/products/${productId}/specs/generate`, {
        method: "POST",
      });
      if (sheet) setSpecs((state) => ({ ...state, [productId]: sheet }));
    } catch {
      notify(copy.compareSpecsFailed);
    } finally {
      setResearching((state) => ({ ...state, [productId]: false }));
    }
  };

  const pricedProducts = products.filter(
    (product) => product.lowestPrice != null,
  );
  const bestPrice =
    pricedProducts.length > 1
      ? Math.min(...pricedProducts.map((product) => product.lowestPrice))
      : null;

  const comparisonGroups = [
    {
      label: copy.compareGroupPricing,
      rows: [
        [
          copy.compareLatestPrice,
          (product) => {
            const isBest =
              bestPrice != null && product.lowestPrice === bestPrice;
            return (
              <>
                <Price
                  amount={product.lowestPrice}
                  currencyCode={product.currencyCode || product.currency}
                />
                {isBest ? (
                  <span className="compare-best-chip">
                    {copy.compareBestBadge}
                  </span>
                ) : null}
              </>
            );
          },
        ],
        [
          copy.compareTargetPrice,
          (product) => {
            const target = (trackings[product.productId] || [])[0];
            return target ? (
              <>
                <Price
                  amount={target.targetPrice}
                  currencyCode={target.currencyCode}
                />{" "}
                · {target.isActive ? copy.statusTracking : copy.statusPaused}
              </>
            ) : (
              copy.compareNotTracked
            );
          },
        ],
        [
          copy.compareOffers,
          (product) =>
            copy.compareOfferCount(currentOffers(product.productId).length),
        ],
        [
          copy.compareBestStore,
          (product) => bestOffer(product.productId)?.storeName || "—",
        ],
        [
          copy.compareMarket,
          (product) => bestOffer(product.productId)?.marketCountry || "—",
        ],
      ],
    },
    {
      label: copy.compareGroupDetails,
      rows: [
        [
          copy.compareBrand,
          (product) => product.brand || copy.compareUnavailable,
        ],
        [
          copy.compareCategory,
          (product) => product.category || copy.compareUnavailable,
        ],
        [
          copy.compareViewProduct,
          (product) => (
            <button
              className="text-button"
              onClick={() => onOpen(product.productId)}
            >
              {copy.compareViewProduct} <Icon name="arrow" />
            </button>
          ),
        ],
      ],
    },
    {
      label: copy.compareGroupTrend,
      rows: [
        [
          copy.priceHistory,
          (product) => {
            const currency = product.currencyCode || product.currency || "USD";
            const rows = currentOffers(product.productId).filter(
              (offer) => offer.currencyCode === currency,
            );
            return rows.length ? (
              <CompareHistoryChart listings={rows} currencyCode={currency} />
            ) : (
              <p className="dialog-help">
                {copy.compareNoHistoryForCurrency(currency)}
              </p>
            );
          },
        ],
      ],
    },
  ];

  const specLabels = [
    ...new Set(
      products
        .flatMap((product) => specs[product.productId]?.fields || [])
        .map((field) => field.label),
    ),
  ];
  const specsRows = specLabels.map((label) => [
    label,
    (product) => {
      const field = (specs[product.productId]?.fields || []).find(
        (f) => f.label === label,
      );
      return field ? field.value : copy.compareUnavailable;
    },
  ]);
  if (products.some((product) => !specs[product.productId])) {
    specsRows.unshift([
      copy.compareResearchSpecs,
      (product) => {
        if (specs[product.productId]) return "";
        if (!token) return copy.compareSpecsSignIn;
        return (
          <button
            className="text-button"
            disabled={researching[product.productId]}
            onClick={() => researchSpecs(product.productId)}
          >
            {researching[product.productId]
              ? copy.compareResearching
              : copy.compareResearchSpecs}
          </button>
        );
      },
    ]);
  }
  if (products.length) {
    comparisonGroups.push({
      label: copy.compareSpecsGroup,
      note: copy.compareSpecsAiNote,
      rows: specsRows,
    });
  }
  const columnCount = products.length + 1 + (ids.length < 3 ? 1 : 0);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{copy.compareEyebrow}</div>
          <h1>{copy.compareHeading}</h1>
        </div>
        <div className="compare-heading-side">
          <span className="compare-limit comic-note comic-note--blue">
            {ids.length} of 3 {copy.navCompare}
          </span>
          {ids.length > 0 && onClear ? (
            <button type="button" className="text-button" onClick={onClear}>
              {copy.compareClearAll}
            </button>
          ) : null}
        </div>
      </div>
      {ids.length < 3 ? (
        <section
          className="compare-search"
          aria-label={copy.compareSearchLabel}
        >
          <div className="compare-search-bar">
            <Icon name="search" />
            <input
              ref={searchInput}
              type="search"
              className="compare-search-input"
              value={searchTerm}
              placeholder={copy.compareSearchPlaceholder}
              aria-label={copy.compareSearchPlaceholder}
              autoComplete="off"
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchTerm("");
              }}
            />
            {searching ? (
              <span className="compare-search-status" role="status">
                {copy.compareSearching}
              </span>
            ) : searchTerm ? (
              <button
                type="button"
                className="compare-search-clear"
                aria-label={copy.compareClearAll}
                onClick={() => {
                  setSearchTerm("");
                  searchInput.current?.focus();
                }}
              >
                <Icon name="close" />
              </button>
            ) : null}
          </div>
          {searchTerm.trim().length >= 2 ? (
            addableResults.length ? (
              <ul className="compare-search-results">
                {addableResults.map((item) => (
                  <li key={item.productId}>
                    <span className="compare-search-thumb">
                      <ProductImage
                        source={item.primaryImage}
                        baseUrl=""
                        productId={item.productId}
                        alt={item.name}
                        loading="lazy"
                        fallback={PRODUCT_ILLUSTRATION_FALLBACK}
                      />
                    </span>
                    <span className="compare-search-info">
                      <strong>{item.name}</strong>
                      <small>
                        {[item.brand, item.category]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                    <span className="compare-search-price">
                      <Price
                        amount={item.lowestPrice}
                        currencyCode={item.currencyCode || item.currency}
                      />
                    </span>
                    <button
                      type="button"
                      className="button button--small compare-search-add"
                      aria-label={`${copy.compareAddProduct} ${item.name}`}
                      onClick={() => addFromSearch(item.productId)}
                    >
                      <Icon name="plus" />
                      {copy.compareAddProduct}
                    </button>
                  </li>
                ))}
              </ul>
            ) : searching ? null : (
              <p className="compare-search-empty" role="status">
                {searchFailed
                  ? copy.compareSearchFailed
                  : copy.compareSearchEmpty(searchTerm.trim())}
              </p>
            )
          ) : null}
        </section>
      ) : null}
      {loading ? (
        <div className="compare-table-wrap">
          <div className="compare-skeleton-head">
            {Array.from(
              { length: Math.max(2, Math.min(ids.length, 3)) },
              (_, index) => (
                <div className="skeleton-box" key={index} />
              ),
            )}
          </div>
          <SkeletonTable rows={5} />
        </div>
      ) : products.length ? (
        <div className="compare-table-wrap">
          <table className="compare-table compare-table--spec">
            <caption className="sr-only">{copy.compareHeading}</caption>
            <thead>
              <tr>
                <th scope="col" className="compare-label-col">
                  <span className="sr-only">{copy.compareProduct}</span>
                </th>
                {products.map((product) => {
                  const best = bestOffer(product.productId);
                  return (
                    <th
                      scope="col"
                      key={product.productId}
                      className="compare-product-col"
                    >
                      <div className="compare-head-card">
                        <button
                          className="compare-head-remove"
                          aria-label={`${copy.compareRemove} ${product.name}`}
                          onClick={() => onRemove(product.productId)}
                        >
                          <Icon name="close" />
                        </button>
                        <div className="compare-head-image">
                          <ProductImage
                            source={product.primaryImage}
                            baseUrl={product.productUrl || ""}
                            productId={product.productId}
                            alt={product.name}
                            fallback={PRODUCT_ILLUSTRATION_FALLBACK}
                          />
                        </div>
                        <button
                          className="compare-head-name"
                          onClick={() => onOpen(product.productId)}
                        >
                          {product.name}
                        </button>
                        <Price
                          className="compare-head-price"
                          amount={product.lowestPrice}
                          currencyCode={
                            product.currencyCode || product.currency
                          }
                        />
                        <small>
                          {copy.compareOfferCount(
                            currentOffers(product.productId).length,
                          )}
                          {best ? ` · ${best.storeName}` : ""}
                        </small>
                      </div>
                    </th>
                  );
                })}
                {ids.length < 3 ? (
                  <th scope="col" className="compare-add-col">
                    <button className="compare-add-tile" onClick={focusSearch}>
                      <Icon name="plus" />
                      {copy.compareAddColumn}
                    </button>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {comparisonGroups.map((group) => (
                <Fragment key={group.label}>
                  <tr className="compare-group-row">
                    <th colSpan={columnCount} scope="colgroup">
                      {group.label}
                      {group.note ? (
                        <span className="compare-group-note">{group.note}</span>
                      ) : null}
                    </th>
                  </tr>
                  {group.rows.map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {products.map((product) => (
                        <td key={product.productId}>{value(product)}</td>
                      ))}
                      {ids.length < 3 ? (
                        <td className="compare-add-cell" />
                      ) : null}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <p className="compare-swipe-hint">{copy.compareSwipeHint}</p>
        </div>
      ) : (
        <EmptyState
          className="compare-empty"
          icon="compare"
          title={copy.compareEmpty}
          body={copy.compareEmptyBody}
          action={
            onDiscover ? (
              <button
                type="button"
                className="button button--primary"
                onClick={onDiscover}
              >
                {copy.compareBrowseProducts} <Icon name="arrow" />
              </button>
            ) : null
          }
        />
      )}
    </>
  );
}
