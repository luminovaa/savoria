import { request, SessionUser } from "./api-client";

export const dataService = {
  roles: () => request<any[]>("/v1/roles"),
  profile: (id: string) => request<any>(`/v1/profiles/${id}`),
  categories: () => request<any[]>("/v1/categories"),
  menus: (categoryId?: number | null, archived = false) =>
    request<any[]>(`/v1/menus?archived=${archived}${categoryId ? `&category_id=${categoryId}` : ""}`),
  menu: (id: number | string) => request<any>(`/v1/menus/${id}`),
  shop: () => request<any>("/v1/shop"),
  orders: (params?: { month?: number; year?: number; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", String(params.month));
    if (params?.year) search.set("year", String(params.year));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    const query = search.toString();
    return request<any[]>(`/v1/orders${query ? `?${query}` : ""}`);
  },
  orderStats: (params?: { month?: number; year?: number }) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", String(params.month));
    if (params?.year) search.set("year", String(params.year));
    const query = search.toString();
    return request<any>(`/v1/orders/stats${query ? `?${query}` : ""}`);
  },
  order: (id: string) => request<any>(`/v1/orders/${id}`),
  create: (resource: string, value: any) => request<any>(`/v1/${resource}`, { method: "POST", body: JSON.stringify(value) }),
  update: (resource: string, id: string | number | null, value: any) =>
    request<any>(id == null ? `/v1/${resource}` : `/v1/${resource}/${id}`, {
      method: resource === "shop" ? "PUT" : "PATCH",
      body: JSON.stringify(value),
    }),
  remove: (resource: string, id: string | number) => request<void>(`/v1/${resource}/${id}`, { method: "DELETE" }),
  users: () => request<SessionUser[]>("/v1/users"),
  user: (id: string) => request<SessionUser>(`/v1/users/${id}`),
};

export const adminUserService = {
  list: dataService.users,
  create: (input: any) => dataService.create("users", input),
  get: dataService.user,
  update: ({ userId, ...input }: any) => dataService.update("users", userId, input),
  remove: (id: string) => dataService.remove("users", id),
};
