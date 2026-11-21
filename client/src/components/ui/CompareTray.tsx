import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ProductResponse } from "../../lib/api-types";
import { Icon } from "./Icon";
import { PRODUCT_ILLUSTRATION_FALLBACK, ProductImage } from "./ProductImage";
import { useLocale } from "../../lib/i18n-context";
import "./compare-tray.css";

interface CompareTrayProps {
  ids: string[];
  onRemove: (productId: string) => void;
  onClear: () => void;
  onOpenCompare: () => void;
  raised?: boolean;
}

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
      data-count={ids.length}
      aria-label={strings.compareTrayLabel}
    >
      <span className="compare-tray-lead" aria-hidden="true">
        <Icon name="compare" />
        {strings.navCompare}
      </span>
      <div className="compare-tray-items">
        {ids.map((id) => {
          const product = cacheRef.current[id];
          return (
            <div
              className="compare-tray-item"
              key={id}
              title={product?.name ?? id}
            >
              <ProductImage
                source={product?.primaryImage}
                baseUrl={undefined}
                productId={id}
                alt=""
                loading="lazy"
                layered
                fallback={PRODUCT_ILLUSTRATION_FALLBACK}
              />
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
      {!canCompare && (
        <p className="compare-tray-hint">{strings.compareNeedTwo}</p>
      )}
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
