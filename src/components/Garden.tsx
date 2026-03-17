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
        <div className="max-w-sm mx-auto bg-gray-100 rounded mt-3 px-3 py-2">
            <div className="text-center">
                <SessionCountdown expiresAt={expiresAt} />
            </div>
            {shareUrl && (
                <div className="flex items-center justify-center gap-2 mt-1 overflow-hidden">
                    <p className="text-xs font-mono text-gray-400 truncate">{shareUrl}</p>
                    <button
                        onClick={handleCopy}
                        className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-500 rounded cursor-pointer shrink-0"
                    >
                        {copied ? 'copied!' : 'copy session link'}
                    </button>
                </div>
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
        <div className="relative min-h-screen font-serif font-normal">
            {/* Decorative illustration columns — desktop only */}
            <div className="hidden lg:block fixed left-0 top-0 w-[calc((100%-384px)/2)] h-full pointer-events-none">
                <div className="flex flex-col items-center gap-17 pt-8 opacity-[0.08]">
                    <img src="/illustrations/butterfly.png" alt="" className="w-[260px]" />
                    <img src="/illustrations/psychic.png" alt="" className="w-[280px]" />
                    <img src="/illustrations/star_figure.png" alt="" className="w-[340px]" />
                </div>
            </div>
            <div className="hidden lg:block fixed right-0 -top-0 w-[calc((100%-384px)/2)] h-full pointer-events-none">
                <div className="flex flex-col items-center gap-32 pt-48 opacity-[0.08]">
                    <img src="/illustrations/bees.png" alt="" className="w-[280px]" />
                    <img src="/illustrations/yoyo.png" alt="" className="w-[260px]" />
                </div>
            </div>

            <div className="text-center mx-5 my-5">
                <img src="/illustrations/star_logo.png" alt="" className="w-8 mx-auto mb-1" />
                <h2 className="text-xl">
                    ✿ ❀ ❁ ❃ ❋ <br />
                    HTML Pollinator Garden <br />
                    ❋ ❃ ❁ ❀ ✿
                </h2>
                {sessionExpiresAt && <SessionInfo expiresAt={sessionExpiresAt} shareUrl={shareUrl} />}
                <details className="max-w-sm mx-auto mt-3 text-left">
                    <summary className="cursor-pointer text-gray-400 text-sm select-none">What is this?</summary>
                    <div className="mt-2 text-sm text-gray-600 space-y-3">
                        <p className="font-bold">What is this?</p>

                        <p>
                            HTML Pollinator Garden is like a{' '}
                            <a href="https://littlefreelibrary.org/" target="_blank" rel="noopener noreferrer" className="underline">
                                Little Free Library
                            </a>{' '}
                            but for files (any type) instead of books.
                        </p>
                        <p className="font-bold">How does it work?</p>
                        <p>Scan the QR code to get a URL and access the website.</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>To download a file, click &ldquo;<span className="bg-red-400">Receive</span>&rdquo;. When you download a file, it gets removed from the box for everyone, just like in real life.</li>
                            <li>To upload a file, click &ldquo;<span className="bg-yellow-400">Choose File</span>&rdquo; to select a file, then press &ldquo;<span className="bg-yellow-400">Offer</span>&rdquo; to upload it.</li>
                        </ul>
                        <p>The QR code / URL changes every 30 minutes. This ensures files come from people who were physically present at the location of the HTMLPG device.</p>
                        <p>To upload files from your computer, scan the QR code with your phone, copy the URL, text/email it to yourself, then open it in your browser.</p>

                        <p className="font-bold">Why?</p>
                        <p>To create serendipity in our lives and in the lives of others.</p>
                    </div>
                </details>
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
