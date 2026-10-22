import type { Metadata } from 'next';
import VerComoClient from './VerComoClient';

export const metadata: Metadata = {
    title: 'Ver como usuario | Huellas Perdidas',
    robots: { index: false, follow: false },
};

export default function VerComoPage() {
    return <VerComoClient />;
}