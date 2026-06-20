import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "AgriMarket Admin",
  description: "Trang quản trị sàn thương mại điện tử nông sản AgriMarket.",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
