import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details: Record<string, unknown> } | null;
  meta: Record<string, unknown>;
};

export type MembershipMenu = {
  id: string;
  code: string;
  title: string;
  parentId: string | null;
  routePath: string;
  componentKey: string;
  icon: string;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  requiredPermissionCode: string | null;
  children: MembershipMenu[];
  createdAt: string;
  updatedAt: string;
};

export type MenuPayload = Pick<
  MembershipMenu,
  | "code"
  | "title"
  | "parentId"
  | "routePath"
  | "componentKey"
  | "icon"
  | "sortOrder"
  | "status"
  | "requiredPermissionCode"
>;

export type MenuPermission = {
  id: string;
  menuId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuPermissionPayload = Pick<
  MenuPermission,
  "roleId" | "canView" | "canCreate" | "canUpdate" | "canDelete"
>;

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "Menu API 呼叫失敗");
  }
  return body.data;
}

function menuPath(path = "") {
  return `${BACKEND_API_PATHS.membershipMenus}${path}`;
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getMembershipAuthHeaders() };
}

export async function fetchCurrentMembershipMenus() {
  const response = await fetchBackendApi(menuPath("/current"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<{ menus: MembershipMenu[] }>(response);
}

export async function fetchMembershipMenus(params: { status?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  const query = searchParams.toString();
  const response = await fetchBackendApi(`${menuPath()}${query ? `?${query}` : ""}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<MembershipMenu[]>(response);
}

export async function createMembershipMenu(payload: MenuPayload) {
  const response = await fetchBackendApi(menuPath(), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipMenu>(response);
}

export async function updateMembershipMenu(menuId: string, payload: MenuPayload) {
  const response = await fetchBackendApi(menuPath(`/${menuId}`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipMenu>(response);
}

export async function deleteMembershipMenu(menuId: string) {
  const response = await fetchBackendApi(menuPath(`/${menuId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}

export async function fetchMenuPermissions(menuId: string) {
  const response = await fetchBackendApi(menuPath(`/${menuId}/permissions`), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<MenuPermission[]>(response);
}

export async function setMenuPermission(menuId: string, payload: MenuPermissionPayload) {
  const response = await fetchBackendApi(menuPath(`/${menuId}/permissions`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MenuPermission>(response);
}

export async function deleteMenuPermission(menuId: string, roleId: string) {
  const response = await fetchBackendApi(menuPath(`/${menuId}/permissions/${roleId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}
