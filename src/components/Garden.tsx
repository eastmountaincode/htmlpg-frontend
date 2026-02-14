'use client';

import { useEffect, useRef, useCallback } from 'react';
import Box from './Box/Box';
import { getPusherClient } from '@/lib/pusher-client';

export default function Garden() {
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
