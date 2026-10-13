'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';

function VerifyRedirect() {
    const params = useSearchParams();
    const router = useRouter();
    const { openAuthModal } = useApp();

    useEffect(() => {
        const token = params.get('token');
        openAuthModal({ mode: 'verify', token: token || undefined });
        router.replace('/');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyRedirect />
        </Suspense>
    );
}