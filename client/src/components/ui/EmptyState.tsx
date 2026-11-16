// @ts-nocheck
import { jsx, jsxs } from "react/jsx-runtime";
import { Icon } from "./Icon";

export function EmptyState({
  title: c,
  body: f,
  action: x,
  className: d = "",
  icon: g = "",
}) {
  return jsxs("div", {
    className: `empty-state ${d}`.trim(),
    children: [
      jsx("span", {
        className: "empty-ring",
        children: g ? jsx(Icon, { name: g }) : jsx("span", {}),
      }),
      jsx("h3", { children: c }),
      jsx("p", { children: f }),
      x,
    ],
  });
}
