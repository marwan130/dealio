import { translations } from "./i18n";

const localizedText = () => {
  const strings = document.documentElement.lang.toLowerCase().startsWith("ar")
    ? translations.ar
    : translations.en;
  return {
    activity: strings.productNavActivity,
    alerts: strings.productTabAlerts,
    checks: strings.productLastChecked,
    compare: strings.discoverCompare,
    removeCompare: strings.discoverRemoveCompare,
    empty: strings.productActivityEmpty,
  };
};

function catalogSignature(items: Element[]) {
  return items.map((el) => (el.textContent || "").trim()).join("¦");
}

function toneForTrust(trust: string) {
  if (trust === "stale") return "stale";
  if (trust === "unverified") return "unverified";
  if (trust === "inactive") return "inactive";
  return "verified";
}

function addActivity(offers: HTMLElement) {
  const text = localizedText();
  const rows = [
    ...offers.querySelectorAll<HTMLTableRowElement>("tbody tr[data-offer-row]"),
  ];
  const trackingCards = [
    ...document.querySelectorAll<HTMLElement>(".tracking-preference-card"),
  ];
  if (!rows.length && !trackingCards.length) {
    document.getElementById("activity")?.remove();
    return;
  }
  let section = document.getElementById("activity") || null;
  const signature = `${catalogSignature(trackingCards)}|${catalogSignature(rows)}`;
  if (!section) {
    section = document.createElement("section");
    section.className = "content-section product-activity";
    section.id = "activity";
    section.dataset.dealioActivity = signature;
    const heading = document.createElement("h2");
    heading.id = "activity-heading";
    heading.textContent = text.activity;
    section.setAttribute("aria-labelledby", "activity-heading");
    section.append(heading);
    const alerts = document.querySelector(".tracking-preference-section");
    if (alerts) alerts.after(section);
    else offers.before(section);
  } else if (section.dataset.dealioActivity === signature) {
    return;
  }
  section.dataset.dealioActivity = signature;
  section.querySelector("ol.product-activity-list")?.remove();
  section.querySelectorAll(":scope > p").forEach((p) => p.remove());
  const list = document.createElement("ol");
  list.className = "product-activity-list";
  const offerStores = new Set(
    rows.map((row) => (row.dataset.offerStore || "").trim().toLowerCase()),
  );
  trackingCards.forEach((card) => {
    const title =
      card
        .querySelector(".tracking-preference-title strong")
        ?.textContent?.trim() || "";
    if (!title || offerStores.has(title.toLowerCase())) return;
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "product-activity-dot";
    dot.dataset.tone = "verified";
    dot.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "product-activity-copy";
    const label = document.createElement("strong");
    label.textContent = title;
    const meta = document.createElement("span");
    meta.className = "product-activity-meta";
    meta.textContent = text.alerts;
    copy.append(label, meta);
    item.append(dot, copy);
    list.append(item);
  });
  rows.forEach((row) => {
    const store = (row.dataset.offerStore || "").trim();
    const checked = (row.dataset.offerChecked || "").trim() || "—";
    const trust = row.dataset.offerTrust || "";
    const priceCell = row.querySelector<HTMLElement>("td.price-cell");
    if (!priceCell) return;
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "product-activity-dot";
    dot.dataset.tone = toneForTrust(trust);
    dot.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "product-activity-copy";
    const label = document.createElement("strong");
    label.textContent = store || "—";
    const meta = document.createElement("span");
    meta.className = "product-activity-meta";
    meta.textContent = `${text.checks}: ${checked}`;
    copy.append(label, meta);
    const pricePiece = priceCell.cloneNode(true) as HTMLElement;
    pricePiece
      .querySelectorAll(".converted-price")
      .forEach((node) => node.remove());
    const flag = pricePiece.querySelector(".offer-flag");
    const flagText = flag?.textContent?.trim() || "";
    flag?.remove();
    const value = document.createElement("div");
    value.className = "product-activity-value";
    const amount = document.createElement("strong");
    amount.textContent = pricePiece.textContent?.trim() || "—";
    value.append(amount);
    if (flagText) {
      const state = document.createElement("span");
      state.className = "product-activity-state";
      state.textContent = flagText;
      value.append(state);
    }
    item.append(dot, copy, value);
    list.append(item);
  });
  if (!list.children.length) {
    const empty = document.createElement("p");
    empty.textContent = text.empty;
    section.append(empty);
  } else section.append(list);
}

