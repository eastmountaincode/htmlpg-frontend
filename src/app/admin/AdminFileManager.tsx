'use client';

import { useEffect, useState, useCallback } from 'react';

interface BoxFileInfo {
  empty: boolean;
  name?: string;
  size?: number;
  source?: { name: string | null; city: string | null } | null;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const MAX_PREVIEW_BYTES = 5_000_000;

function isPreviewable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext) || ext === 'pdf';
}

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

function getFileType(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'file';
  const ext = name.slice(dot).toLowerCase();
  const typeMap: Record<string, string> = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image',
    '.gif': 'image', '.webp': 'image', '.svg': 'image',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
    '.mp4': 'video', '.mov': 'video', '.avi': 'video', '.webm': 'video',
    '.pdf': 'pdf',
    '.txt': 'text', '.md': 'text',
    '.html': 'html', '.htm': 'html',
    '.zip': 'archive', '.tar': 'archive', '.gz': 'archive',
  };
  return typeMap[ext] || 'file';
}

function formatSize(bytes: number) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
}

export default function AdminFileManager() {
  const [boxes, setBoxes] = useState<Record<number, BoxFileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});

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

  // Fetch image previews when boxes change
  useEffect(() => {
    const newPreviews: Record<number, string> = {};
    const toFetch: number[] = [];

    for (const boxNumber of [1, 2, 3, 4]) {
      const box = boxes[boxNumber];
      if (
        box &&
        !box.empty &&
        box.name &&
        isPreviewable(box.name) &&
        (box.size || 0) <= MAX_PREVIEW_BYTES
      ) {
        toFetch.push(boxNumber);
      }
    }

    if (toFetch.length === 0) {
      // Revoke old URLs
      Object.values(previews).forEach(URL.revokeObjectURL);
      setPreviews({});
      return;
    }

    Promise.all(
      toFetch.map(async (boxNumber) => {
        const box = boxes[boxNumber];
        try {
          const res = await fetch(`/api/boxes/${boxNumber}/files/${encodeURIComponent(box.name!)}?keep=true`);
          if (res.ok) {
            const rawBlob = await res.blob();
            // Re-create blob with correct MIME type so browser can render it
            const ext = box.name!.split('.').pop()?.toLowerCase() || '';
            const mimeMap: Record<string, string> = {
              jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
              gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
              bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf',
            };
            const mime = mimeMap[ext] || rawBlob.type;
            const typedBlob = new Blob([rawBlob], { type: mime });
            newPreviews[boxNumber] = URL.createObjectURL(typedBlob);
          }
        } catch { /* preview failed, that's ok */ }
      })
    ).then(() => {
      Object.values(previews).forEach(URL.revokeObjectURL);
      setPreviews(newPreviews);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes]);

  const handleDownload = async (boxNumber: number) => {
    const box = boxes[boxNumber];
    if (!box || box.empty || !box.name) return;

    setActionInProgress(boxNumber);
    try {
      const link = document.createElement('a');
      link.href = `/api/boxes/${boxNumber}/files/${encodeURIComponent(box.name)}?keep=true&download=true`;
      link.download = box.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
                      {getFileType(box.name || '')} &middot; {formatSize(box.size || 0)}
                    </p>
                    {previews[boxNumber] && isImageFile(box.name!) && (
                      <img
                        src={previews[boxNumber]}
                        alt={box.name}
                        className="mt-2 rounded border border-gray-200 max-h-40 w-full object-contain bg-gray-50"
                      />
                    )}
                    {previews[boxNumber] && !isImageFile(box.name!) && (
                      <iframe
                        src={previews[boxNumber]}
                        title={box.name}
                        className="mt-2 rounded border border-gray-200 w-full h-48 bg-white"
                      />
                    )}
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
