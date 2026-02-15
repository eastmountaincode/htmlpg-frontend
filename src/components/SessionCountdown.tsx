'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SessionCountdownProps {
    expiresAt: number; // Unix seconds
    intervalSeconds?: number; // If set, auto-roll to next slot on expiry instead of redirecting
}

export default function SessionCountdown({ expiresAt, intervalSeconds }: SessionCountdownProps) {
    const router = useRouter();
    const currentExpiry = useRef(expiresAt);
    const [secondsLeft, setSecondsLeft] = useState(() => {
        return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    });

    useEffect(() => {
        currentExpiry.current = expiresAt;
    }, [expiresAt]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, currentExpiry.current - now);
            setSecondsLeft(remaining);

            if (remaining <= 0) {
                if (intervalSeconds) {
                    // Auto-roll to next time slot
                    const nextSlot = Math.floor(now / intervalSeconds) + 1;
                    currentExpiry.current = nextSlot * intervalSeconds;
                    setSecondsLeft(currentExpiry.current - now);
                } else {
                    clearInterval(interval);
                    router.push('/denied');
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [intervalSeconds, router]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return (
        <p className="text-sm text-gray-500" suppressHydrationWarning>
            session {display}
        </p>
    );
}
