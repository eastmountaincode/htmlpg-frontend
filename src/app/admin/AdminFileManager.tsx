'use client';

import { useEffect, useState, useCallback } from 'react';

interface BoxFileInfo {
  empty: boolean;
  name?: string;
  size?: number;
  source?: { name: string | null; city: string | null } | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminFileManager() {
  const [boxes, setBoxes] = useState<Record<number, BoxFileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const fetchAllBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        [1, 2, 3, 4].map(async (box) => {
          const res = await fetch(`/api/boxes/${box}/files`);
          if (!res.ok) return { empty: true };
          return res.json();
        })
      );
      const boxData: Record<number, BoxFileInfo> = {};
      results.forEach((data, i) => { boxData[i + 1] = data; });
      setBoxes(boxData);
    } catch (err) {
      console.error('[AdminFileManager] Failed to fetch boxes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllBoxes(); }, [fetchAllBoxes]);

  const handleDownload = async (boxNumber: number) => {
    const box = boxes[boxNumber];
    if (!box || box.empty || !box.name) return;

    setActionInProgress(boxNumber);
    try {
      const url = `/api/boxes/${boxNumber}/files/${encodeURIComponent(box.name)}?keep=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = box.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      await fetchAllBoxes();
    } catch (error) {
      console.error(`Error downloading from box ${boxNumber}:`, error);
      await fetchAllBoxes();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (boxNumber: number) => {
    const box = boxes[boxNumber];
    if (!box || box.empty || !box.name) return;

    setActionInProgress(boxNumber);
    try {
      const url = `/api/boxes/${boxNumber}/files/${encodeURIComponent(box.name)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      await fetchAllBoxes();
    } catch (error) {
      console.error(`Error deleting from box ${boxNumber}:`, error);
      await fetchAllBoxes();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={fetchAllBoxes}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading boxes...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((boxNumber) => {
            const box = boxes[boxNumber] || { empty: true };
            const busy = actionInProgress === boxNumber;

            return (
              <div key={boxNumber} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">Box {boxNumber}</span>
                  {!box.empty && (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" title="Has file" />
                  )}
                </div>

                {box.empty ? (
                  <p className="text-sm text-gray-400">Empty</p>
                ) : (
                  <>
                    <p className="text-sm font-mono truncate" title={box.name}>
                      {box.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatSize(box.size || 0)}
                    </p>
                    {box.source && (box.source.name || box.source.city) && (
                      <p className="text-xs text-gray-400 mt-1">
                        from {[box.source.name, box.source.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleDownload(boxNumber)}
                        disabled={busy}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {busy ? '...' : 'Download'}
                      </button>
                      <button
                        onClick={() => handleDelete(boxNumber)}
                        disabled={busy}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {busy ? '...' : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