function syncCompareState(bar: HTMLElement, inCompare: boolean) {
  const text = localizedText();
  const compare = bar.querySelector<HTMLButtonElement>(
    ".sticky-product-compare",
  );
  if (!compare) return;
  compare.textContent = "";
  compare.append(
    compareGlyph(),
    Object.assign(document.createElement("span"), {
      textContent: inCompare ? text.removeCompare : text.compare,
    }),
  );
  compare.toggleAttribute("data-in-compare", inCompare);
  compare.setAttribute("aria-pressed", String(inCompare));
  bar.dataset.dealioCompare = inCompare ? "in" : "out";
}

function compareGlyph() {
  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  glyph.setAttribute("viewBox", "0 0 24 24");
  glyph.setAttribute("aria-hidden", "true");
  glyph.setAttribute("fill", "none");
  glyph.setAttribute("stroke", "currentColor");
  glyph.setAttribute("stroke-width", "2");
  glyph.setAttribute("stroke-linecap", "round");
  glyph.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3");
  glyph.append(path);
  return glyph;
}

function addStickyNavigation(hero: HTMLElement) {
  const text = localizedText();
  const name = hero.querySelector("h1")?.textContent?.trim();
  if (!name) return;
  const heroCompare = hero.querySelector<HTMLButtonElement>(
    ".product-hero-cta .button--tonal",
  );
  if (!heroCompare) {
    document.querySelector(".sticky-product-bar")?.remove();
    return;
  }
  const inCompare = heroCompare.dataset.compareState === "in";

  const priceText = (
    hero.querySelector(".product-hero-price strong")?.textContent ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
  const signature = `${name}|${priceText}`;
  const existingBar = document.querySelector<HTMLElement>(
    ".sticky-product-bar",
  );
  if (existingBar) {
    if (existingBar.dataset.dealioSticky === signature) {
      if (existingBar.dataset.dealioCompare !== (inCompare ? "in" : "out")) {
        syncCompareState(existingBar, inCompare);
      }
      return;
    }
    existingBar.remove();
  }
  const bar = document.createElement("div");
  bar.className = "sticky-product-bar";
  bar.dataset.dealioSticky = signature;
  bar.dataset.dealioCompare = inCompare ? "in" : "out";
  const identity = document.createElement("div");
  identity.className = "sticky-product-identity";
  const title = document.createElement("strong");
  title.textContent = name;
  identity.append(title);
  const price = hero.querySelector(".product-hero-price strong");
  if (price && priceText && priceText !== "—") {
    const clone = price.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".converted-price").forEach((node) => node.remove());
    const value = document.createElement("span");
    value.textContent = clone.textContent?.trim() || "";
    identity.append(value);
  }
  const actions = document.createElement("div");
  actions.className = "sticky-product-actions";
  const compare = document.createElement("button");
  compare.type = "button";
  compare.className = "sticky-product-compare";
  compare.setAttribute("aria-pressed", String(inCompare));
  compare.toggleAttribute("data-in-compare", inCompare);
  compare.append(
    compareGlyph(),
    Object.assign(document.createElement("span"), {
      textContent: inCompare ? text.removeCompare : text.compare,
    }),
  );
  compare.addEventListener("click", () => heroCompare.click());
  actions.append(compare);
  bar.append(identity, actions);
  hero.after(bar);
}

function enhanceProductDetails() {
  const hero = document.querySelector<HTMLElement>(".product-hero");
  const offers = document.querySelector<HTMLElement>("#offers");
  if (!hero || !offers) {
    document.getElementById("activity")?.remove();
    document.querySelector(".sticky-product-bar")?.remove();
    return;
  }
  const heroName = hero.querySelector("h1")?.textContent?.trim();
  const existingBar = document.querySelector<HTMLElement>(
    ".sticky-product-bar",
  );
  if (
    existingBar &&
    existingBar.querySelector("strong")?.textContent?.trim() !== heroName
  ) {
    existingBar.remove();
    document.getElementById("activity")?.remove();
  }
  addActivity(offers);
  addStickyNavigation(hero);
}

let queued = false;
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    if (document.querySelector(".product-detail-page")) enhanceProductDetails();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
enhanceProductDetails();
window.addEventListener("pt-locale-changed", () => {
  document.getElementById("activity")?.remove();
  document.querySelector(".sticky-product-bar")?.remove();
  requestAnimationFrame(enhanceProductDetails);
});
