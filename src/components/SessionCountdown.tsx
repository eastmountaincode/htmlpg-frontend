'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SessionCountdownProps {
    expiresAt: number; // Unix seconds
}

export default function SessionCountdown({ expiresAt }: SessionCountdownProps) {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(() => {
        return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
            setSecondsLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                router.push('/denied');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, router]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return (
        <p className="text-xs text-gray-500">
            session {display}
        </p>
    );
}
