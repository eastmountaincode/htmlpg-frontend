import { cookies } from 'next/headers';
import { validateSessionValue, SESSION_COOKIE_NAME } from '@/lib/session';
import { NextResponse } from 'next/server';
import devices from '@/lib/devices.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/session/device - Get current session's device info
export async function GET() {
    // In development, return a mock device so the UI works without a real session
    if (process.env.NODE_ENV === 'development') {
        const firstDeviceId = Object.keys(devices)[0];
        const firstDevice = devices[firstDeviceId as keyof typeof devices];
        return NextResponse.json({
            deviceId: firstDeviceId,
            name: firstDevice?.name || null,
            city: firstDevice?.city || null,
        });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionCookie || !sessionSecret) {
        return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const result = validateSessionValue(sessionSecret, sessionCookie);
    if (!result.valid) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const deviceId = result.deviceId;
    const deviceInfo = devices[deviceId as keyof typeof devices];

    return NextResponse.json({
        deviceId,
        name: deviceInfo?.name || null,
        city: deviceInfo?.city || null
    });
}
