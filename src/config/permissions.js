// ======================================================
// STAFF PERMISSIONS
//
// Admin-panel modules a staff account can be granted.
// Admins can do everything; a staff member can only call
// the admin API routes of the modules on their account.
// Keys match the admin panel's sidebar sections.
// ======================================================

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "banners", label: "Banners" },
  { key: "inventory", label: "Inventory" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "users", label: "Customers" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

const MODULE_KEYS = MODULES.map((m) => m.key);

// A staff permission is a module key ("products" = full access: read and
// write) or the key with ":view" ("products:view" = read-only: GET only).
const VIEW_SUFFIX = ":view";

/** { module, level } for a stored permission string, or null if invalid. */
const parsePermission = (value) => {
  const text = String(value || "");
  const viewOnly = text.endsWith(VIEW_SUFFIX);
  const module = viewOnly ? text.slice(0, -VIEW_SUFFIX.length) : text;
  if (!MODULE_KEYS.includes(module)) return null;
  return { module, level: viewOnly ? "view" : "manage" };
};

/** "manage" | "view" | null — the best level a permission list grants a module. */
const levelFor = (permissions = [], module) => {
  let level = null;
  for (const value of permissions) {
    const parsed = parsePermission(value);
    if (parsed?.module !== module) continue;
    if (parsed.level === "manage") return "manage";
    level = "view";
  }
  return level;
};

// First match wins, so more specific prefixes come first.
const ROUTE_MODULES = [
  ["/api/admin/dashboard", "dashboard"],
  ["/api/admin/orders", "orders"],
  ["/api/admin/payments", "payments"],
  ["/api/admin/users", "users"],
  ["/api/admin/reports", "reports"],
  ["/api/admin/settings", "settings"],
  ["/api/admin/inventory", "inventory"],
  ["/api/banners", "banners"],
  ["/api/categories", "categories"],
  // Also covers variants (/api/products/:id/variants).
  ["/api/products", "products"],
  // Image uploads serve the product, category and banner forms.
  ["/api/uploads", ["products", "categories", "banners"]],
];

/**
 * The module(s) an admin API URL belongs to: a key, a list
 * of keys (any one grants access), or null if unmapped.
 */
const moduleForUrl = (url = "") => {
  const path = url.split("?")[0];
  const match = ROUTE_MODULES.find(
    ([prefix]) =>
      path === prefix ||
      path.startsWith(prefix + "/")
  );
  return match ? match[1] : null;
};

module.exports = {
  MODULES,
  MODULE_KEYS,
  VIEW_SUFFIX,
  parsePermission,
  levelFor,
  moduleForUrl,
};
