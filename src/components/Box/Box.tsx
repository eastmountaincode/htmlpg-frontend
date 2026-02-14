'use client';

import { useState, useEffect, useRef } from 'react';
import BoxHeader from './BoxHeader';
import BoxStatus from './BoxStatus';
import UploadForm from './UploadForm';

interface BoxProps {
    boxNumber: number;
    onRegisterCallback: (boxNumber: number, callback: () => void) => void;
}

const backgroundColor = 'bg-green-400';

export default function Box({ boxNumber, onRegisterCallback }: BoxProps) {
    const [boxStatus, setBoxStatus] = useState<{ empty: boolean; name?: string; size?: number }>({ empty: true });
    const [loading, setLoading] = useState(true);

    const fetchBoxStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/boxes/${boxNumber}/files`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API returned ${response.status}: ${response.statusText}. Body: ${errorText}`);
            }

            const data = await response.json();
            setBoxStatus(data);
        } catch (error) {
            console.error(`Error fetching box ${boxNumber} status:`, error);
        } finally {
            setLoading(false);
        }
    };

    const registeredRef = useRef(false);

    useEffect(() => {
        fetchBoxStatus();
        if (!registeredRef.current) {
            onRegisterCallback(boxNumber, fetchBoxStatus);
            registeredRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxNumber]);

    const handleReceive = async () => {
        if (boxStatus.empty || !boxStatus.name) return;

        try {
            const url = `/api/boxes/${boxNumber}/files/${encodeURIComponent(boxStatus.name)}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = boxStatus.name;
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                fetchBoxStatus();
            }, 2000);

        } catch (error) {
            console.error('Error receiving file:', error);
            await fetchBoxStatus();
        }
    };

    return (
        <div className="mx-[20px]">
            <div className={`border border-black max-w-sm mx-auto shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${backgroundColor}`}>
                <BoxHeader
                    boxNumber={boxNumber}
                    hasFile={!boxStatus.empty}
                    loading={loading}
                />
                <BoxStatus
                    boxNumber={boxNumber}
                    loading={loading}
                    empty={boxStatus.empty}
                    fileName={boxStatus.name}
                    fileSize={boxStatus.size}
                />
                <UploadForm
                    boxNumber={boxNumber}
                    uploadDisabled={loading || !boxStatus.empty}
                    receiveDisabled={boxStatus.empty}
                    onReceive={handleReceive}
                    onUploadComplete={fetchBoxStatus}
                />
            </div>
        </div>
    );
}
