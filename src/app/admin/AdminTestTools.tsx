'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { clearSession, generateTestUrl } from './actions';
import SessionCountdown from '@/components/SessionCountdown';

interface AdminTestToolsProps {
  sessionInfo: { deviceId: string; exp: number } | null;
  timeSlotExpiry: number;
}

export default function AdminTestTools({ sessionInfo, timeSlotExpiry }: AdminTestToolsProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClearSession = async () => {
    await clearSession();
    setGeneratedUrl(null);
    window.location.reload();
  };

  const handleGenerateUrl = async () => {
    const url = await generateTestUrl();
    setGeneratedUrl(url);
    setCopied(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullUrl = generatedUrl
    ? `${window.location.origin}${generatedUrl}`
    : null;

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm text-gray-600">
          <SessionCountdown expiresAt={timeSlotExpiry} />
          {sessionInfo && <span className="ml-2">— device: {sessionInfo.deviceId}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleClearSession}
          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 cursor-pointer"
        >
          Clear Session
        </button>

        <button
          onClick={handleGenerateUrl}
          className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer"
        >
          Generate Test QR URL
        </button>
      </div>

      {fullUrl && (
        <div className="bg-gray-100 rounded p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500 font-medium">Valid URL:</span>
            <button
              onClick={() => handleCopy(fullUrl)}
              className="text-xs px-2 py-0.5 bg-white border rounded hover:bg-gray-50 cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {/* Full navigation needed — these routes set cookies and redirect */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={generatedUrl!}
            className="font-mono text-blue-600 hover:underline break-all"
          >
            {fullUrl}
          </a>

          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center">
            <QRCodeSVG value={fullUrl} size={200} />
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-gray-500 font-medium">Test invalid URL:</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/v/test/invalidtoken123"
              className="block font-mono text-blue-600 hover:underline break-all mt-1"
            >
              {window.location.origin}/v/test/invalidtoken123
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
