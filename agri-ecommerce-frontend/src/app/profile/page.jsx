"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Leaf,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTH_SCOPES,
  clearAuthSession,
  getAuthSession,
  isAuthSessionExpired,
  isAuthSessionRemembered,
  saveAuthSession,
} from "@/lib/auth-storage";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";

const blankLoginForm = {
  email: "",
  password: "",
};

const blankRegisterForm = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  address: "",
};

const blankProfileForm = {
  name: "",
  phoneNumber: "",
  address: "",
  avatar: "",
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
  return (user?.name || user?.email || "K").charAt(0).toUpperCase();
}

function AuthPanel({ onAuthenticated }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(blankLoginForm);
  const [registerForm, setRegisterForm] = useState(blankRegisterForm);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  function updateLogin(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (!isLogin) {
        await authService.register({
          name: registerForm.name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          phoneNumber: registerForm.phoneNumber.trim(),
          address: registerForm.address.trim(),
        });

        setLoginForm({
          email: registerForm.email.trim(),
          password: "",
        });
        setRegisterForm(blankRegisterForm);
        setShowPassword(false);
        setMode("login");
        setNotice("Đăng ký thành công. Vui lòng đăng nhập để vào hồ sơ.");
        return;
      }

      const response = await authService.login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      const payload = unwrapApiData(response);

      if (!payload?.accessToken) {
        setError("Phản hồi xác thực không có access token.");
        return;
      }

      saveAuthSession(payload, { remember, scope: AUTH_SCOPES.customer });
      onAuthenticated(payload.user || null);
      router.replace("/");
    } catch (err) {
      setError(
        err?.message ||
          (isLogin
            ? "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu."
            : "Không thể đăng ký tài khoản. Vui lòng thử lại.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-emerald-700">
            Tài khoản khách hàng
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
            {isLogin ? "Đăng nhập hồ sơ" : "Tạo tài khoản mới"}
          </h2>
        </div>
        <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <UserRound className="size-5" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-1">
        {[
          { value: "login", label: "Đăng nhập" },
          { value: "register", label: "Đăng ký" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setMode(item.value);
              setError("");
              setNotice("");
            }}
            className={`h-9 rounded-[8px] text-sm font-black transition ${
              mode === item.value
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-emerald-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="register-name">Họ tên</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="register-name"
                value={registerForm.name}
                onChange={(event) => updateRegister("name", event.target.value)}
                className="h-11 pl-9"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={isLogin ? "login-email" : "register-email"}>
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={isLogin ? "login-email" : "register-email"}
              type="email"
              value={isLogin ? loginForm.email : registerForm.email}
              onChange={(event) =>
                isLogin
                  ? updateLogin("email", event.target.value)
                  : updateRegister("email", event.target.value)
              }
              className="h-11 pl-9"
              placeholder="customer@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={isLogin ? "login-password" : "register-password"}>
            Mật khẩu
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={isLogin ? "login-password" : "register-password"}
              type={showPassword ? "text" : "password"}
              value={isLogin ? loginForm.password : registerForm.password}
              onChange={(event) =>
                isLogin
                  ? updateLogin("password", event.target.value)
                  : updateRegister("password", event.target.value)
              }
              className="h-11 pl-9 pr-10"
              placeholder={isLogin ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-phone">Số điện thoại</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="register-phone"
                  value={registerForm.phoneNumber}
                  onChange={(event) =>
                    updateRegister("phoneNumber", event.target.value)
                  }
                  className="h-11 pl-9"
                  placeholder="090..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-address">Địa chỉ</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="register-address"
                  value={registerForm.address}
                  onChange={(event) =>
                    updateRegister("address", event.target.value)
                  }
                  className="h-11 pl-9"
                  placeholder="Địa chỉ nhận hàng"
                />
              </div>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
          />
          Ghi nhớ đăng nhập trên thiết bị này
        </label>

        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {notice}
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full bg-emerald-600 font-bold hover:bg-emerald-700"
          disabled={loading}
        >
          {loading
            ? "Đang xử lý..."
            : isLogin
              ? "Đăng nhập"
              : "Đăng ký"}
          {!loading && <CheckCircle2 className="size-4" />}
        </Button>
      </form>
    </section>
  );
}

export default function CustomerProfilePage() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(blankProfileForm);
  const [passwordForm, setPasswordForm] = useState(blankPasswordForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const profileInitial = getInitial(profile);

  const profileStats = useMemo(
    () => [
      {
        title: "Trạng thái",
        value: profile?.status || "Chưa có",
        description: "Trạng thái tài khoản",
        icon: ShieldCheck,
        tone: "green",
      },
      {
        title: "Vai trò",
        value: profile?.roleName || "Customer",
        description: "Quyền sử dụng hệ thống",
        icon: UserRound,
        tone: "blue",
      },
      {
        title: "Liên hệ",
        value: profile?.phoneNumber || "Chưa thêm",
        description: "Số điện thoại giao hàng",
        icon: Phone,
        tone: "amber",
      },
    ],
    [profile]
  );

  const applyProfile = useCallback((nextProfile) => {
    setProfile(nextProfile);
    setForm({
      name: nextProfile?.name || "",
      phoneNumber: nextProfile?.phoneNumber || "",
      address: nextProfile?.address || "",
      avatar: nextProfile?.avatar || "",
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await profileService.getProfile();
      applyProfile(unwrapApiData(response));
      setAuthStatus("authenticated");
    } catch (err) {
      setError(err?.message || "Không thể tải hồ sơ khách hàng.");
      setAuthStatus("unauthenticated");
      clearAuthSession(AUTH_SCOPES.customer);
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = getAuthSession(AUTH_SCOPES.customer);

      if (!session?.accessToken || isAuthSessionExpired(session)) {
        clearAuthSession(AUTH_SCOPES.customer);
        setAuthStatus("unauthenticated");
        return;
      }

      setAuthStatus("authenticated");
      applyProfile(session.currentUser);
      loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyProfile, loadProfile]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordForm(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await profileService.updateProfile({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        avatar: form.avatar.trim(),
      });
      const nextProfile = unwrapApiData(response);
      applyProfile(nextProfile);
      const session = getAuthSession(AUTH_SCOPES.customer);

      if (session?.accessToken) {
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
            remember: isAuthSessionRemembered(AUTH_SCOPES.customer),
            scope: AUTH_SCOPES.customer,
          }
        );
      }

      setNotice("Đã cập nhật hồ sơ khách hàng.");
    } catch (err) {
      setError(err?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  function handleAuthenticated(user) {
    setAuthStatus("authenticated");
    applyProfile(user);
    loadProfile();
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setChangingPassword(true);
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setChangingPassword(false);
      return;
    }

    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm(blankPasswordForm);
      setNotice("Đã đổi mật khẩu khách hàng.");
    } catch (err) {
      setError(err?.message || "Không thể đổi mật khẩu.");
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    clearAuthSession(AUTH_SCOPES.customer);
    setProfile(null);
    setForm(blankProfileForm);
    setPasswordForm(blankPasswordForm);
    setAuthStatus("unauthenticated");
    setNotice("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f6faef] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-white shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-emerald-950">
                AgriMarket
              </p>
              <p className="hidden text-xs font-medium text-emerald-700 sm:block">
                Hồ sơ khách hàng
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              <ArrowLeft className="size-4" />
              Mua hàng
            </Link>
            {authStatus === "authenticated" && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Hồ sơ khách hàng"
          description="Quản lý thông tin cá nhân, số điện thoại và địa chỉ nhận hàng dùng cho trải nghiệm mua nông sản trên AgriMarket."
          image="/market-assets/fresh-market-hero.png"
          badges={["Customer profile", "Auth API", "Cập nhật hồ sơ"]}
        >
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <Home className="size-4" />
            Về trang mua hàng
          </Link>
        </AdminPageHeader>

        {authStatus === "checking" ? (
          <section className="rounded-[8px] border border-emerald-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
              <UserRound className="size-6" />
            </div>
            <p className="mt-4 font-black text-emerald-950">
              Đang kiểm tra phiên đăng nhập
            </p>
          </section>
        ) : authStatus !== "authenticated" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
              <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-emerald-950">
                Đăng nhập để dùng hồ sơ mua hàng
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Backend hiện hỗ trợ đăng ký, đăng nhập, lấy hồ sơ, cập nhật hồ
                sơ và đổi mật khẩu cho khách hàng. Trang này dùng trực tiếp các
                API đó.
              </p>
              {error && (
                <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {error}
                </div>
              )}
            </section>
            <AuthPanel onAuthenticated={handleAuthenticated} />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profileStats.map((item) => (
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

            <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="space-y-5">
                <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]">
                  <div className="flex items-start gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-[8px] bg-emerald-600 text-2xl font-black text-white shadow-sm">
                      {profileInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase text-emerald-700">
                        Thông tin tài khoản
                      </p>
                      <h2 className="mt-1 truncate text-2xl font-black text-emerald-950">
                        {profile?.name || "Khách hàng"}
                      </h2>
                      <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-[8px] border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="font-black text-emerald-950">Địa chỉ</p>
                      <p className="mt-1 leading-6 text-muted-foreground">
                        {profile?.address || "Chưa có địa chỉ nhận hàng."}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-sky-100 bg-sky-50 p-3">
                      <p className="font-black text-sky-950">Email đăng nhập</p>
                      <p className="mt-1 leading-6 text-muted-foreground">
                        {profile?.email}
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
                      <LockKeyhole className="size-5" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="customer-current-password">
                        Mật khẩu hiện tại
                      </Label>
                      <Input
                        id="customer-current-password"
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
                      <Label htmlFor="customer-new-password">Mật khẩu mới</Label>
                      <Input
                        id="customer-new-password"
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
                      <Label htmlFor="customer-confirm-password">
                        Xác nhận mật khẩu mới
                      </Label>
                      <Input
                        id="customer-confirm-password"
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
                    disabled={changingPassword}
                  >
                    <LockKeyhole className="size-4" />
                    {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                  </Button>
                </form>
              </div>

              <form
                onSubmit={handleSave}
                className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_16px_42px_rgba(15,61,38,0.07)]"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700">
                      Cập nhật hồ sơ
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-normal text-emerald-950">
                      Thông tin nhận hàng
                    </h2>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <UserRound className="size-5" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Họ tên</Label>
                    <Input
                      id="profile-name"
                      value={form.name}
                      onChange={(event) => updateForm("name", event.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Số điện thoại</Label>
                    <Input
                      id="profile-phone"
                      value={form.phoneNumber}
                      onChange={(event) =>
                        updateForm("phoneNumber", event.target.value)
                      }
                      className="h-11"
                      placeholder="090..."
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-avatar">Avatar URL</Label>
                    <Input
                      id="profile-avatar"
                      value={form.avatar}
                      onChange={(event) =>
                        updateForm("avatar", event.target.value)
                      }
                      className="h-11"
                      placeholder="uploads/avatars/customer.jpg"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-address">Địa chỉ nhận hàng</Label>
                    <Textarea
                      id="profile-address"
                      value={form.address}
                      onChange={(event) =>
                        updateForm("address", event.target.value)
                      }
                      rows={4}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                    />
                  </div>
                </div>

                {notice && (
                  <div className="mt-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    className="h-10 bg-emerald-600 font-bold hover:bg-emerald-700"
                    disabled={saving || loading}
                  >
                    <Save className="size-4" />
                    {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-emerald-100 bg-white text-emerald-800"
                    onClick={loadProfile}
                    disabled={loading}
                  >
                    Tải lại
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
