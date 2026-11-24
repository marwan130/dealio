import { DisplayCurrencyContext, useLocale } from "../../lib/i18n-context";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import { MetricStat } from "../../components/ui/MetricStat";
import { Price } from "../../components/ui/Price";
import {
  ProductImage,
  productIllustration,
} from "../../components/ui/ProductImage";
import { EditorialPhoto } from "../../components/ui/EditorialPhoto";
import { RecentDropsSection } from "../discover/RecentDropsSection";
import { apiFetch } from "../../lib/api";
import type {
  NotificationResponse,
  ProductFeedItem,
  RecentPriceDrop,
  TrackingResponse,
} from "../../lib/api-types";
import { formatDateOnly, formatShortDateOrDash } from "../../lib/format";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import "./dashboard-home.css";

const FEED_PAGE_SIZE = 8;
const SEED_KEY = "dealio-feed-seed";
const PAGES_KEY = "dealio-feed-pages";
const SEEN_KEY = "dealio-feed-seen";
const ITEMS_KEY = "dealio-feed-items";
const DONE_KEY = "dealio-feed-done";
const ALERTS_PANEL_SIZE = 5;

function sessionSeed(): string {
  let seed: string | null = null;
  try {
    seed = sessionStorage.getItem(SEED_KEY);
  } catch {
    seed = null;
  }
  if (!seed) {
    seed =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      sessionStorage.setItem(SEED_KEY, seed);
    } catch {
      /* storage can be unavailable */
    }
  }
  return seed;
}

function newSessionSeed(): string {
  const seed =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    sessionStorage.setItem(SEED_KEY, seed);
  } catch {
    /* storage can be unavailable */
  }
  return seed;
}

function readSeen(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* ignore */
  }
}

function readFeedItems(): ProductFeedItem[] {
  try {
    const rows = JSON.parse(sessionStorage.getItem(ITEMS_KEY) || "[]");
    return Array.isArray(rows)
      ? rows.filter((item: ProductFeedItem) => item?.productId).slice(-500)
      : [];
  } catch {
    return [];
  }
}

function writeFeedItems(items: ProductFeedItem[]) {
  try {
    sessionStorage.setItem(ITEMS_KEY, JSON.stringify(items.slice(-500)));
  } catch {
    /* storage can be unavailable */
  }
}

function readFeedPage(): number {
  try {
    return Math.max(0, Number(sessionStorage.getItem(PAGES_KEY)) || 0);
  } catch {
    return 0;
  }
}

