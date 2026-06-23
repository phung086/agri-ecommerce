"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, getApiErrorMessage } from "@/lib/admin-utils";
import { adminService } from "@/services/admin.service";

const CONTACT_FETCH_PARAMS = {
  page: 0,
  size: 100,
  sort: "createdAt,desc",
};

const CONTACT_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả liên hệ" },
  { value: "unreplied", label: "Chưa phản hồi" },
  { value: "replied", label: "Đã phản hồi" },
];

function readPageContent(response) {
  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return Array.isArray(response) ? response : [];
}

function getContactStatus(contact) {
  return contact.replied ? "replied" : "unreplied";
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadContacts() {
      setLoading(true);
      setError("");

      try {
        const response = await adminService.getContacts(CONTACT_FETCH_PARAMS);

        if (mounted) {
          setContacts(readPageContent(response));
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadContacts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      const status = getContactStatus(contact);
      const matchesKeyword =
        !keyword ||
        [contact.fullName, contact.phoneNumber, contact.email, contact.message]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [contacts, searchTerm, statusFilter]);

  const contactStats = useMemo(() => {
    const replied = contacts.filter((contact) => contact.replied).length;
    const unreplied = contacts.length - replied;

    return { replied, unreplied };
  }, [contacts]);

  function updateContactInState(updatedContact) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === updatedContact.id ? updatedContact : contact
      )
    );
    setSelectedContact((current) =>
      current?.id === updatedContact.id ? updatedContact : current
    );
  }

  async function refreshContacts() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await adminService.getContacts(CONTACT_FETCH_PARAMS);
      setContacts(readPageContent(response));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleViewContact(contact) {
    setSelectedContact(contact);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await adminService.getContact(contact.id);
      setSelectedContact(detail);
      updateContactInState(detail);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleReply(contact) {
    setActionLoading(`reply:${contact.id}`);
    setError("");
    setNotice("");

    try {
      const updatedContact = await adminService.updateContactReplied(
        contact.id,
        { replied: !contact.replied }
      );
      updateContactInState(updatedContact);
      setNotice(
        `Đã cập nhật liên hệ #${updatedContact.id} thành ${
          updatedContact.replied ? "đã phản hồi" : "chưa phản hồi"
        }.`
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  async function deleteContact(contact) {
    const confirmed = window.confirm(`Xóa liên hệ #${contact.id}?`);

    if (!confirmed) {
      return;
    }

    setActionLoading(`delete:${contact.id}`);
    setError("");
    setNotice("");

    try {
      await adminService.deleteContact(contact.id);
      setContacts((current) =>
        current.filter((item) => item.id !== contact.id)
      );
      setSelectedContact((current) =>
        current?.id === contact.id ? null : current
      );
      setNotice(`Đã xóa liên hệ #${contact.id}.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Quản lí liên hệ"
        description="Theo dõi yêu cầu hỗ trợ từ khách hàng, đánh dấu phản hồi và dọn các liên hệ đã xử lý bằng API thật."
        image="/admin-assets/contacts.svg"
        badges={["Admin API", "Contact support", "Database"]}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng liên hệ"
          value={formatNumber(contacts.length)}
          description="Đọc từ admin API"
          icon={Mail}
          tone="green"
        />
        <StatCard
          title="Chưa phản hồi"
          value={formatNumber(contactStats.unreplied)}
          description="Cần xử lý"
          icon={Phone}
          tone="amber"
        />
        <StatCard
          title="Đã phản hồi"
          value={formatNumber(contactStats.replied)}
          description="Đã xử lý"
          icon={CheckCircle2}
          tone="blue"
        />
      </section>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại, nội dung"
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {CONTACT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={refreshContacts}
          disabled={loading}
          className="font-bold"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Làm mới
        </Button>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <DataTable
        columns={[
          "Khách liên hệ",
          "Nội dung",
          "Ngày gửi",
          "Trạng thái",
          "Thao tác",
        ]}
        data={filteredContacts}
        loading={loading}
        error={loading || contacts.length === 0 ? error : ""}
        emptyText="Không tìm thấy liên hệ"
        renderRow={(contact) => (
          <TableRow key={contact.id}>
            <TableCell className="px-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.fullName}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Mail className="size-3" />
                    <span className="truncate">
                      {contact.email || "Chưa có email"}
                    </span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="size-3" />
                    <span>
                      {contact.phoneNumber || "Chưa có số điện thoại"}
                    </span>
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="max-w-sm whitespace-normal px-4 text-muted-foreground">
              {contact.message}
            </TableCell>
            <TableCell className="px-4">{formatDate(contact.createdAt)}</TableCell>
            <TableCell className="px-4">
              <StatusBadge status={getContactStatus(contact)} />
            </TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  title="Xem liên hệ"
                  aria-label="Xem liên hệ"
                  onClick={() => handleViewContact(contact)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={contact.replied ? "outline" : "default"}
                  size="sm"
                  disabled={Boolean(actionLoading)}
                  onClick={() => toggleReply(contact)}
                >
                  {actionLoading === `reply:${contact.id}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {contact.replied ? "Mở lại" : "Đã phản hồi"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  title="Xóa liên hệ"
                  aria-label="Xóa liên hệ"
                  disabled={Boolean(actionLoading)}
                  onClick={() => deleteContact(contact)}
                >
                  {actionLoading === `delete:${contact.id}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={Boolean(selectedContact)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedContact(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          {selectedContact && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Liên hệ #{selectedContact.id}</DialogTitle>
                <DialogDescription>
                  Chi tiết liên hệ lấy từ API quản trị.
                </DialogDescription>
              </DialogHeader>

              {detailLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm font-semibold text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang tải chi tiết liên hệ...
                </div>
              )}

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Khách hàng
                  </p>
                  <p className="mt-1 font-medium">{selectedContact.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Trạng thái
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={getContactStatus(selectedContact)} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="mt-1 text-sm">
                    {selectedContact.email || "Chưa có email"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Số điện thoại
                  </p>
                  <p className="mt-1 text-sm">
                    {selectedContact.phoneNumber || "Chưa có số điện thoại"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Nội dung
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selectedContact.message}
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={() => toggleReply(selectedContact)}
                >
                  <CheckCircle2 className="size-4" />
                  {selectedContact.replied ? "Mở lại" : "Đánh dấu phản hồi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedContact(null)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
