import { customAlphabet } from 'nanoid';
import { ulid } from 'ulid';

// Typed id generators (section 4): `newId('prod')` -> `prod_01J...`.
export const ID_PREFIXES = [
  'merch',
  'store',
  'prod',
  'img',
  'variant',
  'link',
  'shopper',
  'twin',
  'render',
  'vote',
  'member',
  'lead',
  'ledger',
  'stripeevt',
  'job',
  'claim',
  'audit',
  'optin',
  'esp',
  'campaign',
  'citem',
  'cart',
  'preq',
] as const;

export type IdPrefix = (typeof ID_PREFIXES)[number];

export function newId<TPrefix extends IdPrefix>(prefix: TPrefix): `${TPrefix}_${string}` {
  return `${prefix}_${ulid()}`;
}

// Public link slugs (section 4): 7-char base62, ambiguous characters
// (0/O/1/l/I) excluded so a slug is safe to read aloud or hand-copy.
const SLUG_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const generateSlug = customAlphabet(SLUG_ALPHABET, 7);

export function newSlug(): string {
  return generateSlug();
}
