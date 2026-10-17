import MakerContent from './MakerContent.js';

export async function generateMetadata() {
  return {
    title: 'The Maker — Mustafa Aboalazm',
    description: 'Brand identity, product design, and engineering — connected into useful digital products by Mustafa Aboalazm.',
    alternates: { canonical: '/maker' },
    openGraph: {
      title: 'The Maker — Mustafa Aboalazm',
      description: 'Brand identity, product design, and engineering — connected into useful digital products.',
      type: 'profile',
    },
  };
}

export default function MakerPage() {
  return <MakerContent />;
}
