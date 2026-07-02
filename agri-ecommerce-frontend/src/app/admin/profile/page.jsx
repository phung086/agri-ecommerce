"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTH_SCOPES,
  getAuthSession,
  isAuthSessionRemembered,
  saveAuthSession,
} from "@/lib/auth-storage";
import { getApiErrorMessage, getAssetUrl } from "@/lib/admin-utils";
import {
  getVietnamPhoneError,
  normalizeVietnamPhone,
} from "@/lib/profile-validation";
import { profileService } from "@/services/profile.service";

const blankProfileForm = {
  name: "",
  phoneNumber: "",
  avatar: "",
  address: "",
};

const blankPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function unwrapApiData(response) {
  return response?.data ?? response;
}

function getInitial(user) {
  return (user?.name || user?.email || "A").charAt(0).toUpperCase();
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(blankProfileForm);
  const [passwordForm, setPasswordForm] = useState(blankPasswordForm);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const applyProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setProfileForm({
      name: nextProfile?.name || "",
      phoneNumber: nextProfile?.phoneNumber || "",
      avatar: nextProfile?.avatar || "",
      address: nextProfile?.address || "",
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await profileService.getProfile();
      applyProfile(unwrapApiData(response));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadProfile, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile]);

  const stats = useMemo(
    () => [
      {
        title: "Vai trò",
        value: profile?.roleName || "admin",
        description: "Quyền quản trị hệ thống",
        icon: ShieldCheck,
        tone: "green",
      },
      {
        title: "Trạng thái",
        value: profile?.status || "Chưa tải",
        description: "Trạng thái tài khoản",
        icon: CheckCircle2,
        tone: "blue",
      },
      {
        title: "Liên hệ",
        value: profile?.phoneNumber || "Chưa thêm",
        description: "Số điện thoại vận hành",
        icon: Phone,
        tone: "amber",
      },
    ],
    [profile]
  );

  function updateProfileForm(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordForm(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function syncStoredAdminProfile(nextProfile) {
    const session = getAuthSession(AUTH_SCOPES.admin);

    if (!session?.accessToken) {
      return;
    }

    saveAuthSession(
      {
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        user: nextProfile,
        expiresIn: session.tokenExpiresAt
          ? Math.max(session.tokenExpiresAt - Date.now(), 0)
          : undefined,
      },
      {
        remember: isAuthSessionRemembered(AUTH_SCOPES.admin),
        scope: AUTH_SCOPES.admin,
      }
    );

    window.dispatchEvent(new Event("admin-auth-session-updated"));
  }

  async function handleAvatarFile(file) {
    if (!file) {
      return null;
    }

    const response = await profileService.uploadAvatar(file);
    const nextProfile = unwrapApiData(response);

    applyProfile(nextProfile);
    syncStoredAdminProfile(nextProfile);

    return nextProfile;
  }

  async function handleAvatarRemove() {
    const response = await profileService.deleteAvatar();
    const nextProfile = unwrapApiData(response);
    applyProfile(nextProfile);
    syncStoredAdminProfile(nextProfile);
    setNotice("Đã xóa ảnh đại diện admin.");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setNotice("");
    setError("");
    setPhoneError("");



    try {
      const phoneValidationError = getVietnamPhoneError(profileForm.phoneNumber);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        setError(phoneValidationError);
        setSavingProfile(false);
        return;
      }

      const response = await profileService.updateProfile({
        name: profileForm.name.trim(),
        phoneNumber: normalizeVietnamPhone(profileForm.phoneNumber),
        avatar: profileForm.avatar.trim(),
        address: profileForm.address.trim(),
      });
      const nextProfile = unwrapApiData(response);

      applyProfile(nextProfile);
      syncStoredAdminProfile(nextProfile);
      toast.success("Đã cập nhật hồ sơ admin.");
      setNotice("Đã cập nhật hồ sơ admin.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setError(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setSavingPassword(true);
    setNotice("");
    setError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setSavingPassword(false);
      return;
    }

    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm(blankPasswordForm);
      setNotice("Đã đổi mật khẩu admin.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  const adminInitial = getInitial(profile);
  const adminAvatarUrl = getAssetUrl(profileForm.avatar || profile?.avatar);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Hồ sơ admin"
        description="Cập nhật thông tin cá nhân, địa chỉ liên hệ và mật khẩu dùng cho tài khoản quản trị AgriMarket."
        image="/admin-assets/users.svg"
        badges={["Admin profile", "Customer profile API", "Bảo mật token"]}
      >
        <Button
          type="button"
          variant="outline"
          className="border-emerald-100 bg-white text-emerald-800"
          onClick={loadProfile}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          Tải lại
        </Button>
      </AdminPageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </section>

      {(notice || error) && (
        <div
          className={`rounded-[8px] border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-emerald-600 text-2xl font-black text-white shadow-sm">
                {adminAvatarUrl ? (
                  <span
                    className="size-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${adminAvatarUrl}")` }}
                  />
                ) : (
                  adminInitial
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase text-emerald-700">
                  Tài khoản quản trị
                </p>
                <h2 className="mt-1 truncate text-2xl font-black text-emerald-950">
                  {profile?.name || "Admin"}
                </h2>
                <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                  {profile?.email || "Đang tải email..."}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="flex items-center gap-2 font-black text-emerald-950">
                  <Mail className="size-4 text-emerald-700" />
                  Email đăng nhập
                </p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {profile?.email || "Chưa có"}
                </p>
              </div>
              <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
                <p className="flex items-center gap-2 font-black text-sky-950">
                  <MapPin className="size-4 text-sky-700" />
                  Địa chỉ liên hệ
                </p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {profile?.address || "Chưa có địa chỉ liên hệ."}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleChangePassword}
            className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-emerald-700">
                  Bảo mật
                </p>
                <h2 className="mt-1 text-xl font-black text-emerald-950">
                  Đổi mật khẩu
                </h2>
              </div>
              <div className="flex size-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <KeyRound className="size-5" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    updatePasswordForm("currentPassword", event.target.value)
                  }
                  className="h-10"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    updatePasswordForm("newPassword", event.target.value)
                  }
                  className="h-10"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    updatePasswordForm("confirmPassword", event.target.value)
                  }
                  className="h-10"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-4 h-10 bg-slate-950 font-bold hover:bg-emerald-700"
              disabled={savingPassword}
            >
              <KeyRound className="size-4" />
              {savingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </form>
        </div>

        <form
          onSubmit={handleSaveProfile}
          className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">
                Chỉnh sửa hồ sơ
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
                Thông tin admin
              </h2>
            </div>
            <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <UserRound className="size-5" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Họ tên</Label>
              <Input
                id="admin-name"
                value={profileForm.name}
                onChange={(event) =>
                  updateProfileForm("name", event.target.value)
                }
                className="h-11"
                placeholder="Admin User"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">Số điện thoại</Label>
              <Input
                id="admin-phone"
                type="tel"
                value={profileForm.phoneNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  updateProfileForm("phoneNumber", value);
                  setPhoneError(getVietnamPhoneError(value));
                }}
                className={`h-11 ${phoneError ? "border-red-500" : ""}`}
                placeholder="Nhập: 099999999 hoặc +84999999999"
                disabled={loading || uploadingAvatar}
              />
              {phoneError && (
                <p className="text-xs font-semibold text-red-600">{phoneError}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-avatar">Avatar</Label>
              <AvatarUploadField
                id="admin-avatar"
                value={profileForm.avatar}
                disabled={loading || savingProfile}
                uploading={uploadingAvatar}
                onChange={(value) => updateProfileForm("avatar", value)}
                onUpload={handleAvatarFile}
                onRemove={handleAvatarRemove}
                onUploadStart={() => {
                  setUploadingAvatar(true);
                  setError("");
                  setNotice("");
                }}
                onUploadEnd={() => setUploadingAvatar(false)}
                onUploadSuccess={(message) => {
                  setNotice(message);
                  toast.success(message);
                }}
                onUploadError={(message) => {
                  setError(message);
                  toast.error(message);
                }}
              />
              {uploadingAvatar && (
                <p className="text-xs font-semibold text-emerald-700">
                  Đang tải ảnh...
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-address">Địa chỉ liên hệ</Label>
              <Textarea
                id="admin-address"
                value={profileForm.address}
                onChange={(event) =>
                  updateProfileForm("address", event.target.value)
                }
                rows={5}
                placeholder="Địa chỉ vận hành hoặc liên hệ..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="submit"
              className="h-10 bg-emerald-600 font-bold hover:bg-emerald-700"
              disabled={savingProfile || loading || uploadingAvatar}
            >
              <Save className="size-4" />
              {savingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-emerald-100 bg-white text-emerald-800"
              onClick={loadProfile}
              disabled={loading}
            >
              <RefreshCw className="size-4" />
              Tải lại
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
