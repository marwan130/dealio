import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useLocale } from "../../lib/i18n-context";

interface ScrollShelfProps {
  heading: ReactNode;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ScrollShelf({
  heading,
  children,
  className = "",
  ariaLabel,
}: ScrollShelfProps) {
  const strings = useLocale();
  const shelfRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const page = (direction: -1 | 1) => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const amount = shelf.clientWidth * 0.85;
    shelf.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  useEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const sync = () => {
      const offset = Math.abs(shelf.scrollLeft);
      const max = Math.abs(shelf.scrollWidth - shelf.clientWidth);
      setCanPrev(offset > 2);
      setCanNext(offset < max - 2);
    };
    sync();
    shelf.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(shelf);
    return () => {
      shelf.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, []);

  return (
    <section className={`shelf ${className}`.trim()}>
      <div className="shelf-header">
        <div className="shelf-heading">{heading}</div>
        <div className="shelf-arrows">
          <button
            type="button"
            className="shelf-arrow"
            aria-label={strings.discoverHomeScrollPrev}
            onClick={() => page(-1)}
            disabled={!canPrev}
          >
            <Icon name="chevron-left" />
          </button>
          <button
            type="button"
            className="shelf-arrow"
            aria-label={strings.discoverHomeScrollNext}
            onClick={() => page(1)}
            disabled={!canNext}
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      <div
        ref={shelfRef}
        className="shelf-track"
        role="region"
        aria-label={ariaLabel ?? undefined}
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  );
}
