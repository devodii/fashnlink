import { AdapterRegistry } from '@/lib/adapter';
import { r2Adapter, type StorageInput, type StorageKey, type StorageOutput } from './adapter';

export const storageRegistry = new AdapterRegistry<StorageInput, StorageOutput, StorageKey>([r2Adapter]);

export { putObject, deleteObject, getPublicUrl, presignGetUrl, presignPutUrl } from './r2';
export type { StorageInput, StorageOutput, StorageKey } from './adapter';
