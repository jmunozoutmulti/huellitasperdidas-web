import HomePage from '../../page';

// Static export can't render one page per aviso, so we export a single shell at
// /aviso/_/ and public/.htaccess serves it for every /aviso/<slug>/. The home
// reads the real id from the URL. Social previews come from the API
// (/share/aviso/<slug>), to which .htaccess redirects link-preview bots.
export const dynamicParams = false;

export function generateStaticParams() {
    return [{ slug: '_' }];
}

export default function AvisoPage() {
    return <HomePage />;
}
