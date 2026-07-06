import vietnamAddresses from "@/data/vietnam-addresses.json";

export const VIETNAM_PROVINCES = Array.isArray(vietnamAddresses)
  ? vietnamAddresses
  : [];

export function createVietnamAddressForm(overrides = {}) {
  return {
    provinceCode: "",
    provinceName: "",
    districtCode: "",
    districtName: "",
    wardCode: "",
    wardName: "",
    address: "",
    ...overrides,
  };
}

export function getProvinceLabel(province) {
  const name = typeof province === "string" ? province : province?.name || "";
  return name.replace(/^(Tỉnh|Thành phố)\s+/i, "").trim();
}

export function findAddressOption(options = [], code) {
  if (code === null || code === undefined || code === "") {
    return null;
  }

  return (
    options.find((option) => String(option.code) === String(code)) || null
  );
}

export function hasLocationSelection(form = {}) {
  return Boolean(form.provinceCode || form.districtCode || form.wardCode);
}

export function hasVietnamAddressInput(form = {}) {
  return Boolean(
    form.provinceCode ||
      form.districtCode ||
      form.wardCode ||
      String(form.address || "").trim()
  );
}

export function isVietnamAddressComplete(
  form = {},
  { requireDetail = true } = {}
) {
  const hasDetail = String(form.address || "").trim().length > 0;

  return Boolean(
    form.provinceCode &&
      form.districtCode &&
      form.wardCode &&
      (!requireDetail || hasDetail)
  );
}

export function getVietnamAddressError(
  form = {},
  { required = false, allowDetailOnly = true } = {}
) {
  const hasInput = hasVietnamAddressInput(form);
  const hasSelection = hasLocationSelection(form);

  if (!required && !hasInput) {
    return "";
  }

  if (!hasSelection && allowDetailOnly) {
    return "";
  }

  if (!isVietnamAddressComplete(form)) {
    return "Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện, phường/xã và địa chỉ cụ thể.";
  }

  return "";
}

export function buildDetailedAddress(form = {}) {
  return [
    String(form.address || "").trim(),
    form.wardName,
    form.districtName,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildFullVietnamAddress(form = {}) {
  return [
    String(form.address || "").trim(),
    form.wardName,
    form.districtName,
    form.provinceName,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildProfileAddress(form = {}, fallback = "") {
  if (!hasVietnamAddressInput(form)) {
    return String(fallback || "").trim();
  }

  if (!hasLocationSelection(form)) {
    return String(form.address || fallback || "").trim();
  }

  return buildFullVietnamAddress(form);
}

export function addressFormToShippingPayload(form = {}, addressCount = 0) {
  return {
    fullName: String(form.fullName || "").trim(),
    phone: String(form.phone || "").trim(),
    city: String(form.provinceName || "").trim(),
    address: buildDetailedAddress(form),
    defaultAddress: Boolean(form.defaultAddress) || Number(addressCount) === 0,
  };
}

export function parseFullVietnamAddress(fullAddressStr = "") {
  const form = createVietnamAddressForm();
  if (!fullAddressStr) {
    return form;
  }

  const parts = fullAddressStr.split(",").map((p) => p.trim());
  if (parts.length === 0) {
    return form;
  }

  let remainingParts = [...parts];

  if (remainingParts.length > 0) {
    const lastPart = remainingParts[remainingParts.length - 1].toLowerCase();
    const province = VIETNAM_PROVINCES.find((p) => {
      const pName = p.name.toLowerCase();
      const pNameNorm = pName.replace(/^(tỉnh|thành phố)\s+/gi, "").trim();
      const lastPartNorm = lastPart.replace(/^(tỉnh|thành phố)\s+/gi, "").trim();
      return pNameNorm === lastPartNorm || pName === lastPart || lastPart.includes(pNameNorm);
    });

    if (province) {
      form.provinceCode = String(province.code);
      form.provinceName = province.name;
      remainingParts.pop();

      if (remainingParts.length > 0) {
        const districtPart = remainingParts[remainingParts.length - 1].toLowerCase();
        const district = (province.districts || []).find((d) => {
          const dName = d.name.toLowerCase();
          const dNameNorm = dName.replace(/^(quận|huyện|thị xã|thành phố)\s+/gi, "").trim();
          const districtPartNorm = districtPart.replace(/^(quận|huyện|thị xã|thành phố)\s+/gi, "").trim();
          return dNameNorm === districtPartNorm || dName === districtPart || districtPart.includes(dNameNorm);
        });

        if (district) {
          form.districtCode = String(district.code);
          form.districtName = district.name;
          remainingParts.pop();

          if (remainingParts.length > 0) {
            const wardPart = remainingParts[remainingParts.length - 1].toLowerCase();
            const ward = (district.wards || []).find((w) => {
              const wName = w.name.toLowerCase();
              const wNameNorm = wName.replace(/^(phường|xã|thị trấn)\s+/gi, "").trim();
              const wardPartNorm = wardPart.replace(/^(phường|xã|thị trấn)\s+/gi, "").trim();
              return wNameNorm === wardPartNorm || wName === wardPart || wardPart.includes(wNameNorm);
            });

            if (ward) {
              form.wardCode = String(ward.code);
              form.wardName = ward.name;
              remainingParts.pop();
            }
          }
        }
      }
    }
  }

  form.address = remainingParts.join(", ");

  if (!form.provinceCode) {
    form.address = fullAddressStr;
  }

  return form;
}
