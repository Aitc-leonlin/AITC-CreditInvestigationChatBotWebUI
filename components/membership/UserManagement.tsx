"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { Chip, Tooltip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getMembershipAccessToken,
  getStoredAuthUser,
  requestMembershipEmailVerification,
  type AuthUser,
} from "@/services/api/membershipAuthApi";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  activateMembershipUser,
  changeMembershipUserPassword,
  createMembershipUser,
  deactivateMembershipUser,
  deleteMembershipUser,
  fetchMembershipUsers,
  lockMembershipUser,
  resetMembershipUserPassword,
  unlockMembershipUser,
  updateMembershipUser,
  updateMembershipUserProfile,
  type MembershipUser,
  type MembershipUserCreatePayload,
  type MembershipUserPayload,
  type MembershipUserStatus,
} from "@/services/api/membershipUsersApi";

type UserDialogMode = "create" | "edit" | "profile" | "changePassword" | "resetPassword";

type UserFormState = {
  username: string;
  email: string;
  displayName: string;
  employeeNo: string;
  organizationId: string;
  status: MembershipUserStatus;
  locale: string;
  timezone: string;
  password: string;
  currentPassword: string;
  newPassword: string;
  mustChangePassword: boolean;
};

const DEFAULT_FORM_STATE: UserFormState = {
  username: "",
  email: "",
  displayName: "",
  employeeNo: "",
  organizationId: "org-root",
  status: "ACTIVE",
  locale: "zh-TW",
  timezone: "Asia/Taipei",
  password: "",
  currentPassword: "",
  newPassword: "",
  mustChangePassword: true,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW");
}

function userToFormState(user: MembershipUser): UserFormState {
  return {
    ...DEFAULT_FORM_STATE,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    employeeNo: user.employeeNo,
    organizationId: user.organizationId ?? "org-root",
    status: user.status,
    locale: user.locale,
    timezone: user.timezone,
    mustChangePassword: user.mustChangePassword,
  };
}

