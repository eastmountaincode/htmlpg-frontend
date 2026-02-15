'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Box from './Box/Box';
import SessionCountdown from './SessionCountdown';
import { getPusherClient } from '@/lib/pusher-client';

interface GardenProps {
    sessionExpiresAt: number | null;
    shareUrl: string | null;
}

function ShareLink({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <p className="text-xs text-center text-gray-400 mt-1">
            <button onClick={handleCopy} className="hover:underline cursor-pointer">
                {copied ? 'copied!' : 'copy link for another device'}
            </button>
        </p>
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
                {sessionExpiresAt && <SessionCountdown expiresAt={sessionExpiresAt} />}
                {shareUrl && <ShareLink url={shareUrl} />}
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
