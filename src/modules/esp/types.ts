import type { espProviderEnum } from '@/db/schema';

export type EspProviderKey = (typeof espProviderEnum.enumValues)[number];

export type EspPush =
  | {
      op: 'event';
      apiKey: string; // decrypted, never the encrypted column value
      listId: string | null;
      email: string;
      eventName: 'Tryon Abandoned' | 'Tryon New Drop';
      properties: Record<string, unknown>;
    }
  | {
      op: 'setProfileProperties';
      apiKey: string;
      listId: string | null;
      email: string;
      properties: Record<string, unknown>;
    }
  | {
      op: 'test';
      apiKey: string;
      listId: string | null;
      email: string;
    };

export type EspPushResult = { delivered: boolean };
