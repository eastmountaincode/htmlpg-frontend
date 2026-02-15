import { cookies, headers } from 'next/headers';
import { validateSessionValue, SESSION_COOKIE_NAME } from '@/lib/session';
import { generateQrToken } from '@/lib/qr-token';
import Garden from '@/components/Garden';

export const dynamic = 'force-dynamic';

export default async function Home() {
    let sessionExpiresAt: number | null = null;
    let shareUrl: string | null = null;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionSecret = process.env.SESSION_SECRET;
    const qrSecret = process.env.QR_SECRET;

    if (sessionCookie && sessionSecret) {
        const result = validateSessionValue(sessionSecret, sessionCookie);
        if (result.valid) {
            sessionExpiresAt = result.exp;

            if (qrSecret) {
                const token = generateQrToken(qrSecret, result.deviceId);
                const hdrs = await headers();
                const host = hdrs.get('host') || 'localhost:3000';
                const protocol = hdrs.get('x-forwarded-proto') || 'http';
                shareUrl = `${protocol}://${host}/v/${result.deviceId}/${token}`;
            }
        }
    }

    return (
        <div>
            <Garden sessionExpiresAt={sessionExpiresAt} shareUrl={shareUrl} />
        </div>
    );
}
