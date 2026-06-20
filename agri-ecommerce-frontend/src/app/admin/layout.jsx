import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Agri Admin",
  description: "Trang quản trị hệ thống nông sản trực tuyến",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