function toUserPayload(form: UserFormState): MembershipUserPayload {
  return {
    username: form.username,
    email: form.email,
    displayName: form.displayName,
    employeeNo: form.employeeNo,
    organizationId: form.organizationId || null,
    status: form.status,
    locale: form.locale,
    timezone: form.timezone,
  };
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const { hasPermission } = useMembershipPermissions();
  const canWriteUsers = hasPermission("membership.write");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogMode, setDialogMode] = useState<UserDialogMode | null>(null);
  const [selectedUser, setSelectedUser] = useState<MembershipUser | null>(null);
  const [form, setForm] = useState<UserFormState>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (!getMembershipAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthUser(getStoredAuthUser());
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetchMembershipUsers({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      });
      setUsers(result.users);
      setRowCount(result.total);
    } catch (error) {
      const message = error instanceof Error ? error.message : "讀取使用者清單失敗";
      toast.error(message);
      if (message.toLowerCase().includes("unauthorized") || message.includes("401")) {
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    router,
  ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreateDialog() {
    setSelectedUser(null);
    setForm(DEFAULT_FORM_STATE);
    setDialogMode("create");
  }

  function openUserDialog(mode: UserDialogMode, user: MembershipUser) {
    setSelectedUser(user);
    setForm(userToFormState(user));
    setDialogMode(mode);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUser(null);
    setForm(DEFAULT_FORM_STATE);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (dialogMode === "create") {
        const payload: MembershipUserCreatePayload = {
          ...toUserPayload(form),
          password: form.password,
          mustChangePassword: form.mustChangePassword,
        };
        await createMembershipUser(payload);
        toast.success("已新增使用者");
      } else if (dialogMode === "edit" && selectedUser) {
        await updateMembershipUser(selectedUser.id, toUserPayload(form));
        toast.success("已更新使用者");
      } else if (dialogMode === "profile" && selectedUser) {
        await updateMembershipUserProfile(selectedUser.id, {
          displayName: form.displayName,
          email: form.email,
          locale: form.locale,
          timezone: form.timezone,
        });
        toast.success("已更新個人資料");
      } else if (dialogMode === "changePassword" && selectedUser) {
        await changeMembershipUserPassword(selectedUser.id, {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
        toast.success("已修改密碼");
      } else if (dialogMode === "resetPassword" && selectedUser) {
        await resetMembershipUserPassword(selectedUser.id, {
          newPassword: form.newPassword,
          mustChangePassword: form.mustChangePassword,
        });
        toast.success("已重設密碼");
      }
      closeDialog();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "使用者操作失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleUserAction = useCallback(async (
    action: () => Promise<MembershipUser | { deleted: boolean }>,
    message: string,
  ) => {
    try {
      await action();
      toast.success(message);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "使用者操作失敗");
    }
  }, [loadUsers]);

  async function handleRequestEmailVerification() {
    try {
      const result = await requestMembershipEmailVerification();
      if (result.verificationToken) {
        // NOTE: 目前尚未串接實際寄信，所以暫時用 toast 顯示 verification token 供開發測試。
        // 正式產品應改為寄送 Email 驗證連結，不應在 UI 直接露出 token。
        toast.success(`Email 驗證 token：${result.verificationToken}`);
      } else {
        toast.success("已建立 Email 驗證請求");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email 驗證請求失敗");
    }
  }

  const columns: GridColDef<MembershipUser>[] = [
      {
        field: "displayName",
        headerName: "使用者",
        minWidth: 230,
        flex: 1.1,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full min-w-0 flex-col justify-center py-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {params.row.displayName}
            </div>
            <div className="truncate text-xs text-slate-500">
              {params.row.username}
            </div>
          </div>
        ),
      },
      {
        field: "email",
        headerName: "Email",
        minWidth: 230,
        flex: 1,
      },
      {
        field: "organizationName",
        headerName: "組織",
        minWidth: 150,
        flex: 0.7,
        valueGetter: (_, row) => row.organizationName || row.organizationId || "-",
      },
      {
        field: "status",
        headerName: "狀態",
        minWidth: 110,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center">
            <Chip
              label={params.row.status === "ACTIVE" ? "啟用" : "停用"}
              size="small"
              sx={{
                borderRadius: "999px",
                fontWeight: 700,
                color: params.row.status === "ACTIVE" ? "#166534" : "#991b1b",
                backgroundColor: params.row.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
              }}
            />
          </div>
        ),
      },
      {
        field: "lockedUntil",
        headerName: "鎖定",
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center">
            <Chip
              label={params.row.lockedUntil ? "已鎖定" : "未鎖定"}
              size="small"
              sx={{
                borderRadius: "999px",
                fontWeight: 700,
                color: params.row.lockedUntil ? "#92400e" : "#075985",
                backgroundColor: params.row.lockedUntil ? "#fef3c7" : "#e0f2fe",
              }}
            />
          </div>
        ),
      },
      {
        field: "updatedAt",
        headerName: "更新時間",
        minWidth: 180,
        flex: 0.8,
        valueGetter: (_, row) => formatDateTime(row.updatedAt),
      },
      {
        field: "actions",
        headerName: "操作",
        minWidth: 360,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center gap-1.5">
            {canWriteUsers ? (
              <>
                <IconAction title="編輯" onClick={() => openUserDialog("edit", params.row)}>
                  <Pencil className="h-4 w-4" />
                </IconAction>
                <IconAction title="個人資料" onClick={() => openUserDialog("profile", params.row)}>
                  <UserCog className="h-4 w-4" />
                </IconAction>
                <IconAction title="修改密碼" onClick={() => openUserDialog("changePassword", params.row)}>
                  <KeyRound className="h-4 w-4" />
                </IconAction>
                <IconAction title="管理員重設密碼" onClick={() => openUserDialog("resetPassword", params.row)}>
                  <RefreshCw className="h-4 w-4" />
                </IconAction>
              </>
            ) : null}
            {params.row.status === "ACTIVE" ? (
              canWriteUsers ? (
                <IconAction title="停用" onClick={() => handleUserAction(() => deactivateMembershipUser(params.row.id), "已停用帳號")}>
                  <Ban className="h-4 w-4" />
                </IconAction>
              ) : null
            ) : (
              canWriteUsers ? (
                <IconAction title="啟用" onClick={() => handleUserAction(() => activateMembershipUser(params.row.id), "已啟用帳號")}>
                  <CheckCircle2 className="h-4 w-4" />
                </IconAction>
              ) : null
            )}
            {params.row.lockedUntil ? (
              canWriteUsers ? (
                <IconAction title="解鎖" onClick={() => handleUserAction(() => unlockMembershipUser(params.row.id), "已解鎖帳號")}>
                  <Unlock className="h-4 w-4" />
                </IconAction>
              ) : null
            ) : (
              canWriteUsers ? (
                <IconAction title="鎖定" onClick={() => handleUserAction(() => lockMembershipUser(params.row.id), "已鎖定帳號")}>
                  <Lock className="h-4 w-4" />
                </IconAction>
              ) : null
            )}
            {canWriteUsers ? (
              <IconAction title="刪除" danger onClick={() => handleUserAction(() => deleteMembershipUser(params.row.id), "已刪除帳號")}>
                <Trash2 className="h-4 w-4" />
              </IconAction>
            ) : null}
          </div>
        ),
      },
    ];

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="flex h-full min-h-0 flex-col gap-4 px-5 py-5 md:px-7">
        <section className="shrink-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#12344a]">會員帳號管理</h1>
              <p className="mt-1 text-sm text-[#5d7b90]">
                管理企業使用者帳號、狀態、鎖定與密碼維護。
                {authUser ? ` 目前登入：${authUser.displayName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadUsers()}>
                <RefreshCw className="h-4 w-4" />
                重新整理
              </Button>
              <Button variant="outline" onClick={handleRequestEmailVerification}>
                <CheckCircle2 className="h-4 w-4" />
                Email 驗證
              </Button>
              {canWriteUsers ? (
                <Button onClick={openCreateDialog} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
                  <Plus className="h-4 w-4" />
                  新增使用者
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
          <DataGrid
            rows={users}
            columns={columns}
            rowCount={rowCount}
            loading={isLoading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            getRowHeight={() => 64}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f4fafe",
                color: "#12344a",
                fontWeight: 700,
              },
              "& .MuiDataGrid-cell": {
                borderColor: "#e5eef5",
              },
            }}
          />
        </section>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto border-[#d6e8f4] bg-white">
          <DialogHeader>
            <DialogTitle>{dialogTitle(dialogMode)}</DialogTitle>
            <DialogDescription>
              {dialogDescription(dialogMode)}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {dialogMode === "create" || dialogMode === "edit" ? (
              <UserFields
                form={form}
                setForm={setForm}
                includePassword={dialogMode === "create"}
              />
            ) : null}
            {dialogMode === "profile" ? (
              <ProfileFields form={form} setForm={setForm} />
            ) : null}
            {dialogMode === "changePassword" ? (
              <PasswordFields form={form} setForm={setForm} includeCurrentPassword />
            ) : null}
            {dialogMode === "resetPassword" ? (
              <PasswordFields form={form} setForm={setForm} includeMustChange />
            ) : null}

            <div className="flex justify-end gap-2 border-t border-[#e5eef5] pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
                儲存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function IconAction({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
          danger
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-[#d6e8f4] bg-[#f8fcff] text-[#235c7c] hover:bg-[#eef7fc]"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function UserFields({
  form,
  setForm,
  includePassword,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  includePassword: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="帳號">
        <Input value={form.username} onChange={(event) => setFormValue(setForm, "username", event.target.value)} required minLength={3} />
      </Field>
      <Field label="姓名">
        <Input value={form.displayName} onChange={(event) => setFormValue(setForm, "displayName", event.target.value)} required />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(event) => setFormValue(setForm, "email", event.target.value)} required />
      </Field>
      <Field label="員工編號">
        <Input value={form.employeeNo} onChange={(event) => setFormValue(setForm, "employeeNo", event.target.value)} />
      </Field>
      <Field label="組織 ID">
        <Input value={form.organizationId} onChange={(event) => setFormValue(setForm, "organizationId", event.target.value)} />
      </Field>
      <Field label="狀態">
        <select
          value={form.status}
          onChange={(event) => setFormValue(setForm, "status", event.target.value as MembershipUserStatus)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="ACTIVE">啟用</option>
          <option value="INACTIVE">停用</option>
        </select>
      </Field>
      <Field label="語系">
        <Input value={form.locale} onChange={(event) => setFormValue(setForm, "locale", event.target.value)} />
      </Field>
      <Field label="時區">
        <Input value={form.timezone} onChange={(event) => setFormValue(setForm, "timezone", event.target.value)} />
      </Field>
      {includePassword ? (
        <Field label="初始密碼">
          <Input type="password" value={form.password} onChange={(event) => setFormValue(setForm, "password", event.target.value)} minLength={8} required />
        </Field>
      ) : null}
      <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.mustChangePassword}
          onChange={(event) => setFormValue(setForm, "mustChangePassword", event.target.checked)}
        />
        下次登入需變更密碼
      </label>
    </div>
  );
}

function ProfileFields({
  form,
  setForm,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="姓名">
        <Input value={form.displayName} onChange={(event) => setFormValue(setForm, "displayName", event.target.value)} required />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(event) => setFormValue(setForm, "email", event.target.value)} required />
      </Field>
      <Field label="語系">
        <Input value={form.locale} onChange={(event) => setFormValue(setForm, "locale", event.target.value)} />
      </Field>
      <Field label="時區">
        <Input value={form.timezone} onChange={(event) => setFormValue(setForm, "timezone", event.target.value)} />
      </Field>
    </div>
  );
}

function PasswordFields({
  form,
  setForm,
  includeCurrentPassword,
  includeMustChange,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  includeCurrentPassword?: boolean;
  includeMustChange?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {includeCurrentPassword ? (
        <Field label="目前密碼">
          <Input type="password" value={form.currentPassword} onChange={(event) => setFormValue(setForm, "currentPassword", event.target.value)} required />
        </Field>
      ) : null}
      <Field label="新密碼">
        <Input type="password" value={form.newPassword} onChange={(event) => setFormValue(setForm, "newPassword", event.target.value)} required minLength={8} />
      </Field>
      {includeMustChange ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.mustChangePassword}
            onChange={(event) => setFormValue(setForm, "mustChangePassword", event.target.checked)}
          />
          下次登入需變更密碼
        </label>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function setFormValue<Key extends keyof UserFormState>(
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>,
  key: Key,
  value: UserFormState[Key],
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function dialogTitle(mode: UserDialogMode | null) {
  switch (mode) {
    case "create":
      return "新增使用者";
    case "edit":
      return "修改使用者";
    case "profile":
      return "修改個人資料";
    case "changePassword":
      return "修改密碼";
    case "resetPassword":
      return "管理員重設密碼";
    default:
      return "使用者維護";
  }
}

function dialogDescription(mode: UserDialogMode | null) {
  switch (mode) {
    case "create":
      return "建立企業會員帳號並設定初始密碼。";
    case "edit":
      return "更新帳號主檔、組織與啟用狀態。";
    case "profile":
      return "更新姓名、Email、語系與時區。";
    case "changePassword":
      return "使用目前密碼驗證後變更密碼。";
    case "resetPassword":
      return "由管理員直接設定新密碼並可要求使用者下次登入變更。";
    default:
      return "";
  }
}
