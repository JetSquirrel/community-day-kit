/**
 * 飞书开放平台最小客户端（多维表格）。零依赖：Node 18+ / Lambda 自带 fetch。
 * 旧仓库里 tenantToken / listRecords / updateRecord 在 4 个函数各抄了一份，这里收敛为一个。
 */

const BASE = 'https://open.feishu.cn/open-apis';

export interface FeishuRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

export class FeishuError extends Error {
  constructor(public code: number, msg: string) {
    super(msg);
  }
}

export class Feishu {
  private token: { value: string; exp: number } | null = null;

  constructor(private appId: string, private appSecret: string, private fetchImpl: typeof fetch = fetch) {}

  private async tenantToken(): Promise<string> {
    if (this.token && this.token.exp > Date.now()) return this.token.value;
    const res = await this.fetchImpl(`${BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
    });
    const data = (await res.json()) as { code: number; msg: string; tenant_access_token: string; expire: number };
    if (data.code !== 0) throw new FeishuError(data.code, `飞书鉴权失败：${data.msg}`);
    this.token = { value: data.tenant_access_token, exp: Date.now() + (data.expire - 300) * 1000 };
    return this.token.value;
  }

  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await this.tenantToken()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json()) as { code: number; msg: string; data: T };
    if (data.code !== 0) throw new FeishuError(data.code, `飞书 ${method} ${path} 失败：${data.code} ${data.msg}`);
    return data.data;
  }

  async listRecords(appToken: string, tableId: string): Promise<FeishuRecord[]> {
    const items: FeishuRecord[] = [];
    let pageToken: string | undefined;
    do {
      const q = new URLSearchParams({ page_size: '500', ...(pageToken ? { page_token: pageToken } : {}) });
      const d = await this.call<{ items?: FeishuRecord[]; has_more: boolean; page_token?: string }>(
        'GET',
        `/bitable/v1/apps/${appToken}/tables/${tableId}/records?${q}`,
      );
      items.push(...(d.items ?? []));
      pageToken = d.has_more ? d.page_token : undefined;
    } while (pageToken);
    return items;
  }

  getRecord(appToken: string, tableId: string, recordId: string) {
    return this.call<{ record: FeishuRecord }>('GET', `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`).then((d) => d.record);
  }

  updateRecord(appToken: string, tableId: string, recordId: string, fields: Record<string, unknown>) {
    return this.call('PUT', `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`, { fields });
  }

  createRecord(appToken: string, tableId: string, fields: Record<string, unknown>) {
    return this.call<{ record: FeishuRecord }>('POST', `/bitable/v1/apps/${appToken}/tables/${tableId}/records`, { fields }).then((d) => d.record);
  }

  /** 批量写（每批 ≤ 500） */
  async batchCreate(appToken: string, tableId: string, rows: Record<string, unknown>[]) {
    for (let i = 0; i < rows.length; i += 500) {
      await this.call('POST', `/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`, {
        records: rows.slice(i, i + 500).map((fields) => ({ fields })),
      });
    }
  }

  async batchUpdate(appToken: string, tableId: string, rows: { record_id: string; fields: Record<string, unknown> }[]) {
    for (let i = 0; i < rows.length; i += 500) {
      await this.call('POST', `/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_update`, { records: rows.slice(i, i + 500) });
    }
  }

  listTables(appToken: string) {
    return this.call<{ items: { table_id: string; name: string }[] }>('GET', `/bitable/v1/apps/${appToken}/tables?page_size=100`).then((d) => d.items ?? []);
  }

  createTable(appToken: string, table: { name: string; fields: unknown[] }) {
    return this.call<{ table_id: string }>('POST', `/bitable/v1/apps/${appToken}/tables`, { table: { name: table.name, default_view_name: '全部', fields: table.fields } });
  }

  listFields(appToken: string, tableId: string) {
    return this.call<{ items: { field_name: string; type: number }[] }>('GET', `/bitable/v1/apps/${appToken}/tables/${tableId}/fields?page_size=100`).then((d) => d.items ?? []);
  }

  createField(appToken: string, tableId: string, field: unknown) {
    return this.call('POST', `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, field);
  }
}

/** 飞书字段值 → 纯文本（文本 / 链接 / 人员 / 单选 / 数组都能处理） */
export function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).join('').trim();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return asText(o.text ?? o.link ?? o.name ?? o.url ?? '');
  }
  return '';
}
