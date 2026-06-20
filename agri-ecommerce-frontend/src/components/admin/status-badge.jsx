import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  banned: "border-red-200 bg-red-50 text-red-700",
  deleted: "border-zinc-200 bg-zinc-100 text-zinc-600",
  in_stock: "border-emerald-200 bg-emerald-50 text-emerald-700",
  out_of_stock: "border-red-200 bg-red-50 text-red-700",
  hidden: "border-zinc-200 bg-zinc-100 text-zinc-600",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  delivered: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  inactive: "border-zinc-200 bg-zinc-100 text-zinc-600",
  expired: "border-orange-200 bg-orange-50 text-orange-700",
  replied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unreplied: "border-amber-200 bg-amber-50 text-amber-700",
};

const statusLabels = {
  active: "Hoạt động",
  pending: "Chờ xử lý",
  banned: "Bị khóa",
  deleted: "Đã xóa",
  in_stock: "Còn hàng",
  out_of_stock: "Hết hàng",
  hidden: "Đang ẩn",
  processing: "Đang xử lý",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  failed: "Thất bại",
  inactive: "Đã tắt",
  expired: "Hết hạn",
  replied: "Đã phản hồi",
  unreplied: "Chưa phản hồi",
};

export function StatusBadge({ status, className }) {
  const normalized = status || "pending";

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md border px-2 font-medium",
        statusStyles[normalized] || "border-zinc-200 bg-zinc-50 text-zinc-700",
        className
      )}
    >
      {statusLabels[normalized] || normalized}
    </Badge>
  );
}
