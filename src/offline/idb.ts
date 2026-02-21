import Dexie from 'dexie';

export interface OfflineAction {
  id: string;
  type: 'rpc' | 'edge' | 'rest';
  name: string;
  payload: any;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead';
  retryCount: number;
  maxRetries: number;
  nextRunAt: number | null;
  lastError?: string | null;
  scope?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export interface OfflineUpload {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: any; // Blob stored in IndexedDB
  purpose: string;
  entityType: string;
  entityId: string;
  status: 'queued'|'uploading'|'uploaded'|'confirming'|'succeeded'|'failed'|'dead';
  retryCount: number;
  nextRunAt: number | null;
  lastError?: string | null;
  idempotencyKey: string;
  createdAt: number;
}

class OfflineDB extends Dexie {
  actions!: Dexie.Table<OfflineAction, string>;
  uploads!: Dexie.Table<OfflineUpload, string>;
  cache_meta!: Dexie.Table<{ key: string; value: any }, string>;

  constructor() {
    super('agrinext_offline');
    this.version(1).stores({
      actions: 'id, status, nextRunAt, idempotencyKey, createdAt',
      uploads: 'id, status, nextRunAt, createdAt',
      cache_meta: 'key'
    });
    this.actions = this.table('actions');
    this.uploads = this.table('uploads');
    this.cache_meta = this.table('cache_meta');
  }
}

export const offlineDB = new OfflineDB();

export default offlineDB;

