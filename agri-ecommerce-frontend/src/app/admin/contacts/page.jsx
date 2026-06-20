"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Mail, Phone, Search } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
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
import { contactStatusOptions, mockContacts } from "@/lib/admin-mock-data";
import { formatDate } from "@/lib/admin-utils";

function getContactStatus(contact) {
  return contact.isReplied ? "replied" : "unreplied";
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState(mockContacts);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState(null);
  const [notice, setNotice] = useState("");

  const filteredContacts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      const status = getContactStatus(contact);
      const matchesKeyword =
        !keyword ||
        [
          contact.fullName,
          contact.phoneNumber,
          contact.email,
          contact.message,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [contacts, searchTerm, statusFilter]);

  function markAsReplied(contactId) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              isReplied: true,
              updatedAt: new Date().toISOString(),
            }
          : contact
      )
    );
    setNotice("Đã đánh dấu liên hệ là đã phản hồi trong phiên demo.");
  }

  function toggleReply(contactId) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              isReplied: !contact.isReplied,
              updatedAt: new Date().toISOString(),
            }
          : contact
      )
    );
    setNotice("Đã cập nhật trạng thái liên hệ trong phiên demo.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
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
          {contactStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
        columns={[
          "Khách liên hệ",
          "Nội dung",
          "Ngày gửi",
          "Trạng thái",
          "Thao tác",
        ]}
        data={filteredContacts}
        emptyText="Không tìm thấy liên hệ"
        renderRow={(contact) => (
          <TableRow key={contact.id}>
            <TableCell className="px-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.fullName}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Mail className="size-3" />
                    <span className="truncate">{contact.email || "Chưa có email"}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="size-3" />
                    <span>{contact.phoneNumber || "Chưa có số điện thoại"}</span>
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
                  onClick={() => setSelectedContact(contact)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={contact.isReplied ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleReply(contact.id)}
                >
                  <CheckCircle2 className="size-4" />
                  {contact.isReplied ? "Mở lại" : "Đã phản hồi"}
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
                  Dữ liệu mẫu theo bảng contacts.
                </DialogDescription>
              </DialogHeader>

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
                <p className="text-xs font-medium text-muted-foreground">Nội dung</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selectedContact.message}
                </p>
              </div>

              <DialogFooter>
                {!selectedContact.isReplied && (
                  <Button
                    type="button"
                    onClick={() => {
                      markAsReplied(selectedContact.id);
                      setSelectedContact({
                        ...selectedContact,
                        isReplied: true,
                      });
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    Đánh dấu phản hồi
                  </Button>
                )}
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
