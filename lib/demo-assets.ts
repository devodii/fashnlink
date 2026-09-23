/**
 * Real, already-generated try-on assets pulled from the local dev DB (real
 * UploadThing URLs, real scraped product photos, no stock photography or
 * placeholder graphics). One twin (twin_01M31T1C4NC15KPSAK02PD8DY0) is
 * reused across the hero, step 3, the retargeting email mock and the
 * closet card so the landing page reads as one consistent person.
 */

export const DEMO_TWIN = {
  selfieUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhEycoAvKLOr5qANBzJpG1Fg967EQ3H02haUbS',
  twinUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhGjZ3bsyNxBijCWTKbPaZHoSf6AXpQJesdLgR',
} as const;

export const DEMO_PRODUCT = {
  title: 'TechSweat 3.5" Short',
  url: 'https://outdoorvoices.com/products/w-techsweat-3-5-short-night',
  imageUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhE3MDibKLOr5qANBzJpG1Fg967EQ3H02haUbS',
} as const;

export const DEMO_RENDER_URL =
  'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhnzuRfqj80l1aTciR3DFO4sLSEVKUCtQzrXhb';

export const DEMO_TWIN_SECOND_PRODUCT = {
  title: "Men's Strider Explore - Natural Black (Dark Grey Sole)",
  imageUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNh3mfJkhMgbcE4tAndOjzalhe70p93DovMFmwU',
  renderUrl: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNh8yyO7tXXVozU2pOSldq4LWcaxwNIb5PkCgKs',
} as const;

export const MARQUEE_RENDERS = [
  {
    id: 'render_01M34PETF9H0MNTTZMGS4WD1BQ',
    src: 'https://ww6l8xi99d.ufs.sh/f/HTj3AsGk3dNhk8ypPbdmYetQCXcVTBuk1MOnvRqZh5yrIsL2',
    alt: 'Shopper wearing a plaid shirt',
  },
  {
    id: 'render_01M31T68TSQZJDTVNXY8Z641RC',
    src: DEMO_TWIN_SECOND_PRODUCT.renderUrl,
    alt: 'Shopper wearing sneakers',
  },
  {
    id: 'render_01M31T4R8ZPPHBTJPX7MDS3PR4',
    src: DEMO_RENDER_URL,
    alt: 'Shopper wearing running shorts',
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
