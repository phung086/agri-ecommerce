"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  VIETNAM_PROVINCES,
  findAddressOption,
  getProvinceLabel,
} from "@/lib/vietnam-addresses";

const selectClassName =
  "h-10 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function VietnamAddressFields({
  value,
  onChange,
  idPrefix = "vietnam-address",
  required = false,
  disabled = false,
  className = "",
  gridClassName = "grid gap-4 sm:grid-cols-2",
  detailLabel = "Địa chỉ cụ thể",
  detailPlaceholder = "Số nhà, tên đường...",
  detailRows = 3,
}) {
  const form = value || {};
  const selectedProvince = findAddressOption(
    VIETNAM_PROVINCES,
    form.provinceCode
  );
  const selectedDistrict = findAddressOption(
    selectedProvince?.districts,
    form.districtCode
  );
  const districtOptions = selectedProvince?.districts ?? [];
  const wardOptions = selectedDistrict?.wards ?? [];

  function updateAddress(patch) {
    onChange?.({ ...form, ...patch });
  }

  function handleProvinceChange(code) {
    const province = findAddressOption(VIETNAM_PROVINCES, code);
    updateAddress({
      provinceCode: code,
      provinceName: province ? getProvinceLabel(province) : "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    });
  }

  function handleDistrictChange(code) {
    const district = findAddressOption(selectedProvince?.districts, code);
    updateAddress({
      districtCode: code,
      districtName: district?.name ?? "",
      wardCode: "",
      wardName: "",
    });
  }

  function handleWardChange(code) {
    const ward = findAddressOption(selectedDistrict?.wards, code);
    updateAddress({
      wardCode: code,
      wardName: ward?.name ?? "",
    });
  }

  return (
    <div className={className}>
      <div className={gridClassName}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-province`}>Tỉnh/thành phố</Label>
          <select
            id={`${idPrefix}-province`}
            value={form.provinceCode || ""}
            onChange={(event) => handleProvinceChange(event.target.value)}
            required={required}
            disabled={disabled}
            className={selectClassName}
          >
            <option value="">Chọn tỉnh/thành phố</option>
            {VIETNAM_PROVINCES.map((province) => (
              <option key={province.code} value={province.code}>
                {getProvinceLabel(province)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-district`}>Quận/huyện</Label>
          <select
            id={`${idPrefix}-district`}
            value={form.districtCode || ""}
            onChange={(event) => handleDistrictChange(event.target.value)}
            required={required}
            disabled={disabled || !selectedProvince}
            className={selectClassName}
          >
            <option value="">Chọn quận/huyện</option>
            {districtOptions.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-ward`}>Phường/xã</Label>
          <select
            id={`${idPrefix}-ward`}
            value={form.wardCode || ""}
            onChange={(event) => handleWardChange(event.target.value)}
            required={required}
            disabled={disabled || !selectedDistrict}
            className={selectClassName}
          >
            <option value="">Chọn phường/xã</option>
            {wardOptions.map((ward) => (
              <option key={ward.code} value={ward.code}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-detail`}>{detailLabel}</Label>
          <Textarea
            id={`${idPrefix}-detail`}
            value={form.address || ""}
            onChange={(event) =>
              updateAddress({ address: event.target.value })
            }
            rows={detailRows}
            required={required}
            disabled={disabled}
            placeholder={detailPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
