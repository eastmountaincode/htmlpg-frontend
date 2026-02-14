'use client';

export default function AdminTestTools({ testQrUrl }: { testQrUrl: string | null }) {
  const clearSession = () => {
    document.cookie = "htmlpg_session=; path=/; max-age=0";
    window.location.reload();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={clearSession}
        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
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
