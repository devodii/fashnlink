import { AdapterRegistry } from '@/lib/adapter';
import { uploadthingAdapter, type StorageInput, type StorageKey, type StorageOutput } from './adapter';

export const storageRegistry = new AdapterRegistry<StorageInput, StorageOutput, StorageKey>([uploadthingAdapter]);

export { putObject, deleteObject, getSignedUrl } from './uploadthing';
export type { StorageInput, StorageOutput, StorageKey } from './adapter';
