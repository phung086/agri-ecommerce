export const GUEST_CART_STORAGE_KEY = "agri-market:guest-cart";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeGuestCartItem(product, quantity = 1) {
  const productId = safeNumber(product?.id || product?.productId);
  if (!productId) {
    return null;
  }

  const price = safeNumber(product.productPrice ?? product.price);
  const stock = safeNumber(product.stock, 0);
  const nextQuantity = Math.max(1, Math.min(safeNumber(quantity, 1), stock || 99));

  return {
    productId,
    productSlug: product.productSlug || product.slug || String(productId),
    productName: product.productName || product.name || "San pham",
    productNameEn: product.productNameEn || product.nameEn || "",
    productPrice: price,
    thumbnail: product.thumbnail || product.imageUrl || product.image || "",
    unit: product.unit || "san pham",
    unitEn: product.unitEn || "",
    stock,
    status: product.status || "in_stock",
    quantity: nextQuantity,
  };
}

export function readGuestCart() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeGuestCartItem(item, item.quantity)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedItems = Array.isArray(items)
    ? items.map((item) => normalizeGuestCartItem(item, item.quantity)).filter(Boolean)
    : [];
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(normalizedItems));
}

export function clearGuestCart() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

export function addGuestCartItem(product, quantity = 1) {
  const nextItem = normalizeGuestCartItem(product, quantity);
  if (!nextItem) {
    return readGuestCart();
  }

  const currentItems = readGuestCart();
  const existing = currentItems.find(
    (item) => Number(item.productId) === Number(nextItem.productId)
  );
  const nextItems = existing
    ? currentItems.map((item) =>
        Number(item.productId) === Number(nextItem.productId)
          ? {
              ...item,
              quantity: Math.min(
                safeNumber(item.quantity, 0) + nextItem.quantity,
                safeNumber(item.stock, 0) || 99
              ),
            }
          : item
      )
    : [...currentItems, nextItem];

  writeGuestCart(nextItems);
  return nextItems;
}

export function updateGuestCartItem(productId, quantity) {
  const nextQuantity = safeNumber(quantity, 0);
  const nextItems = readGuestCart()
    .map((item) =>
      Number(item.productId) === Number(productId)
        ? {
            ...item,
            quantity: Math.min(Math.max(nextQuantity, 0), safeNumber(item.stock, 0) || 99),
          }
        : item
    )
    .filter((item) => item.quantity > 0);

  writeGuestCart(nextItems);
  return nextItems;
}

export function removeGuestCartItem(productId) {
  const nextItems = readGuestCart().filter(
    (item) => Number(item.productId) !== Number(productId)
  );
  writeGuestCart(nextItems);
  return nextItems;
}

export function mapGuestCartItemsToCartResponse(items = readGuestCart()) {
  const normalizedItems = items
    .map((item) => normalizeGuestCartItem(item, item.quantity))
    .filter(Boolean);
  const responseItems = normalizedItems.map((item) => {
    const lineTotal = safeNumber(item.productPrice) * safeNumber(item.quantity);
    return {
      id: `guest-${item.productId}`,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      productNameEn: item.productNameEn,
      productPrice: item.productPrice,
      thumbnail: item.thumbnail,
      unit: item.unit,
      unitEn: item.unitEn,
      stock: item.stock,
      status: item.status,
      quantity: item.quantity,
      lineTotal,
      product: { id: item.productId },
    };
  });

  return {
    items: responseItems,
    totalAmount: responseItems.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0),
    totalQuantity: responseItems.reduce((sum, item) => sum + safeNumber(item.quantity), 0),
  };
}

export function toGuestCheckoutItems(items = readGuestCart()) {
  return items
    .map((item) => normalizeGuestCartItem(item, item.quantity))
    .filter(Boolean)
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
}
