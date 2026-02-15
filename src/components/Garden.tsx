'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Box from './Box/Box';
import SessionCountdown from './SessionCountdown';
import { getPusherClient } from '@/lib/pusher-client';

interface GardenProps {
    sessionExpiresAt: number | null;
    shareUrl: string | null;
}

function SessionInfo({ expiresAt, shareUrl }: { expiresAt: number; shareUrl: string | null }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-100 rounded mx-5 mt-3 px-3 py-2">
            <div className="flex items-center justify-between">
                <SessionCountdown expiresAt={expiresAt} />
                {shareUrl && (
                    <button
                        onClick={handleCopy}
                        className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-500 rounded cursor-pointer shrink-0"
                    >
                        {copied ? 'copied!' : 'copy link'}
                    </button>
                )}
            </div>
            {shareUrl && (
                <p className="text-xs font-mono text-gray-400 break-all select-all mt-1">{shareUrl}</p>
            )}
        </div>
    );
}

export default function Garden({ sessionExpiresAt, shareUrl }: GardenProps) {
    const boxUpdateCallbacks = useRef<{ [boxNumber: number]: () => void }>({});

    useEffect(() => {
        const client = getPusherClient();
        const channel = client.subscribe('garden');

        client.connection.bind('connected', () => {
            console.log('Pusher: Connected');
        });

        client.connection.bind('disconnected', () => {
            console.log('Pusher: Disconnected');
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.connection.bind('error', (error: any) => {
            console.log('Pusher: Connection error', error);
        });

        channel.bind('file-uploaded', (data: { boxNumber: string }) => {
            const boxNumber = parseInt(data.boxNumber);
            if (boxUpdateCallbacks.current[boxNumber]) {
                boxUpdateCallbacks.current[boxNumber]();
            }
        });

        channel.bind('file-deleted', (data: { boxNumber: string }) => {
            const boxNumber = parseInt(data.boxNumber);
            if (boxUpdateCallbacks.current[boxNumber]) {
                boxUpdateCallbacks.current[boxNumber]();
            }
        });

        return () => {
            client.connection.unbind('connected');
            client.connection.unbind('disconnected');
            client.connection.unbind('error');
            client.unsubscribe('garden');
        };
    }, []);

    const registerBoxCallback = useCallback((boxNumber: number, callback: () => void) => {
        boxUpdateCallbacks.current[boxNumber] = callback;
    }, []);

    return (
        <div className="min-h-screen font-serif font-normal">
            <div className="text-center mx-5 my-5">
                <h2 className="text-xl">
                    ✿ ❀ ❁ ❃ ❋ <br />
                    HTMLPG <br />
                    ❋ ❃ ❁ ❀ ✿
                </h2>
                {sessionExpiresAt && <SessionInfo expiresAt={sessionExpiresAt} shareUrl={shareUrl} />}
            </div>
            <div className="pt-[10px] pb-[40px] space-y-[30px]">
                <Box boxNumber={1} onRegisterCallback={registerBoxCallback} />
                <Box boxNumber={2} onRegisterCallback={registerBoxCallback} />
                <Box boxNumber={3} onRegisterCallback={registerBoxCallback} />
                <Box boxNumber={4} onRegisterCallback={registerBoxCallback} />
            </div>
        </div>
    );
}
