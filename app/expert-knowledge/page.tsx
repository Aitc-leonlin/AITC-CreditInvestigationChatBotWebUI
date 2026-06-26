"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import { Box, Chip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
  type ExpertKnowledgeEntry,
  readExpertKnowledgeEntries,
  writeExpertKnowledgeEntries,
} from "@/data/expertKnowledge";

function renderCompanyLabel(entry: ExpertKnowledgeEntry) {
  return entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE ||
    !entry.companyLabel
    ? "不指定特定公司"
    : entry.companyLabel;
}

export default function ExpertKnowledgePage() {
  const [entries, setEntries] = useState<ExpertKnowledgeEntry[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setEntries(readExpertKnowledgeEntries());
  }, []);

  const filteredEntries = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return entries;

    return entries.filter((entry) =>
      [
        entry.title,
        entry.industry,
        renderCompanyLabel(entry),
        entry.dataSource,
        entry.anchorDescription,
        entry.systemPrompt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [entries, searchKeyword]);

  function handleDelete(entryId: string) {
    const nextEntries = entries.filter((entry) => entry.id !== entryId);
    setEntries(nextEntries);
    writeExpertKnowledgeEntries(nextEntries);
  }

  const columns: GridColDef<ExpertKnowledgeEntry>[] = [
    {
      field: "title",
      headerName: "標題",
      minWidth: 240,
      flex: 1.2,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm font-semibold leading-6 text-slate-900">
          <div className="whitespace-normal break-words">
            {params.row.title || "未命名專家指引"}
          </div>
        </div>
      ),
    },
    {
      field: "industry",
      headerName: "產業",
      minWidth: 140,
      flex: 0.7,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center">
          <Chip
            label={params.row.industry || "未分類產業"}
            size="small"
            sx={{
              fontWeight: 700,
              color: "#075985",
              backgroundColor: "#e0f2fe",
              borderRadius: "999px",
            }}
          />
        </div>
      ),
    },
    {
      field: "companyLabel",
      headerName: "公司",
      minWidth: 180,
      flex: 0.9,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          <div className="whitespace-normal break-words">
            {renderCompanyLabel(params.row)}
          </div>
        </div>
      ),
    },
    {
      field: "dataSource",
      headerName: "資料來源",
      minWidth: 140,
      flex: 0.7,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          {params.row.dataSource || "財務報表"}
        </div>
      ),
    },
    {
      field: "updatedAt",
      headerName: "更新時間",
      minWidth: 180,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          {params.row.updatedAt
            ? new Date(params.row.updatedAt).toLocaleString("zh-TW")
            : "-"}
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 260,
      flex: 1,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<ExpertKnowledgeEntry>) => (
        <div className="flex h-full items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/expert-knowledge/${params.row.id}`}>
              <Eye className="h-4 w-4" />
              查看
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/expert-knowledge/${params.row.id}/edit`}>
              <Pencil className="h-4 w-4" />
              編輯
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`刪除 ${params.row.title}`}
            onClick={() => handleDelete(params.row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const paginationModel = useMemo(() => ({ page: 0, pageSize: 10 }), []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-sky-700">
                EXPERT KNOWLEDGE BASE
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                專家知識庫
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                管理 AI 授信助理在特定產業、公司與資料來源下優先採用的分析角度與回答方式。
              </p>
            </div>
            <div className="pointer-events-none ml-auto hidden flex-1 justify-end text-[#57A6D4]/25 md:flex">
              <PsychologyAltIcon sx={{ fontSize: "clamp(112px, 14vw, 180px)" }} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">已建立的專家指引</h2>
              <p className="text-sm text-muted-foreground">
                可依標題、產業、公司、資料來源與指引內容搜尋。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full min-w-[260px] sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜尋標題、產業、公司或指引內容"
                  className="pl-10"
                />
              </div>

              <Button
                type="button"
                asChild
                className="bg-[#3BA9D8] text-white hover:bg-[#2f95c1]"
              >
                <Link href="/expert-knowledge/new">
                  <Plus className="h-4 w-4" />
                  新增專家指引
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <Box
              sx={{
                width: "100%",
                "& .MuiDataGrid-cell": {
                  alignItems: "stretch",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f8fafc",
                },
              }}
            >
              <DataGrid
                autoHeight
                rows={filteredEntries}
                columns={columns}
                disableRowSelectionOnClick
                disableColumnFilter
                disableDensitySelector
                disableColumnSelector
                paginationModel={paginationModel}
                pageSizeOptions={[10]}
                localeText={{
                  noRowsLabel: "目前沒有符合條件的專家指引",
                }}
                getRowHeight={() => 84}
              />
            </Box>
          </div>
        </section>
      </div>
    </div>
  );
}