function readFeedDone(): boolean {
  try {
    return sessionStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function fetchFeedPage({
  seed,
  page,
  signal,
}: {
  seed: string;
  page: number;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    sortBy: "random",
    randomSeed: seed,
    Page: String(page),
    Size: String(FEED_PAGE_SIZE),
  });
  return apiFetch(`/v1/products?${params}`, signal ? { signal } : undefined);
}

interface DashboardPageProps {
  token?: string | null;
  openProduct: (item: string | ProductFeedItem) => void;
  onDiscover: () => void;
  onSignIn: () => void;
  notify: (message: string) => void;
  addValue?: string;
  setAddValue?: (value: string) => void;
  onSubmit?: (event: React.FormEvent) => void;
  previewBusy?: boolean;
  onCompare?: (productId: string) => void;
  compareIds?: string[];
}

export function DashboardPage({
  token,
  openProduct,
  onDiscover,
  onSignIn,
  notify,
  onCompare,
  compareIds = [],
}: DashboardPageProps) {
  const v = useLocale();
  const displayCurrency = useContext(DisplayCurrencyContext);

  const [alerts, setAlerts] = useState<TrackingResponse[]>([]);
  const [unread, setUnread] = useState(0);
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [drops, setDrops] = useState<RecentPriceDrop[]>([]);

  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    [],
  );
  const [notificationsError, setNotificationsError] = useState("");

  const refreshTrackings = useCallback(() => {
    return apiFetch(
      `/v1/tracking?displayCurrency=${encodeURIComponent(displayCurrency)}`,
    )
      .then(setAlerts)
      .catch((err) =>
        notify(err instanceof Error ? err.message : v.actionFailed),
      );
  }, [displayCurrency, notify, v.actionFailed]);

  async function trackingAction(
    tracking: TrackingResponse,
    action: "deactivate" | "activate" | "remove",
  ) {
    try {
      action === "remove"
        ? await apiFetch(`/v1/tracking/${tracking.trackingId}`, {
            method: "DELETE",
          })
        : await apiFetch(`/v1/tracking/${tracking.trackingId}/${action}`, {
            method: "PATCH",
          });
      notify(
        action === "remove"
          ? v.trackingRemoved
          : action === "activate"
            ? v.trackingResumed
            : v.trackingPaused,
      );
      void refreshTrackings();
    } catch (err) {
      notify(err instanceof Error ? err.message : v.actionFailed);
    }
  }

  async function markNotificationRead(notificationId: number) {
    try {
      await apiFetch(`/v1/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      setNotifications((items) =>
        items.map((n) =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event("pt-unread-changed"));
    } catch (err) {
      notify(err instanceof Error ? err.message : v.notificationUpdateFailed);
    }
  }

  const [feedItems, setFeedItems] = useState<ProductFeedItem[]>(readFeedItems);
  const [feedState, setFeedState] = useState(() => {
    if (readFeedItems().length) return readFeedDone() ? "done" : "ready";
    return readFeedDone() ? "empty" : "loading";
  });
  const [feedError, setFeedError] = useState("");
  const feedPageRef = useRef(readFeedPage());
  const seedRef = useRef(sessionSeed());
  const feedBusyRef = useRef(false);
  const feedControllerRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef(
    new Set([...readSeen(), ...readFeedItems().map((item) => item.productId)]),
  );
  const feedDoneRef = useRef(readFeedDone());

  useEffect(() => {
    let alive = true;
    apiFetch("/v1/price-history/drops/recent?size=3")
      .then((list: RecentPriceDrop[]) => {
        if (alive) setDrops(list);
      })
      .catch(() => {
        if (alive) setDrops([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setAlerts([]);
      setUnread(0);
      setNotifications([]);
      setNotificationsError("");
      setTrackError("");
      setTrackBusy(false);
      return;
    }
    let alive = true;
    setTrackBusy(true);
    setTrackError("");
    Promise.all([
      apiFetch(
        `/v1/tracking?displayCurrency=${encodeURIComponent(displayCurrency)}`,
      ),
      apiFetch("/v1/notifications/unread-count"),
    ])
      .then(([trackings, count]) => {
        if (alive) {
          setAlerts(trackings);
          setUnread(count);
          setTrackError("");
        }
      })
      .catch((err) => {
        if (!alive) return;
        setTrackError(
          err instanceof Error ? err.message : v.dashboardTrackingLoadError,
        );
        notify(
          err instanceof Error ? err.message : v.dashboardTrackingLoadError,
        );
      })
      .finally(() => {
        if (alive) setTrackBusy(false);
      });
    apiFetch(`/v1/notifications?Page=0&Size=${ALERTS_PANEL_SIZE}`)
      .then((page) => {
        if (alive) {
          setNotifications(page?.content ?? []);
          setNotificationsError("");
        }
      })
      .catch(() => {
        if (alive) setNotificationsError(v.dashAlertsLoadError);
      });
    return () => {
      alive = false;
    };
  }, [
    token,
    notify,
    displayCurrency,
    v.dashboardTrackingLoadError,
    v.dashAlertsLoadError,
  ]);

  const atTarget = alerts.filter(
    (t) =>
      t.currentPriceInTargetCurrency != null &&
      t.currentPriceInTargetCurrency <= t.targetPrice,
  ).length;
  const nearTarget = alerts.filter(
    (t) =>
      t.currentPriceInTargetCurrency != null &&
      t.currentPriceInTargetCurrency > t.targetPrice &&
      t.currentPriceInTargetCurrency <= t.targetPrice * 1.1,
  ).length;

  const loadFeedPage = useCallback(
    async (page = feedPageRef.current) => {
      if (feedBusyRef.current || feedDoneRef.current) return;
      feedBusyRef.current = true;
      const controller = new AbortController();
      feedControllerRef.current = controller;
      setFeedError("");
      setFeedState((current) =>
        current === "ready" || current === "idle" ? "busy" : "loading",
      );
      try {
        const result = await fetchFeedPage({
          seed: seedRef.current,
          page,
          signal: controller.signal,
        });
        const content = Array.isArray(result?.content) ? result.content : [];
        const fresh = content.filter((item: ProductFeedItem) => {
          if (!item?.productId || seenRef.current.has(item.productId))
            return false;
          seenRef.current.add(item.productId);
          return true;
        });
        writeSeen([...seenRef.current]);
        setFeedItems((items) => {
          const next = [...items, ...fresh];
          writeFeedItems(next);
          return next;
        });
        feedPageRef.current = page + 1;
        feedDoneRef.current = !!result?.last;
        try {
          sessionStorage.setItem(PAGES_KEY, String(page + 1));
          sessionStorage.setItem(DONE_KEY, result?.last ? "1" : "0");
        } catch {
          /* storage can be unavailable */
        }
        setFeedState(
          !content.length && page === 0
            ? "empty"
            : result?.last
              ? "done"
              : "idle",
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setFeedError(err instanceof Error ? err.message : v.dashFeedError);
        setFeedState("error");
      } finally {
        if (feedControllerRef.current === controller) {
          feedBusyRef.current = false;
          feedControllerRef.current = null;
        }
      }
    },
    [v.dashFeedError],
  );

  useEffect(() => {
    if (!feedDoneRef.current) loadFeedPage();
    return () => {
      feedControllerRef.current?.abort();
      feedBusyRef.current = false;
    };
  }, [loadFeedPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (feedState !== "idle" && feedState !== "ready") return;
        loadFeedPage();
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feedItems, feedState, loadFeedPage]);

  function restartFeed() {
    setFeedError("");
    feedControllerRef.current?.abort();
    feedBusyRef.current = false;
    feedDoneRef.current = false;
    seedRef.current = newSessionSeed();
    feedPageRef.current = 0;
    seenRef.current = new Set();
    writeSeen([]);
    setFeedItems([]);
    writeFeedItems([]);
    try {
      sessionStorage.setItem(PAGES_KEY, "0");
      sessionStorage.setItem(DONE_KEY, "0");
    } catch {
      /* storage can be unavailable */
    }
    loadFeedPage(0);
  }

  function goToRoute(route: string) {
    history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  const feedSection = (
    <section className="dash-feed" aria-labelledby="dash-feed-heading">
      <h2 id="dash-feed-heading" className="sr-only">
        {v.dashFeedHeading}
      </h2>

      {feedState === "loading" ? (
        <div className="feed-grid" aria-hidden="true">
          <div className="feed-skeleton feed-skeleton--feature" />
          <div className="feed-skeleton" />
          <div className="feed-skeleton" />
          <div className="feed-skeleton" />
          <div className="feed-skeleton" />
        </div>
      ) : feedState === "error" && !feedItems.length ? (
        <EmptyState
          title={v.dashFeedEmpty}
          body={feedError || v.dashFeedError}
          action={
            <button className="button button--quiet" onClick={restartFeed}>
              {v.dashboardTryAgain}
            </button>
          }
        />
      ) : feedState === "empty" && !feedItems.length ? (
        <EmptyState
          title={v.dashFeedEmpty}
          body={v.dashFeedEmptyBody}
          action={
            <button className="button button--quiet" onClick={restartFeed}>
              {v.dashboardTryAgain}
            </button>
          }
        />
      ) : (
        <>
          <div
            className={`feed-grid${feedItems.length === 2 ? " feed-grid--pair" : ""}`}
          >
            {feedItems.map((item, index) => (
              <FeedTile
                key={item.productId}
                item={item}
                index={index}
                single={feedItems.length === 1}
                total={feedItems.length}
                onOpen={openProduct}
              />
            ))}
          </div>
          {feedState === "busy" ? (
            <div className="feed-status">
              <LoadingIndicator
                className="search-loading-indicator--inline"
                label={v.dashFeedLoading}
              />
            </div>
          ) : null}
          {feedState === "error" ? (
            <div className="feed-status feed-status--error" role="status">
              <p>{feedError || v.dashFeedError}</p>
              <button
                className="button button--quiet"
                onClick={() => loadFeedPage()}
              >
                {v.dashboardTryAgain}
              </button>
            </div>
          ) : null}
          {feedState === "done" ? (
            <div className="feed-status feed-status--end" role="status">
              <span>{v.dashFeedEnd}</span>
              <button className="button button--tonal" onClick={restartFeed}>
                {v.dashFeedReshuffle}
              </button>
            </div>
          ) : null}
          <div className="feed-sentinel" ref={sentinelRef} aria-hidden="true" />
        </>
      )}
    </section>
  );

  const dropsSection = (
    <RecentDropsSection
      drops={drops}
      onOpen={openProduct}
      onDiscover={onDiscover}
    />
  );

  return (
    <>
      <div className="page-heading dashboard-greeting">
        <div className="dashboard-greeting-copy">
          <div className="eyebrow">{v.dashFeedEyebrow}</div>
          <h1>{v.dashGreetingHeading}</h1>
          <p className="dashboard-greeting-sub">{v.dashGreetingSub}</p>
        </div>
        <EditorialPhoto
          className="dashboard-editorial-photo"
          image="tech-desk"
          loading="eager"
        />
        <button className="button button--tonal" onClick={onDiscover}>
          <Icon name="search" />
          {v.dashboardExplore}
        </button>
      </div>

      {token ? (
        <>
          <div className="stat-grid">
            <MetricStat
              label={v.dashboardTrackedMetric}
              value={trackBusy || trackError ? "—" : alerts.length.toString()}
              note={v.dashboardTrackedNote}
            />
            <MetricStat
              label={v.dashboardAtTargetMetric}
              value={trackBusy || trackError ? "—" : atTarget.toString()}
              note={v.dashboardAtTargetNote}
              tone="green"
            />
            <MetricStat
              label={v.dashboardNearTargetMetric}
              value={trackBusy || trackError ? "—" : nearTarget.toString()}
              note={v.dashboardNearTargetNote}
              tone="amber"
            />
            <MetricStat
              label={v.dashboardUnreadMetric}
              value={trackBusy || trackError ? "—" : unread.toString()}
              note={v.dashboardUnreadNote}
            />
          </div>

          <section
            className="dash-section"
            aria-labelledby="dash-tracked-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="dash-tracked-heading">{v.dashboardTrackingHeading}</h2>
              </div>
              <button
                className="text-button"
                onClick={() => goToRoute("/products")}
              >
                {v.dashboardViewAll} <Icon name="arrow" />
              </button>
            </div>
            {trackBusy && !alerts.length ? (
              <div className="feed-grid" aria-hidden="true">
                <div className="feed-skeleton feed-skeleton--feature" />
                <div className="feed-skeleton" />
                <div className="feed-skeleton" />
                <div className="feed-skeleton" />
                <div className="feed-skeleton" />
              </div>
            ) : alerts.length ? (
              <div
                className={`dash-tracked-grid${
                  Math.min(alerts.length, 6) === 2
                    ? " dash-tracked-grid--pair"
                    : ""
                }`}
              >
                {alerts.slice(0, 6).map((tracking, index) => (
                  <TrackedCard
                    key={tracking.trackingId}
                    tracking={tracking}
                    displayCurrency={displayCurrency}
                    busy={false}
                    compared={compareIds.includes(tracking.productId)}
                    featured={Math.min(alerts.length, 6) > 2 && index === 0}
                    colorIndex={index}
                    onOpen={() => openProduct(tracking.productId)}
                    onCompare={
                      onCompare
                        ? () => onCompare(tracking.productId)
                        : undefined
                    }
                    onAction={trackingAction}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  trackError
                    ? v.dashboardTrackingLoadError
                    : v.dashboardNothingTracked
                }
                body={trackError || v.dashboardNothingTrackedBody}
                action={
                  trackError ? (
                    <button
                      className="button button--quiet"
                      onClick={() => window.location.reload()}
                    >
                      {v.dashboardTryAgain}
                    </button>
                  ) : undefined
                }
              />
            )}
          </section>

          <section
            className="dash-section dash-alerts"
            aria-labelledby="dash-alerts-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="dash-alerts-heading">{v.dashAlertsPanelHeading}</h2>
              </div>
              <button
                className="text-button"
                onClick={() => goToRoute("/notifications")}
              >
                {v.dashAlertsViewAll} <Icon name="arrow" />
              </button>
            </div>
            {!token ? null : notifications.length ? (
              <ul className="dash-alerts-list">
                {notifications.map((item) => (
                  <li
                    key={item.notificationId}
                    className={
                      item.isRead
                        ? "dash-alert is-read"
                        : "dash-alert is-unread"
                    }
                  >
                    <span
                      className={`dash-alert-type dash-alert-type--${item.eventType}`}
                      aria-hidden="true"
                    />
                    <div className="dash-alert-body">
                      <strong className="dash-alert-type-label">
                        {item.eventType === "targetReached"
                          ? v.notificationsTargetReached
                          : item.eventType === "furtherDecrease"
                            ? v.notificationsFurtherDrop
                            : v.notificationsTrackingStopped}
                      </strong>
                      <button
                        type="button"
                        className="dash-alert-product"
                        onClick={() =>
                          item.productId && openProduct(item.productId)
                        }
                      >
                        {item.productName}
                      </button>
                      <span className="dash-alert-meta">
                        {item.storeName} · {formatShortDateOrDash(item.sentAt)}
                      </span>
                      <span className="dash-alert-pricing">
                        <Price
                          amount={item.triggeredPrice}
                          currencyCode={item.triggeredCurrencyCode}
                          className={undefined}
                        />
                        {" · "}
                        {v.colTargetPrice}{" "}
                        <Price
                          amount={item.targetPrice}
                          currencyCode={item.targetCurrencyCode}
                          className={undefined}
                        />
                      </span>
                    </div>
                    {!item.isRead ? (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          markNotificationRead(item.notificationId)
                        }
                      >
                        {v.notificationsMarkRead}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title={notificationsError || v.dashAlertsEmptyTitle}
                body={v.dashAlertsEmptyBody}
                action={undefined}
              />
            )}
          </section>

          {dropsSection}
          {feedSection}
        </>
      ) : (
        <>
          {feedSection}
          {dropsSection}
          <section className="guest-panel">
            <div>
              <div className="eyebrow">{v.dashboardGuestEyebrow}</div>
              <h2>{v.dashboardGuestHeading}</h2>
              <p>{v.dashboardGuestBody}</p>
            </div>
            <button className="button button--blue" onClick={onSignIn}>
              {v.dashboardGuestCta} <Icon name="arrow" />
            </button>
          </section>
        </>
      )}
    </>
  );
}

interface TrackedCardProps {
  tracking: TrackingResponse;
  displayCurrency: string;
  busy: boolean;
  compared: boolean;
  featured?: boolean;
  colorIndex?: number;
  onOpen: () => void;
  onCompare?: () => void;
  onAction: (
    tracking: TrackingResponse,
    action: "deactivate" | "activate" | "remove",
  ) => void;
}

function TrackedCard({
  tracking: t,
  displayCurrency,
  compared,
  featured = false,
  colorIndex = 0,
  onOpen,
  onCompare,
  onAction,
}: TrackedCardProps) {
  const v = useLocale();

  const reached =
    t.currentPriceInTargetCurrency != null &&
    t.currentPriceInTargetCurrency <= t.targetPrice;
  const status = !t.isActive ? "paused" : reached ? "reached" : "tracking";
  const statusLabel =
    status === "reached"
      ? v.dashBadgeReached
      : status === "paused"
        ? v.statusPaused
        : v.statusTracking;

  const currentPriceValue =
    t.currentPriceInDisplayCurrency ?? t.currentPriceInTargetCurrency ?? null;
  const targetPriceValue = t.targetPriceInDisplayCurrency ?? t.targetPrice;
  const progressCurrency =
    t.currentPriceInDisplayCurrency != null ? displayCurrency : t.currencyCode;
  const progressPercent =
    currentPriceValue != null && targetPriceValue > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((currentPriceValue / targetPriceValue) * 100)),
        )
      : null;

  return (
    <article
      className={`dash-tracked-card dash-tracked-card--${status} dash-tracked-card--c${colorIndex % 4}${featured ? " dash-tracked-card--featured" : ""}`}
    >
      <button
        type="button"
        className="dash-tracked-media"
        onClick={onOpen}
        aria-label={v.dashFeedOpen(t.productName)}
      >
        <ProductImage
          source={undefined}
          baseUrl={undefined}
          productId={t.productId}
          alt={t.productName}
          loading="lazy"
          layered
          fallback={productIllustration(colorIndex)}
        />
      </button>
      <div className="dash-tracked-body">
        <button type="button" className="dash-tracked-name" onClick={onOpen}>
          {t.productName}
        </button>
        <span className="dash-tracked-store">
          {t.storeName || t.marketCountry || "—"}
        </span>
        <div className="dash-tracked-pricing">
          <Price
            className="dash-tracked-price"
            amount={currentPriceValue}
            currencyCode={progressCurrency ?? undefined}
          />
          <span className="dash-tracked-target">
            {v.colTargetPrice}{" "}
            <Price
              amount={targetPriceValue}
              currencyCode={
                (t.currentPriceInDisplayCurrency != null
                  ? displayCurrency
                  : t.currencyCode) ?? undefined
              }
              className={undefined}
            />
          </span>
        </div>
        {progressPercent != null ? (
          <div
            className="dash-tracked-progress"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              status === "reached"
                ? v.dashProgressReached
                : v.dashProgressToTarget(progressPercent)
            }
          >
            <span
              className="dash-tracked-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}
        <span
          className={`status status--${status === "reached" ? "active" : t.isActive ? "active" : "paused"} dash-tracked-status`}
        >
          <i />
          {statusLabel}
        </span>
      </div>
      <div className="dash-tracked-actions">
        {onCompare ? (
          <button
            type="button"
            className="text-button compare-text"
            onClick={onCompare}
          >
            {compared ? v.discoverRemoveCompare : v.discoverAddCompare}
          </button>
        ) : null}
        <button
          type="button"
          className="icon-button icon-button--small"
          aria-label={t.isActive ? v.pauseTracking : v.resumeTracking}
          onClick={() => onAction(t, t.isActive ? "deactivate" : "activate")}
        >
          <Icon name={t.isActive ? "pause" : "play"} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--small danger-action"
          aria-label={v.removeTracking}
          onClick={() => {
            if (window.confirm(v.removeTrackingConfirm)) onAction(t, "remove");
          }}
        >
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

const FEED_COLOR_COUNT = 4;

function tileColor(item: ProductFeedItem): number {
  let hash = 0;
  const key = item.productId || item.name || "";
  for (let i = 0; i < key.length; i += 1)
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash) % FEED_COLOR_COUNT;
}

function tileVariant(item: ProductFeedItem): "standard" | "flat" {
  return item.primaryImage ? "standard" : "flat";
}

function FeedTile({
  item,
  index,
  single,
  total,
  onOpen,
}: {
  item: ProductFeedItem;
  index: number;
  single: boolean;
  total: number;
  onOpen: (item: ProductFeedItem) => void;
}) {
  const v = useLocale();
  const currency = item.currencyCode || item.currency || "";
  const featured = index === 0 && total > 2 && item.lowestPrice != null;

  const variant = featured ? "feature" : tileVariant(item);
  const color = tileColor(item) % FEED_COLOR_COUNT;

  const movement = buildMovement(item, v, formatDateOnly);

  const media = (
    <div className="feed-media">
      <span className="feed-blob" aria-hidden="true" />
      <ProductImage
        source={item.primaryImage || undefined}
        baseUrl={undefined}
        productId={item.productId}
        alt=""
        loading={index >= 4 ? "lazy" : "eager"}
        layered
        fallback="/dealio-context/illustrations/product-box.svg"
      />
    </div>
  );

  return (
    <article
      className={`feed-tile feed-tile--${variant} feed-tile--c${color}${featured ? " feed-tile--featured" : ""}${single ? " feed-tile--solo" : ""}`}
    >
      {item.category || item.brand ? (
        <span className="feed-chip" aria-hidden="true">
          {(item.category || item.brand || "").split(" ").slice(0, 3).join(" ")}
        </span>
      ) : null}
      {media}
      <div className="feed-body">
        <h3 className="feed-name">{item.name}</h3>
        <div className="feed-pricing">
          <Price
            amount={item.lowestPrice}
            currencyCode={currency}
            className={undefined}
          />
          {item.previousPrice != null ? (
            <span className="feed-was">
              <span className="feed-was-label">{v.dashFeedWas}</span>
              <span className="feed-was-value">
                <Price
                  amount={item.previousPrice}
                  currencyCode={currency}
                  className={undefined}
                />
              </span>
            </span>
          ) : null}
        </div>
        {movement ? (
          <span
            className={`feed-movement feed-movement--${movement.dir}`}
            title={movement.aria}
            aria-label={movement.aria}
          >
            <span aria-hidden="true" className="feed-movement-arrow">
              {movement.arrow}
            </span>
            {movement.short}
            {movement.date ? (
              <span className="feed-movement-date"> · {movement.date}</span>
            ) : null}
          </span>
        ) : null}
        <div className="feed-meta">
          {item.storeCount && item.storeCount > 0 ? (
            <span className="feed-meta-bit">
              {v.dashFeedStores(item.storeCount)}
            </span>
          ) : null}
          {item.brand ? (
            <span className="feed-meta-bit feed-meta-bit--brand">
              {item.brand}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="feed-hit"
          onClick={() => item.productId && onOpen(item)}
          aria-label={v.dashFeedOpen(item.name)}
        />
      </div>
    </article>
  );
}

function buildMovement(
  item: ProductFeedItem,
  v: ReturnType<typeof useLocale>,
  formatDate: (value: string) => string,
) {
  const pct = Number(item.priceChangePercent);
  if (!Number.isFinite(pct) || pct === 0) return null;
  const dir = pct < 0 ? "down" : "up";
  const rounded = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(Math.abs(pct));
  const date = item.previousRecordedAt
    ? formatDate(item.previousRecordedAt)
    : "";
  const arrow = dir === "down" ? "↓" : "↑";
  const aria =
    dir === "down"
      ? v.dashFeedMovementDown(rounded as unknown as number, date)
      : v.dashFeedMovementUp(rounded as unknown as number, date);
  return { dir, arrow, short: `${rounded}%`, date, aria };
}
