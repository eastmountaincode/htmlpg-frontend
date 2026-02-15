'use server';

import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { generateQrToken } from '@/lib/qr-token';

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function generateTestUrl(): Promise<string | null> {
    const secret = process.env.QR_SECRET;
    if (!secret) return null;
    const deviceId = 'test';
    const token = generateQrToken(secret, deviceId);
    return `/v/${deviceId}/${token}`;
}
