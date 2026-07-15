"use client";

import { useEffect, useState } from "react";

import { type AuditLogListResult, fetchMembershipAuditLogs } from "@/services/api/membershipAdminApi";

export default function AuditLogManagement() {
  const [result, setResult] = useState<AuditLogListResult | null>(null);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetchMembershipAuditLogs({ page, pageSize: 20, action, resourceType, outcome })
      .then((data) => {
        if (!ignore) {
          setResult(data);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Audit Log 載入失敗");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [action, resourceType, outcome, page]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / 20));

  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <section className="mb-5">
          <div className="text-xs font-semibold uppercase text-indigo-600">Audit</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Audit Log 查詢</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">查詢登入、權限與會員管理事件。</p>
        </section>

        <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <input
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Action"
          />
          <input
            value={resourceType}
            onChange={(event) => {
              setPage(1);
              setResourceType(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Resource type"
          />
          <select
            value={outcome}
            onChange={(event) => {
              setPage(1);
              setOutcome(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部結果</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setAction("");
              setResourceType("");
              setOutcome("");
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            清除篩選
          </button>
        </section>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(result?.logs ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt}</td>
                    <td className="px-4 py-3 text-slate-600">{log.actorDisplayName ?? log.actorUserId ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-950">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.resourceType}</td>
                    <td className="px-4 py-3 text-slate-600">{log.outcome}</td>
                    <td className="px-4 py-3 text-slate-600">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
                {!isLoading && (result?.logs ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={6}>
                      沒有符合條件的 Audit Log。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>共 {result?.total ?? 0} 筆</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              >
                上一頁
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
