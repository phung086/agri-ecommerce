"use client";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function pickLocalizedField(record, field, locale) {
  const value = cleanText(record?.[field]);
  const englishValue = cleanText(record?.[`${field}En`]);

  if (locale === "en" && typeof englishValue === "string" && englishValue) {
    return englishValue;
  }

  return value;
}

export function pickLocalizedProductName(record, locale) {
  const value = cleanText(record?.productName);
  const englishValue = cleanText(record?.productNameEn);

  if (locale === "en" && typeof englishValue === "string" && englishValue) {
    return englishValue;
  }

  return value;
}

export function localizeProduct(product, locale) {
  if (!product) {
    return product;
  }

  return {
    ...product,
    name: pickLocalizedField(product, "name", locale),
    description: pickLocalizedField(product, "description", locale),
    unit: pickLocalizedField(product, "unit", locale),
    categoryName: pickLocalizedField(product, "categoryName", locale),
  };
}

export function localizeCategory(category, locale) {
  if (!category) {
    return category;
  }

  return {
    ...category,
    name: pickLocalizedField(category, "name", locale),
    description: pickLocalizedField(category, "description", locale),
    categoryName: pickLocalizedField(category, "categoryName", locale),
  };
}

export function localizeCartItem(item, locale) {
  if (!item) {
    return item;
  }

  return {
    ...item,
    name:
      locale === "en" && item.nameEn
        ? item.nameEn
        : pickLocalizedProductName(item, locale) || item.name,
    unit: pickLocalizedField(item, "unit", locale),
    categoryName: pickLocalizedField(item, "categoryName", locale),
  };
}
