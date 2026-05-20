"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import ConstructionIcon from "@mui/icons-material/Construction";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EngineeringIcon from "@mui/icons-material/Engineering";
import FoundationIcon from "@mui/icons-material/Foundation";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MemoryIcon from "@mui/icons-material/Memory";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import TvIcon from "@mui/icons-material/Tv";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Box, Chip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
  type ExpertKnowledgeEntry,
  readExpertKnowledgeEntries,
  writeExpertKnowledgeEntries,
} from "@/data/expertKnowledge";

const INDUSTRY_ICON_PROPS = { sx: { fontSize: 16, color: "#075985" } } as const;

const INDUSTRY_ICON_MAP = {
  水泥建材: <FoundationIcon {...INDUSTRY_ICON_PROPS} />,
  半導體: <MemoryIcon {...INDUSTRY_ICON_PROPS} />,
  生技醫療: <HealthAndSafetyIcon {...INDUSTRY_ICON_PROPS} />,
  光電: <TvIcon {...INDUSTRY_ICON_PROPS} />,
  汽車工業: <DirectionsCarIcon {...INDUSTRY_ICON_PROPS} />,
  其他電子: <ElectricalServicesIcon {...INDUSTRY_ICON_PROPS} />,
  金融保險: <ApartmentIcon {...INDUSTRY_ICON_PROPS} />,
  建設營造: <ConstructionIcon {...INDUSTRY_ICON_PROPS} />,
  紡織纖維: <CheckroomIcon {...INDUSTRY_ICON_PROPS} />,
  通信網路: <SettingsInputAntennaIcon {...INDUSTRY_ICON_PROPS} />,
  貿易百貨: <LocalMallIcon {...INDUSTRY_ICON_PROPS} />,
  電子通路: <StorefrontIcon {...INDUSTRY_ICON_PROPS} />,
  電子零組件: <PrecisionManufacturingIcon {...INDUSTRY_ICON_PROPS} />,
  電線電纜: <ElectricalServicesIcon {...INDUSTRY_ICON_PROPS} />,
  機電設備: <EngineeringIcon {...INDUSTRY_ICON_PROPS} />,
  觀光旅遊: <TravelExploreIcon {...INDUSTRY_ICON_PROPS} />,
} as const;

export default function ExpertKnowledgePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<ExpertKnowledgeEntry[]>([]);

  useEffect(() => {
    setEntries(readExpertKnowledgeEntries());
  }, []);

  function handleDelete(entryId: string) {
    const targetEntry = entries.find((entry) => entry.id === entryId);
    if (!targetEntry) return;

    const shouldDelete = window.confirm(
      `確定要刪除「${targetEntry.companyLabel}」的專業分析指引嗎？`,
    );
    if (!shouldDelete) return;

    const nextEntries = entries.filter((entry) => entry.id !== entryId);
    setEntries(nextEntries);
    writeExpertKnowledgeEntries(nextEntries);
    toast.success("已刪除專業分析指引");
  }

  const columns: GridColDef<ExpertKnowledgeEntry>[] = [
    {
      field: "title",
      headerName: "標題",
      minWidth: 220,
      flex: 1,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm font-semibold leading-6 text-slate-900">
          <div className="whitespace-normal break-words">
            {params.row.title || "未設定標題"}
          </div>
        </div>
      ),
    },
    {
      field: "industry",
      headerName: "產業",
      minWidth: 140,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center">
          <Chip
            label={
              <span className="flex items-center gap-1.5">
                <span>{params.row.industry}</span>
                {INDUSTRY_ICON_MAP[
                  params.row.industry as keyof typeof INDUSTRY_ICON_MAP
                ] ?? <BusinessCenterIcon {...INDUSTRY_ICON_PROPS} />}
              </span>
            }
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
            {params.row.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE ||
            !params.row.companyLabel
              ? "不指定特定公司"
              : params.row.companyLabel}
          </div>
        </div>
      ),
    },
    {
      field: "dataSource",
      headerName: "資料來源",
      minWidth: 140,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center">
          <Chip
            label={params.row.dataSource}
            size="small"
            sx={{
              fontWeight: 700,
              color: "#1d4ed8",
              backgroundColor: "#dbeafe",
              borderRadius: "999px",
            }}
          />
        </div>
      ),
    },
    {
      field: "description",
      headerName: "錨定點",
      minWidth: 280,
      flex: 1.4,
      sortable: false,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-600">
          <div className="whitespace-normal break-words">
            {params.row.description || "未設定錨定點"}
          </div>
        </div>
      ),
    },
    
    {
      field: "updatedAt",
      headerName: "更新時間",
      minWidth: 190,
      flex: 0.9,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center">
          <span className="text-sm text-slate-600">
            {params.row.updatedAt
              ? new Date(params.row.updatedAt).toLocaleString("zh-TW")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 180,
      flex: 0.9,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<ExpertKnowledgeEntry>) => (
        <div className="flex h-full items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/expert_knowledge/${params.row.id}/edit`}>
              <Pencil className="h-4 w-4" />
              編輯
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`刪除 ${params.row.companyLabel} 的專業分析指引`}
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-sky-700">
                EXPERT KNOWLEDGE BASE
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                專家知識庫設定
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                以列表方式查看已建立的專業分析指引。若要新增或修改內容，請進入獨立頁面操作。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">已建立的分析指引</h2>
              <p className="text-sm text-muted-foreground">
                每一筆都會對應到特定公司，聊天時可自動套用。可直接在表格中搜尋、排序與管理。
              </p>
            </div>
            <Button type="button" asChild>
              <Link href="/expert_knowledge/new">
                <Plus className="h-4 w-4" />
                新增分析指引
              </Link>
            </Button>
          </div>

          <Box
            sx={{
              mt: 2.5,
              height: 680,
              width: "100%",
              "& .MuiDataGrid-root": {
                border: "1px solid hsl(var(--border))",
                borderRadius: "1rem",
                backgroundColor: "hsl(var(--background))",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid hsl(var(--border))",
              },
              "& .MuiDataGrid-cell": {
                alignItems: "center",
                borderColor: "hsl(var(--border))",
                whiteSpace: "normal",
                wordBreak: "break-word",
              },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f8fbff",
              },
              "& .MuiDataGrid-toolbarContainer": {
                padding: "12px",
                borderBottom: "1px solid hsl(var(--border))",
                justifyContent: "space-between",
              },
              "& .MuiDataGrid-filler": {
                backgroundColor: "hsl(var(--background))",
              },
            }}
          >
            <DataGrid
              rows={entries}
              columns={columns}
              disableRowSelectionOnClick
              onRowDoubleClick={(params) => {
                router.push(`/expert_knowledge/${params.row.id}/edit`);
              }}
              showToolbar
              pageSizeOptions={[5, 10, 20]}
              initialState={{
                pagination: { paginationModel },
                sorting: {
                  sortModel: [{ field: "updatedAt", sort: "desc" }],
                },
              }}
              getRowHeight={() => "auto"}
              getRowClassName={(params) =>
                params.indexRelativeToCurrentPage % 2 === 0
                  ? "bg-white"
                  : "bg-slate-50/35"
              }
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 250 },
                },
              }}
              localeText={{
                noRowsLabel: "尚未建立任何專業分析指引。",
                noResultsOverlayLabel: "找不到符合條件的資料。",
                toolbarQuickFilterPlaceholder:
                  "搜尋公司、產業、資料來源、schema key、敘述或指引內容",
                toolbarQuickFilterLabel: "搜尋",
              }}
            />
          </Box>
        </section>
      </div>
    </div>
  );
}
