"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  VIETNAM_PROVINCES,
  findAddressOption,
  getProvinceLabel,
} from "@/lib/vietnam-addresses";

export function VietnamAddressFields({
  value = {},
  onChange,
  idPrefix = "address",
  className = "",
  detailLabel = "Địa chỉ cụ thể",
  detailPlaceholder = "Số nhà, tên đường...",
  detailRows = 3,
}) {
  const selectedProvince = useMemo(() => {
    return findAddressOption(VIETNAM_PROVINCES, value.provinceCode);
  }, [value.provinceCode]);

  const selectedDistrict = useMemo(() => {
    if (!selectedProvince) return null;
    return findAddressOption(selectedProvince.districts || [], value.districtCode);
  }, [selectedProvince, value.districtCode]);

  const districtOptions = useMemo(() => {
    return selectedProvince?.districts || [];
  }, [selectedProvince]);

  const wardOptions = useMemo(() => {
    return selectedDistrict?.wards || [];
  }, [selectedDistrict]);

  const handleProvinceChange = (code) => {
    const province = findAddressOption(VIETNAM_PROVINCES, code);
    onChange((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName: province ? province.name : "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    }));
  };

  const handleDistrictChange = (code) => {
    if (!selectedProvince) return;
    const district = findAddressOption(selectedProvince.districts || [], code);
    onChange((prev) => ({
      ...prev,
      districtCode: code,
      districtName: district ? district.name : "",
      wardCode: "",
      wardName: "",
    }));
  };

  const handleWardChange = (code) => {
    if (!selectedDistrict) return;
    const ward = findAddressOption(selectedDistrict.wards || [], code);
    onChange((prev) => ({
      ...prev,
      wardCode: code,
      wardName: ward ? ward.name : "",
    }));
  };

  const handleDetailChange = (detail) => {
    onChange((prev) => ({
      ...prev,
      address: detail,
    }));
  };

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-province`}>Tỉnh/Thành phố</Label>
        <select
          id={`${idPrefix}-province`}
          value={value.provinceCode || ""}
          onChange={(e) => handleProvinceChange(e.target.value)}
          required
          className="h-11 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Chọn tỉnh/thành phố</option>
          {VIETNAM_PROVINCES.map((prov) => (
            <option key={prov.code} value={prov.code}>
              {getProvinceLabel(prov)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-district`}>Quận/Huyện</Label>
        <select
          id={`${idPrefix}-district`}
          value={value.districtCode || ""}
          onChange={(e) => handleDistrictChange(e.target.value)}
          disabled={!selectedProvince}
          required
          className="h-11 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Chọn quận/huyện</option>
          {districtOptions.map((dist) => (
            <option key={dist.code} value={dist.code}>
              {dist.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-ward`}>Phường/Xã</Label>
        <select
          id={`${idPrefix}-ward`}
          value={value.wardCode || ""}
          onChange={(e) => handleWardChange(e.target.value)}
          disabled={!selectedDistrict}
          required
          className="h-11 w-full rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Chọn phường/xã</option>
          {wardOptions.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-detail`}>{detailLabel}</Label>
        <Textarea
          id={`${idPrefix}-detail`}
          value={value.address || ""}
          onChange={(e) => handleDetailChange(e.target.value)}
          placeholder={detailPlaceholder}
          rows={detailRows}
          required
          className="bg-white border-emerald-100 focus-visible:ring-emerald-400"
        />
      </div>
    </div>
  );
}
