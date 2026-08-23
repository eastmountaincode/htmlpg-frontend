'use client';

import { useRef, useState } from 'react';

interface UploadFormProps {
    boxNumber: number;
    uploadDisabled: boolean;
    receiveDisabled: boolean;
    onReceive: () => void;
    onUploadComplete: () => void;
}

const uploadColor = 'bg-yellow-400';
const downloadColor = 'bg-red-400';
const disabledOpacity = 'opacity-20';
const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB

async function postUploadEvent(boxNumber: number, body: Record<string, unknown>) {
    let lastResponse: Response | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }

        try {
            lastResponse = await fetch(`/api/boxes/${boxNumber}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch (error) {
            lastError = error;
            continue;
        }

        if (lastResponse.redirected || lastResponse.ok || lastResponse.status < 500) {
            return lastResponse;
        }
    }

    if (lastError) {
        console.error('Upload event request failed', lastError);
    }

    return lastResponse;
}

export default function UploadForm({ boxNumber, uploadDisabled, receiveDisabled, onReceive, onUploadComplete }: UploadFormProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;

        if (file && file.size > MAX_FILE_SIZE) {
            alert(`File too big! Max size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`);
            setSelectedFile(null);
            setUploadProgress(0);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            return;
        }

        setSelectedFile(file);
        setUploadProgress(0);
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFile) return;

        try {
            const presignResponse = await fetch(`/api/boxes/${boxNumber}/files`, {
                method: 'POST',
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    fileType: selectedFile.type || "application/octet-stream",
                    fileSize: selectedFile.size,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (presignResponse.redirected) {
                window.location.href = '/denied';
                return;
            }
            if (presignResponse.status === 401) {
                window.location.href = '/denied';
                return;
            }
            if (!presignResponse.ok) throw new Error('Failed to get presigned URL');
            const { url, key, metaKey, uploadToken } = await presignResponse.json();

            setUploading(true);
            setUploadProgress(0);

            // Upload the file
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) {
                        const pct = Math.round((ev.loaded / ev.total) * 100);
                        setUploadProgress(pct);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        setUploadProgress(100);
                        resolve();
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.open('PUT', url);
                xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
                xhr.send(selectedFile);
            }).finally(() => setUploading(false));

            console.log('File uploaded successfully', key);

            const eventResponse = await postUploadEvent(boxNumber, {
                type: 'file-uploaded',
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type || 'application/octet-stream',
                key,
                metaKey,
                uploadToken,
            });
            if (eventResponse?.redirected) {
                window.location.href = '/denied';
                return;
            }
            if (!eventResponse?.ok) {
                console.error('Upload event failed', eventResponse?.status, eventResponse?.statusText);
            }

            setSelectedFile(null);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            onUploadComplete();
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    return (
        <form className="mx-2.5 mb-2.5" onSubmit={handleSubmit}>
            {/* Selected file preview + progress bar */}
            <div className="mt-3">
                {selectedFile && (
                    <p className="text-sm mb-1">Selected: {selectedFile.name}</p>
                )}
                {uploading && (
                    <progress
                        value={uploadProgress}
                        max={100}
                        className="w-full mb-1"
                    />
                )}
            </div>

            {/* Button row: Receive | Choose File | Offer */}
            <div className="flex items-center gap-1.5">
                <button
                    className={`px-2 py-1 border ${receiveDisabled ? disabledOpacity + ' cursor-not-allowed' : 'cursor-pointer'} ${downloadColor}`}
                    type="button"
                    disabled={receiveDisabled}
                    onClick={onReceive}
                >
                    Receive
                </button>

                <label className={`inline-block px-2 py-1 border ${uploadDisabled ? disabledOpacity + ' cursor-not-allowed' : 'cursor-pointer'} ${uploadColor}`}>
                    Choose File
                    <input
                        type="file"
                        name="fileToUpload"
                        required
                        className="hidden"
                        ref={inputRef}
                        onChange={handleFileChange}
                        onClick={(e) => {
                            (e.currentTarget as HTMLInputElement).value = '';
                        }}
                        disabled={uploadDisabled}
                    />
                </label>

                <input
                    type="submit"
                    value="Offer"
                    disabled={!selectedFile}
                    className={`px-2 py-1 border ${selectedFile ? 'cursor-pointer border-red-500 border-2' : ''} ${!selectedFile ? disabledOpacity : ''} ${uploadColor}`}
                />
            </div>
        </form>
    );
}
