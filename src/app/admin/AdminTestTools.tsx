'use client';

import { clearSession } from './actions';

export default function AdminTestTools({ testQrUrl }: { testQrUrl: string | null }) {
  const handleClearSession = async () => {
    await clearSession();
    window.location.reload();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleClearSession}
        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 cursor-pointer"
      >
        Clear Session
      </button>

      {testQrUrl && (
        <a
          href={testQrUrl}
          className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 inline-block"
        >
          Generate Test Session
        </a>
      )}
    </div>
  );
}
