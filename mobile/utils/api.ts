import { request } from "@/services/api-client";
import { dataService } from "@/services/data-service";
import type { MenuSort } from "@/utils/types";

type Result<T = any> = { data: T | null; error: Error | null; count?: number | null };

const endpoints: Record<string, string> = {
  role: "roles",
  category: "categories",
  menu: "menus",
  shop: "shop",
  orders: "orders",
};

class Query implements PromiseLike<Result> {
  private filters = new Map<string, any>();
  private values: any = null;
  private action: "select" | "insert" | "update" = "select";
  private one = false;
  private archived = false;
  private ids: any[] | null = null;
  private minValues = new Map<string, any>();
  private maxValues = new Map<string, any>();
  private sortBy: { field: string; ascending: boolean } | null = null;
  private slice: { from: number; to: number } | null = null;
  private maxRows: number | null = null;

  constructor(private table: string) {}
  select(_columns?: string, _options?: { count?: string }) { return this; }
  insert(values: any) { this.action = "insert"; this.values = values; return this; }
  update(values: any) { this.action = "update"; this.values = values; return this; }
  eq(field: string, value: any) { this.filters.set(field, value); if (field === "is_archive" && value === true) this.archived = true; return this; }
  neq(field: string, value: any) { this.filters.set(`neq:${field}`, value); return this; }
  gte(field: string, value: any) { this.minValues.set(field, value); return this; }
  lte(field: string, value: any) { this.maxValues.set(field, value); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sortBy = { field, ascending: options?.ascending !== false }; return this; }
  limit(amount: number) { this.maxRows = amount; return this; }
  range(from: number, to: number) { this.slice = { from, to }; return this; }
  in(_field: string, values: any[]) { this.ids = values.map(String); return this; }
  single() { this.one = true; return this; }

  then<TResult1 = Result, TResult2 = never>(
    resolve?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<Result> {
    try {
      if (this.action !== "select") return await this.mutate();
      let data: any;
      const id = this.filters.get("id");
      if (this.table === "profiles") data = await dataService.profile(String(id));
      else if (this.table === "order_items") data = (await dataService.order(String(this.filters.get("order_id")))).items;
      else if (this.table === "orders" && id) data = await dataService.order(String(id));
      else if (this.table === "orders") data = await dataService.orders();
      else if (this.table === "menu" && id) data = await dataService.menu(id);
      else if (this.table === "menu") data = await dataService.menus(this.filters.get("category_id"), this.archived, this.menuSort());
      else if (this.table === "category") data = await dataService.categories();
      else if (this.table === "role") data = await dataService.roles();
      else if (this.table === "shop") data = await dataService.shop();
      else throw new Error(`Resource ${this.table} belum didukung`);
      if (Array.isArray(data)) {
        if (this.ids) data = data.filter((item: any) => this.ids!.includes(String(item.id)));
        for (const [key, value] of this.minValues) data = data.filter((item: any) => item[key] >= value);
        for (const [key, value] of this.maxValues) data = data.filter((item: any) => item[key] <= value);
        for (const [key, value] of this.filters) {
          if (key.startsWith("neq:")) {
            data = data.filter((item: any) => item[key.slice(4)] !== value);
          } else {
            data = data.filter((item: any) => item[key] === value);
          }
        }
        if (this.sortBy) {
          const { field, ascending } = this.sortBy;
          data.sort((left: any, right: any) => (left[field] > right[field] ? 1 : -1) * (ascending ? 1 : -1));
        }
        const count = data.length;
        if (this.slice) data = data.slice(this.slice.from, this.slice.to + 1);
        else if (this.maxRows !== null) data = data.slice(0, this.maxRows);
        return { data: this.one ? data[0] : data, error: null, count };
      }
      return { data, error: null, count: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private menuSort(): MenuSort {
    if (!this.sortBy) return "newest";
    if (this.sortBy.field === "name_menu") return this.sortBy.ascending ? "az" : "za";
    if (this.sortBy.field === "created_at") return this.sortBy.ascending ? "oldest" : "newest";
    return "newest";
  }

  private async mutate(): Promise<Result> {
    const resource = endpoints[this.table];
    if (!resource) return { data: null, error: new Error(`Resource ${this.table} belum didukung`) };
    try {
      const id = this.filters.get("id");
      let payload = this.values;
      if (this.action === "update" && this.table === "menu" && id && this.values?.is_deleted === true) {
        await dataService.remove("menus", id);
        return { data: null, error: null };
      }
      if (this.action === "update" && this.table === "menu" && id) {
        payload = { ...(await dataService.menu(id)), ...this.values };
      }
      const data = this.action === "insert"
        ? await dataService.create(resource, payload)
        : await dataService.update(resource, this.table === "shop" ? null : id, payload);
      return { data: this.one ? data : data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

const uploaded = new Map<string, string>();

export const api = {
  from(table: string) {
    return new Query(table);
  },
  storage: {
    from(_bucket: string) {
      return {
        async upload(name: string, file: ArrayBuffer | { uri: string; name: string; type: string }, _options?: unknown) {
          try {
            const body = new FormData();
            if (file instanceof ArrayBuffer) {
              body.append("file", new Blob([file as BlobPart]), name);
            } else {
              body.append("file", file as any);
            }
            const result = await request<{ publicUrl: string }>(`/v1/uploads/menu?public_id=${encodeURIComponent(name)}`, { method: "POST", body });
            uploaded.set(name, result.publicUrl);
            return { data: result, error: null };
          } catch (error) {
            return { data: null, error: error as Error };
          }
        },
        getPublicUrl(name: string) {
          return { data: { publicUrl: uploaded.get(name) || "" } };
        },
      };
    },
  },
};
