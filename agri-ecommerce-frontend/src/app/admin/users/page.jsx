"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { adminService } from "@/services/admin.service";
import { getApiErrorMessage } from "@/lib/admin-utils";
import { userStatusOptions } from "@/lib/admin-mock-data";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    setNotice("");

    const [usersResult, rolesResult] = await Promise.allSettled([
      adminService.getUsers(),
      adminService.getRoles(),
    ]);

    if (usersResult.status === "fulfilled") {
      setUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
    } else {
      setUsers([]);
      setError(getApiErrorMessage(usersResult.reason));
    }

    if (rolesResult.status === "fulfilled") {
      setRoles(Array.isArray(rolesResult.value) ? rolesResult.value : []);
    } else {
      setRoles([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialUsers() {
      const [usersResult, rolesResult] = await Promise.allSettled([
        adminService.getUsers(),
        adminService.getRoles(),
      ]);

      if (!mounted) {
        return;
      }

      if (usersResult.status === "fulfilled") {
        setUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
      } else {
        setUsers([]);
        setError(getApiErrorMessage(usersResult.reason));
      }

      if (rolesResult.status === "fulfilled") {
        setRoles(Array.isArray(rolesResult.value) ? rolesResult.value : []);
      } else {
        setRoles([]);
      }

      setLoading(false);
    }

    loadInitialUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        !keyword ||
        [user.name, user.email, user.phoneNumber]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || String(user.roleId) === String(roleFilter);

      return matchesKeyword && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  const userStats = useMemo(() => {
    const active = users.filter((user) => user.status === "active").length;
    const banned = users.filter((user) => user.status === "banned").length;
    const adminRoles = users.filter((user) => user.roleName === "admin").length;

    return { active, banned, adminRoles };
  }, [users]);

  async function handleStatusChange(userId, status) {
    setUpdatingId(userId);
    setNotice("");

    try {
      const updatedUser = await adminService.updateUserStatus(userId, status);
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, ...updatedUser } : user
        )
      );
      setNotice("Đã cập nhật trạng thái người dùng.");
    } catch (err) {
      setNotice(getApiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí người dùng"
        description="Kiểm tra tài khoản, vai trò và trạng thái hoạt động. Trang này gọi API admin thật khi có token hợp lệ."
        image="/admin-assets/users.svg"
        badges={["Admin API", "Cần accessToken"]}
      >
        <Button type="button" variant="outline" onClick={loadUsers}>
          <RefreshCw className="size-4" />
          Tải lại
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng người dùng"
          value={users.length}
          description="Theo dữ liệu API admin"
          icon={Users}
          tone="green"
        />
        <StatCard
          title="Đang hoạt động"
          value={userStats.active}
          description="Có thể đăng nhập và mua hàng"
          icon={UserCheck}
          tone="blue"
        />
        <StatCard
          title="Quản trị viên"
          value={userStats.adminRoles}
          description="Role admin trong hệ thống"
          icon={ShieldCheck}
          tone="amber"
        />
        <StatCard
          title="Bị khóa"
          value={userStats.banned}
          description="Cần kiểm tra trước khi mở lại"
          icon={UserX}
          tone="rose"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {userStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="all">Tất cả vai trò</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          {notice}
        </div>
      )}

      <DataTable
        columns={["Người dùng", "Liên hệ", "Vai trò", "Trạng thái", "Cập nhật"]}
        data={filteredUsers}
        loading={loading}
        error={error}
        emptyText="Không tìm thấy người dùng"
        renderRow={(user) => (
          <TableRow key={user.id}>
            <TableCell className="px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID #{user.id}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4">
              <div className="min-w-0">
                <p className="truncate">{user.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.phoneNumber || "Chưa có số điện thoại"}
                </p>
              </div>
            </TableCell>
            <TableCell className="px-4">{user.roleName || "N/A"}</TableCell>
            <TableCell className="px-4">
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell className="px-4">
              <select
                value={user.status || "pending"}
                onChange={(event) => handleStatusChange(user.id, event.target.value)}
                disabled={updatingId === user.id}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
              >
                {userStatusOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </TableCell>
          </TableRow>
        )}
      />
    </div>
  );
}
