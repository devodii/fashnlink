/**
 * Real, already-generated try-on assets pulled from the local dev DB (real
 * UploadThing URLs, real scraped product photos, no stock photography or
 * placeholder graphics). One twin (twin_01M34PDT92FDYZYBFAX5RGHZ7C) is
 * reused across the hero, step 3, the retargeting email mock and the
 * closet card so the landing page reads as one consistent person.
 *
 * Every render in the local DB predates watermarking being turned off, so
 * all of them carry a "try it on you" strip baked into the bottom of the
 * image; MediaTile's `cropWatermark` prop crops that strip out.
 */

export const DEMO_TWIN = {
  selfieUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhzRPfVP0PDKQk4cYE1AfSm5xWICuJ67a8Lesi',
  twinUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhhzwwcV37ZyHDR0bj1mNVt3JWrQKIsSg9fCEF',
} as const;

export const DEMO_PRODUCT = {
  title: 'Casual Plaid Shirt',
  url: 'https://www.jumia.com.ng/dou-color-mens-casual-plaid-shirt-black-271164302.html',
  imageUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhpStW1fT7jJkCv5gOULq63nX4VmIEKNdo1tZ8',
} as const;

export const DEMO_RENDER_URL =
  'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhk8ypPbdmYetQCXcVTBuk1MOnvRqZh5yrIsL2';

export const DEMO_TWIN_SECOND_PRODUCT = {
  title: 'Running Shorts',
  imageUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhE3MDibKLOr5qANBzJpG1Fg967EQ3H02haUbS',
  renderUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhnzuRfqj80l1aTciR3DFO4sLSEVKUCtQzrXhb',
} as const;

// The 4th real render in the DB (render_01M31T4R8ZPPHBTJPX7MDS3PR4) has a
// visible generation artifact at the shoulder, so it's excluded here; only
// clean renders are used anywhere on the page.
export const MARQUEE_RENDERS = [
  {
    id: 'render_01M34PETF9H0MNTTZMGS4WD1BQ',
    src: DEMO_RENDER_URL,
    alt: 'Shopper wearing a plaid shirt',
  },
  {
    id: 'render_01M31T68TSQZJDTVNXY8Z641RC',
    src: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNh8yyO7tXXVozU2pOSldq4LWcaxwNIb5PkCgKs',
    alt: 'Shopper wearing sneakers',
  },
  {
    id: 'render_01M31SYEV00EN8MV2QY9EE6MAS',
    src: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhpK20y2T7jJkCv5gOULq63nX4VmIEKNdo1tZ8',
    alt: 'Shopper wearing running shorts',
  },
] as const;

export const DEMO_CHIPS = [
  {
    value: 'dress',
    label: 'Dress',
    url: 'https://us.princesspolly.com/products/aurellia-splice-maxi-dress-ice-blue',
  },
  {
    value: 'sneakers',
    label: 'Sneakers',
    url: 'https://www.allbirds.com/products/mens-strider-explore',
  },
  {
    value: 'jacket',
    label: 'Jacket',
    url: 'https://www.taylorstitch.com/products/eastmoor-cardigan-in-oatmeal-wool-2609',
  },
] as const;
