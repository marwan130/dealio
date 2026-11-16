import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ProductResponse } from "../../lib/api-types";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductImage";
import { useLocale } from "../../lib/i18n-context";
import "./compare-tray.css";

interface CompareTrayProps {
  ids: string[];
  onRemove: (productId: string) => void;
  onClear: () => void;
  onOpenCompare: () => void;
  /** True on phone sized product pages, where a bottom buy bar already sits. */
  raised?: boolean;
}

// Persistent tray of products picked for comparison. Shows the selected
// products on every page with a direct jump to the compare page, the way
// retail compare flows work.
export function CompareTray({
  ids,
  onRemove,
  onClear,
  onOpenCompare,
  raised,
}: CompareTrayProps) {
  const strings = useLocale();
  const cacheRef = useRef<Record<string, ProductResponse | null>>({});
  const [, forceRender] = useState(0);
  const idsKey = ids.join(",");

  useEffect(() => {
    const missing = ids.filter((id) => !(id in cacheRef.current));
    if (!missing.length) return;
    let alive = true;
    Promise.all(
      missing.map(async (id) => {
        const product = await apiFetch(`/v1/products/${id}`).catch(() => null);
        cacheRef.current[id] = product;
      }),
    ).then(() => {
      if (alive) forceRender((tick) => tick + 1);
    });
    return () => {
      alive = false;
    };
  }, [idsKey]);

  if (!ids.length) return null;
  const canCompare = ids.length >= 2;

  return (
    <aside
      className={`compare-tray${raised ? " compare-tray--raised" : ""}`}
      aria-label={strings.compareTrayLabel}
    >
      <div className="compare-tray-items">
        {ids.map((id) => {
          const product = cacheRef.current[id];
          return (
            <div
              className="compare-tray-item"
              key={id}
              title={product?.name ?? id}
            >
              {product?.primaryImage ? (
                <ProductImage
                  source={product.primaryImage}
                  baseUrl={undefined}
                  productId={id}
                  alt=""
                  loading="lazy"
                  layered
                />
              ) : (
                <span
                  className="compare-tray-thumb-fallback"
                  aria-hidden="true"
                >
                  {(product?.name ?? id).trim().charAt(0).toUpperCase()}
                </span>
              )}
              <button
                type="button"
                className="compare-tray-remove"
                aria-label={`${strings.compareRemove} ${product?.name ?? ""}`}
                onClick={() => onRemove(id)}
              >
                <Icon name="close" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="compare-tray-actions">
        <span className="compare-tray-count">
          {strings.compareCount(ids.length)}
        </span>
        <button type="button" className="text-button" onClick={onClear}>
          {strings.compareClearAll}
        </button>
        <button
          type="button"
          className="button button--primary button--small"
          disabled={!canCompare}
          onClick={onOpenCompare}
          title={canCompare ? undefined : strings.compareNeedTwo}
        >
          {strings.compareNow} <Icon name="arrow" />
        </button>
      </div>
    </aside>
  );
}
