/**
 * 发信台账 + 批次快照（DynamoDB 单表）。
 *   pk = <template>#<recordId>  台账行（GSI byTemplate 按模板查询）
 *   pk = batch#<id>             批次快照（ttl 2 天，过期须重新计划）
 * claim 用 attribute_not_exists 条件写入——并发、重试、重复点击都只会有一个成功。
 */
import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { Batch, Ledger, LedgerEntry } from '@cdkit/outbox';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });

export class DynamoLedger implements Ledger {
  constructor(private table: string) {}

  async claim(e: LedgerEntry): Promise<boolean> {
    try {
      await doc.send(new PutCommand({ TableName: this.table, Item: { pk: e.key, ...e }, ConditionExpression: 'attribute_not_exists(pk)' }));
      return true;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) return false;
      throw err;
    }
  }

  async update(key: string, patch: Partial<LedgerEntry>): Promise<void> {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (!entries.length) return;
    await doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { pk: key },
        UpdateExpression: `SET ${entries.map((_, i) => `#k${i} = :v${i}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])),
        ExpressionAttributeValues: Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])),
      }),
    );
  }

  async get(key: string): Promise<LedgerEntry | undefined> {
    const r = await doc.send(new GetCommand({ TableName: this.table, Key: { pk: key } }));
    return r.Item as LedgerEntry | undefined;
  }

  async listByTemplate(template: string): Promise<LedgerEntry[]> {
    const out: LedgerEntry[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const r = await doc.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: 'byTemplate',
          KeyConditionExpression: '#t = :t',
          ExpressionAttributeNames: { '#t': 'template' },
          ExpressionAttributeValues: { ':t': template },
          ExclusiveStartKey: start,
        }),
      );
      out.push(...((r.Items ?? []) as LedgerEntry[]));
      start = r.LastEvaluatedKey;
    } while (start);
    return out;
  }

  async remove(key: string): Promise<void> {
    await doc.send(new DeleteCommand({ TableName: this.table, Key: { pk: key }, ConditionExpression: '#s IN (:f, :c)', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':f': 'failed', ':c': 'claimed' } }));
  }

  async saveBatch(b: Batch): Promise<void> {
    await doc.send(new PutCommand({ TableName: this.table, Item: { pk: `batch#${b.id}`, batch: JSON.stringify(b), ttl: Math.floor(Date.now() / 1000) + 2 * 86400 } }));
  }

  async loadBatch(id: string): Promise<Batch | null> {
    const r = await doc.send(new GetCommand({ TableName: this.table, Key: { pk: `batch#${id}` } }));
    return r.Item ? (JSON.parse(String(r.Item.batch)) as Batch) : null;
  }
}
