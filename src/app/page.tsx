import { cookies } from 'next/headers';
import { validateSessionValue, SESSION_COOKIE_NAME } from '@/lib/session';
import Garden from '@/components/Garden';

export const dynamic = 'force-dynamic';

export default async function Home() {
    let sessionExpiresAt: number | null = null;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const secret = process.env.SESSION_SECRET;

    if (sessionCookie && secret) {
        const result = validateSessionValue(secret, sessionCookie);
        if (result.valid) {
            sessionExpiresAt = result.exp;
        }
    }

    return (
        <div>
            <Garden sessionExpiresAt={sessionExpiresAt} />
        </div>
    );
}
