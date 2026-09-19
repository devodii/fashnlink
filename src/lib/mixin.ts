// Lets a component accept sub-component props as prefixed keys (e.g. `rowClassName`)
// instead of a nested object, so spreading them onto JSX stays ergonomic.
export type MixinProps<Mixin extends string, Props> = {
  [Key in keyof Props as `${Mixin}${Capitalize<Key & string>}`]: Props[Key];
};

type SplitProps<Props, Mixins extends string[]> = {
  [Mixin in Mixins[number]]: {
    [
      MixinKey in keyof Props as MixinKey extends `${Mixin}${infer Key}` ? Uncapitalize<Key> : never
    ]: Props[MixinKey];
  };
} & {
  rest: Omit<
    Props,
    {
      [Mixin in Mixins[number]]: keyof {
        [MixinKey in keyof Props as MixinKey extends `${Mixin}${string}` ? MixinKey : never]: never;
      };
    }[Mixins[number]]
  >;
};

export const splitProps = <Props, Mixins extends string[]>(
  props: Props,
  ...mixins: Mixins
): SplitProps<Props, Mixins> => {
  const result: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};

  for (const mixinKey of mixins) {
    result[mixinKey] = {};
  }

  for (const key in props) {
    let split = false;

    for (const mixinKey of mixins) {
      if (!key.startsWith(mixinKey)) continue;

      split = true;
      const remainingKey = key.substring(mixinKey.length);
      const splitKey = remainingKey.charAt(0).toLowerCase() + remainingKey.slice(1);

      const mixinProps = result[mixinKey] as Record<string, unknown>;
      mixinProps[splitKey] = props[key as keyof typeof props];
    }

    if (!split) rest[key] = props[key as keyof typeof props];
  }

  result['rest'] = rest;
  return result as SplitProps<Props, Mixins>;
};
