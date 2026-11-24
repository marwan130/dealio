// @ts-nocheck
import { jsx, jsxs } from "react/jsx-runtime";
import { translations } from "../../i18n";

export function DiscoverPageSkeleton() {
  return jsxs("div", {
    className: "skeleton-page-wrap",
    "aria-label":
      translations[
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "ar"
          : "en"
      ].discoverSearching,
    children: [
      jsxs("div", {
        className: "home-mosaic",
        children: [
          jsx("figure", { className: "home-editorial-photo skeleton-box" }),
          jsxs("div", {
            className: "home-category-panel",
            children: [
              jsx("span", {
                className: "skeleton-box skeleton-mosaic-heading",
                style: { marginBottom: 12 },
              }),
              jsxs("div", {
                className: "home-categories",
                children: [1, 2, 3, 4, 5, 6, 7, 8].map((f) =>
                  jsxs(
                    "span",
                    {
                      className: "home-cat-tile home-cat-tile-skel",
                      children: [
                        jsx("span", {
                          className: "skeleton-box home-cat-glyph-skel",
                          style: { borderRadius: 10 },
                        }),
                        jsx("span", {
                          className: "skeleton-box home-cat-label-skel",
                          style: { borderRadius: 4 },
                        }),
                      ],
                    },
                    f,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
      jsxs("section", {
        className: "shelf",
        children: [
          jsxs("div", {
            className: "shelf-header",
            children: [
              jsxs("div", {
                className: "shelf-heading",
                children: [
                  jsx("span", {
                    className: "skeleton-box skeleton-shelf-eyebrow",
                    style: { marginBottom: 6, borderRadius: 3 },
                  }),
                  jsx("span", {
                    className: "skeleton-box skeleton-shelf-heading",
                    style: { borderRadius: 6 },
                  }),
                ],
              }),
            ],
          }),
          jsxs("div", {
            className: "shelf-track",
            children: [1, 2, 3, 4].map((f) =>
              jsxs(
                "div",
                {
                  className: "home-card-skeleton",
                  children: [
                    jsx("div", {
                      className: "home-card-skeleton-photo skeleton-box",
                    }),
                    jsx("span", {
                      className: "skeleton-box",
                      style: { width: "80%", height: 13 },
                    }),
                    jsx("span", {
                      className: "skeleton-box",
                      style: { width: "45%", height: 13 },
                    }),
                  ],
                },
                f,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}

export function DealCardSkeleton({ index: e = 0 }) {
  return jsxs("article", {
    className: "deal-card skeleton-deal-card",
    style: { "--i": e },
    children: [
      jsx("div", { className: "deal-card-photo-wrap skeleton-deal-img-wrap" }),
      jsxs("div", {
        className: "deal-card-body",
        children: [
          jsx("div", {
            className: "skeleton-box skeleton-text skeleton-meta-line",
          }),
          jsx("div", {
            className: "skeleton-box skeleton-text skeleton-title",
            style: { width: `${88 - (e % 3) * 9}%` },
          }),
          jsx("div", {
            className: "skeleton-box skeleton-text skeleton-title-2",
            style: { width: `${46 + (e % 4) * 8}%` },
          }),
          jsxs("div", {
            className: "skeleton-price-row",
            children: [
              jsx("div", {
                className: "skeleton-box skeleton-text skeleton-price",
              }),
              jsx("div", {
                className: "skeleton-box skeleton-text skeleton-price-old",
              }),
            ],
          }),
          jsxs("div", {
            className: "deal-card-actions",
            style: { marginTop: "auto" },
            children: [
              jsx("div", { className: "skeleton-box skeleton-btn" }),
              jsx("div", {
                className: "skeleton-box skeleton-btn skeleton-btn--quiet",
              }),
              jsx("span", { className: "skeleton-box skeleton-link-dash" }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function DealCardSkeletons({ count: c = 6, gridRef: f }) {
  return jsx("div", {
    className: "deal-cards-grid",
    ref: f,
    children: Array.from({ length: c }).map((w, x) =>
      jsx(DealCardSkeleton, { index: x }, x),
    ),
  });
}

export function TrackingCardSkeletons({ count: c = 6 }) {
  return jsx("div", {
    className: "tracking-cards",
    children: Array.from({ length: c }).map((f, x) =>
      jsxs(
        "div",
        {
          className: "tracking-card skeleton-tracking-card",
          children: [
            jsxs("div", {
              className: "skeleton-tracking-select",
              children: [
                jsx("span", {
                  className: "skeleton-box skeleton-tracking-check",
                }),
                jsx("span", {
                  className: "skeleton-box skeleton-tracking-label",
                  style: { width: `${48 + (x % 3) * 6}%` },
                }),
              ],
            }),
            jsx("span", {
              className: "skeleton-box skeleton-tracking-status",
              style: { width: 88 - (x % 3) * 10 },
            }),
            jsx("span", {
              className: "skeleton-box skeleton-tracking-title",
              style: { width: `${86 - (x % 3) * 9}%` },
            }),
            jsx("span", {
              className: "skeleton-box skeleton-tracking-store",
              style: { width: `${30 + (x % 2) * 6}%` },
            }),
            jsxs("div", {
              className: "skeleton-tracking-prices",
              children: [
                jsx("span", {
                  className: "skeleton-box skeleton-tracking-price",
                  style: { width: `${30 + (x % 3) * 4}%` },
                }),
                jsx("span", {
                  className: "skeleton-box skeleton-tracking-target",
                  style: { width: `${34 + (x % 2) * 6}%` },
                }),
              ],
            }),
            jsxs("div", {
              className: "skeleton-tracking-actions",
              children: [
                jsx("span", {
                  className: "skeleton-box skeleton-tracking-dash",
                }),
                jsx("span", {
                  className:
                    "skeleton-box skeleton-tracking-dash skeleton-tracking-dash--wide",
                }),
              ],
            }),
          ],
        },
        x,
      ),
    ),
  });
}

export function SkeletonTable({ rows: c = 5 }) {
  return jsx("div", {
    className: "skeleton-table",
    children: Array.from({ length: c }).map((f, x) =>
      jsxs(
        "div",
        {
          className: "skeleton-table-row",
          children: [
            jsx("div", {
              className: "skeleton-box skeleton-text",
              style: { width: "32%" },
            }),
            jsx("div", {
              className: "skeleton-box skeleton-text",
              style: { width: "20%" },
            }),
            jsx("div", {
              className: "skeleton-box skeleton-text",
              style: { width: "18%" },
            }),
            jsx("div", {
              className: "skeleton-box skeleton-text",
              style: { width: "15%" },
            }),
            jsx("div", {
              className: "skeleton-box skeleton-text",
              style: { width: "15%" },
            }),
          ],
        },
        x,
      ),
    ),
  });
}

export function NoticeListSkeleton({ count: c = 4 }) {
  return jsx("div", {
    className: "notifications-skeleton",
    "aria-hidden": "true",
    children: jsx("div", {
      className: "skeleton-notice-list",
      children: Array.from({ length: c }).map((f, x) =>
        jsxs(
          "div",
          {
            className: `skeleton-notice-item${x % 2 === 0 ? " is-unread" : ""}`,
            children: [
              jsx("span", {
                className: "skeleton-notice-stamp",
                children: jsx("svg", {
                  className: "skeleton-notice-bell",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "1.7",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  children: [
                    jsx(
                      "path",
                      { d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" },
                      "bell",
                    ),
                    jsx(
                      "path",
                      { d: "M13.7 21a2 2 0 0 1-3.4 0" },
                      "clapper",
                    ),
                  ],
                }),
              }),
              jsxs("div", {
                className: "notice-copy",
                children: [
                  jsxs("div", {
                    className: "notice-top",
                    children: [
                      jsx("span", {
                        className: "skeleton-box skeleton-notice-title",
                        style: { width: `${42 + (x % 3) * 9}%` },
                      }),
                      jsx("span", {
                        className: "skeleton-box skeleton-notice-date",
                      }),
                    ],
                  }),
                  jsx("span", {
                    className: "skeleton-box skeleton-notice-body",
                    style: { width: `${64 + (x % 2) * 14}%` },
                  }),
                  jsxs("div", {
                    className: "skeleton-notice-foot",
                    children: [
                      jsx("span", {
                        className: "skeleton-box skeleton-notice-state",
                        style: { width: `${28 + (x % 3) * 6}%` },
                      }),
                      jsx("span", {
                        className: "skeleton-box skeleton-notice-action",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
          x,
        ),
      ),
    }),
  });
}

export function TopbarSkeleton() {
  return jsxs("div", {
    className: "topbar-skeleton-wrap",
    children: [
      jsx("div", {
        className: "topbar-skeleton-left",
        children: jsx("span", {
          className: "skeleton-box topbar-skel-left",
        }),
      }),
      jsxs("div", {
        className: "topbar-skeleton-right",
        children: [
          jsx("span", {
            className: "skeleton-box topbar-skel-search",
          }),
          jsx("span", {
            className:
              "skeleton-box topbar-skel-action topbar-skel-action--wide",
          }),
          jsx("span", {
            className: "skeleton-box topbar-skel-action",
          }),
          jsx("span", {
            className: "skeleton-box topbar-skel-icon",
          }),
        ],
      }),
    ],
  });
}

export function SidebarSkeleton({ collapsed: c }) {
  return c
    ? jsxs("div", {
        className: "sidebar-skeleton-items",
        style: {
          padding: "0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        },
        children: [1, 2, 3, 4, 5].map((f) =>
          jsx(
            "span",
            {
              className: "skeleton-box sidebar-skel-icon",
            },
            f,
          ),
        ),
      })
    : jsxs("div", {
        className: "sidebar-skeleton-items",
        style: {
          padding: "0 4px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        },
        children: [1, 2, 3, 4, 5].map((f) =>
          jsx(
            "span",
            {
              className: "skeleton-box sidebar-skeleton-item",
            },
            f,
          ),
        ),
      });
}

export function DashboardSkeleton() {
  return jsxs("div", {
    className: "skeleton-page-wrap",
    "aria-label":
      translations[
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "ar"
          : "en"
      ].loadingProducts,
    children: [
      jsxs("div", {
        className: "page-heading dashboard-greeting",
        children: [
          jsxs("div", {
            className: "dashboard-greeting-copy",
            children: [
              jsx("span", {
                className: "skeleton-box greeting-skel-eyebrow",
                style: { marginBottom: 7, borderRadius: 3 },
              }),
              jsx("span", { className: "skeleton-box greeting-skel-heading" }),
              jsx("span", {
                className: "skeleton-box greeting-skel-sub",
                style: { marginTop: 10 },
              }),
            ],
          }),
          jsx("span", {
            className: "skeleton-box greeting-skel-action",
            style: { gridArea: "actions", borderRadius: 8 },
          }),
          jsx("figure", {
            className: "dashboard-editorial-photo skeleton-box",
            style: { gridArea: "photo" },
          }),
        ],
      }),
      jsxs("div", {
        className: "feed-grid",
        children: [
          jsx("div", { className: "feed-skeleton feed-skeleton--feature" }),
          jsx("div", { className: "feed-skeleton" }),
          jsx("div", { className: "feed-skeleton" }),
          jsx("div", { className: "feed-skeleton" }),
          jsx("div", { className: "feed-skeleton" }),
        ],
      }),
    ],
  });
}

export function SettingsSkeleton() {
  return jsxs("div", {
    className: "skeleton-page-wrap",
    "aria-label":
      translations[
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "ar"
          : "en"
      ].loading,
    children: [
      jsx("div", {
        className: "page-heading",
        children: jsx("div", {
          children: jsx("span", {
            className: "skeleton-box skeleton-page-heading",
          }),
        }),
      }),
      jsxs("div", {
        className: "settings-skeleton-panel",
        children: [
          jsx("span", {
            className: "skeleton-box skeleton-panel-title",
          }),
          jsx("span", {
            className: "skeleton-box skeleton-panel-line",
          }),
          jsxs("div", {
            className: "skeleton-field-row",
            children: [
              jsx("span", { className: "skeleton-box skeleton-field" }),
              jsx("span", { className: "skeleton-box skeleton-field" }),
            ],
          }),
        ],
      }),
      jsxs("div", {
        className: "settings-skeleton-panel",
        children: [
          jsx("span", {
            className:
              "skeleton-box skeleton-panel-title skeleton-panel-title--wide",
          }),
          jsxs("div", {
            className: "skeleton-field-row",
            children: [
              jsx("span", { className: "skeleton-box skeleton-field" }),
              jsx("span", { className: "skeleton-box skeleton-field" }),
            ],
          }),
        ],
      }),
      jsxs("div", {
        className: "settings-skeleton-panel",
        children: [
          jsx("span", {
            className:
              "skeleton-box skeleton-panel-title skeleton-panel-title--widest",
          }),
          jsxs("div", {
            className: "skeleton-field-row",
            children: [
              jsx("span", { className: "skeleton-box skeleton-field" }),
              jsx("span", { className: "skeleton-box skeleton-field" }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function ComparePageSkeleton() {
  return jsxs("div", {
    className: "compare-skeleton-wrap",
    "aria-label":
      translations[
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "ar"
          : "en"
      ].compareLoading,
    children: [
      jsx("div", {
        className: "page-heading",
        children: jsx("div", {
          children: jsx("span", {
            className: "skeleton-box skeleton-page-heading",
          }),
        }),
      }),
      jsxs("div", {
        className: "compare-skeleton-head",
        children: [1, 2, 3, 4].map((c) =>
          jsx("span", { className: "skeleton-box" }, c),
        ),
      }),
      jsx(SkeletonTable, { rows: 4 }),
    ],
  });
}

export function ProductDetailsSkeleton() {
  return jsxs("div", {
    className: "skeleton-page-wrap",
    "aria-label":
      translations[
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "ar"
          : "en"
      ].productDetailsLoading,
    children: [
      jsx("span", {
        className:
          "skeleton-box skeleton-page-heading skeleton-page-heading--sm",
        style: { marginBottom: 18 },
      }),
      jsxs("div", {
        className: "pdp-skeleton-hero",
        children: [
          jsx("span", { className: "skeleton-box pdp-skeleton-media" }),
          jsxs("div", {
            className: "pdp-skeleton-copy",
            children: [
              jsx("span", { className: "skeleton-box pdp-skeleton-title" }),
              jsx("span", { className: "skeleton-box pdp-skeleton-price" }),
              jsx("span", { className: "skeleton-box pdp-skeleton-body" }),
              jsxs("div", {
                className: "pdp-skeleton-actions",
                children: [
                  jsx("span", { className: "skeleton-box pdp-skeleton-cta" }),
                  jsx("span", { className: "skeleton-box pdp-skeleton-cta" }),
                ],
              }),
            ],
          }),
        ],
      }),
      jsx("span", {
        className: "skeleton-box pdp-skeleton-chart",
        style: { marginBottom: 24 },
      }),
      jsx(SkeletonTable, { rows: 3 }),
    ],
  });
}
