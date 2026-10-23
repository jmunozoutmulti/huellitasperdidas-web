'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// Etiqueta de Google Ads. Solo se carga en el dominio principal, para no
// contar las visitas de QA ni de desarrollo.
const GOOGLE_ADS_ID = 'AW-18533446144';
const PRODUCTION_HOSTNAMES = ['huellasperdidas.com', 'www.huellasperdidas.com'];

export default function GoogleAdsTag() {
    const [isProduction, setIsProduction] = useState(false);

    useEffect(() => {
        setIsProduction(PRODUCTION_HOSTNAMES.includes(window.location.hostname));
    }, []);

    if (!isProduction) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-ads-gtag" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GOOGLE_ADS_ID}');
                `}
            </Script>
        </>
    );
}