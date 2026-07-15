"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  FileSearch,
  KeyRound,
  PanelLeft,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { WidgetPermission } from "@/components/membership/authorization";
import {
  type AdminDashboard,
  fetchMembershipAdminDashboard,
} from "@/services/api/membershipAdminApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

const widgets = [
  {
    title: "會員帳號",
    description: "使用者新增、停用、鎖定與密碼維護。",
    href: "/membership/users",
    permission: "membership.read",
    icon: Users,
  },
  {
    title: "角色管理",
    description: "Role CRUD、多角色與角色權限設定。",
    href: "/membership/roles",
    permission: MODULE_PERMISSIONS.rbacView,
    icon: KeyRound,
  },
  {
    title: "功能權限管理",
    description: "Permission、Permission Group 與 resource/action 定義。",
    href: "/membership/permissions",
    permission: MODULE_PERMISSIONS.rbacView,
    icon: ShieldCheck,
  },
  {
    title: "使用者角色",
    description: "替使用者配置一個或多個角色。",
    href: "/membership/user-roles",
    permission: MODULE_PERMISSIONS.rbacView,
    icon: UserCog,
  },
  {
    title: "選單管理",
    description: "維護動態選單、route、icon 與 role menu mapping。",
    href: "/membership/menus",
    permission: "menu.read",
    icon: PanelLeft,
  },
  {
    title: "組織資料權限",
    description: "公司、部門、團隊、職位與資料可視範圍設定。",
    href: "/membership/organizations",
    permission: MODULE_PERMISSIONS.organizationScopeView,
    icon: Building2,
  },
  {
    title: "日誌安全",
    description: "Audit log 查詢、登入統計與操作紀錄追蹤。",
    href: "/membership/audit",
    permission: "audit.read",
    icon: FileSearch,
  },
  {
    title: "通知管理",
    description: "Email 通知範本、通知 outbox 與發送狀態管理。",
    href: "/membership/notifications",
    permission: "notification.manage",
    icon: Bell,
  },
];

function metricValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("zh-TW") : "0";
}

export default function MembershipDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetchMembershipAdminDashboard()
      .then((result) => {
        if (!ignore) {
          setDashboard(result);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "管理總覽載入失敗");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: "使用者總數", value: dashboard?.userStats.totalUsers },
      { label: "鎖定帳號", value: dashboard?.userStats.lockedUsers },
      { label: "角色數", value: dashboard?.permissionOverview.roles },
      { label: "權限數", value: dashboard?.permissionOverview.permissions },
      { label: "成功登入", value: dashboard?.loginStats.successfulLogins },
      { label: "失敗登入", value: dashboard?.loginStats.failedLogins },
      { label: "待發通知", value: dashboard?.notificationStats.pendingNotifications },
      { label: "已發通知", value: dashboard?.notificationStats.sentNotifications },
    ],
    [dashboard],
  );

  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <section className="mb-5">
          <div className="text-xs font-semibold uppercase text-indigo-600">Dashboard</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">會員權限管理總覽</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            權限總覽、使用者統計、登入統計、通知狀態與近期 Audit Log。
          </p>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {isLoading ? "-" : metricValue(metric.value)}
              </div>
            </div>
          ))}
        </section>

        {error ? (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">近期 Audit Log</h2>
            <Link href="/membership/audit" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
              查看全部
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboard?.recentAuditLogs ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.resourceType}</td>
                    <td className="px-4 py-3 text-slate-600">{log.outcome}</td>
                  </tr>
                ))}
                {!isLoading && (dashboard?.recentAuditLogs ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      目前沒有 Audit Log。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <WidgetPermission key={widget.href} permission={widget.permission}>
                <Link
                  href={widget.href}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">{widget.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{widget.description}</p>
                </Link>
              </WidgetPermission>
            );
          })}
        </section> */}
      </div>
    </main>
  );
}
