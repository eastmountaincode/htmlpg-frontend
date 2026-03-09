interface BoxStatusProps {
    boxNumber: number;
    loading: boolean;
    empty: boolean;
    fileName?: string;
    fileSize?: number;
    source?: { name?: string; city?: string } | null;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function truncateName(name: string, max: number) {
    if (name.length <= max) return name;
    return name.slice(0, max - 3) + '...';
}

export default function BoxStatus({ boxNumber, loading, empty, fileName, fileSize, source }: BoxStatusProps) {
    if (loading) {
        return (
            <div className="m-2.5 mt-0.5 border px-2 py-1.5">
                <p>{`box${boxNumber}: loading...`}</p>
            </div>
        );
    }

    if (empty) {
        return (
            <div className="m-2.5 mt-0.5 border px-2 py-1.5">
                <p>{`box${boxNumber}: empty`}</p>
            </div>
        );
    }

    const sourceLine = source?.name
        ? `from ${source.name}${source.city ? `, ${source.city}` : ''}`
        : null;

    const rows: [string, string][] = [
        ['File:', truncateName(fileName || '?', 40)],
        ['Type:', getFileType(fileName || '')],
        ['Size:', formatSize(fileSize!)],
    ];

    return (
        <div className="m-2.5 mt-0.5 border px-2 py-1.5 space-y-0.5">
            {sourceLine && (
                <p className="text-xs text-gray-600 italic leading-tight">{sourceLine}</p>
            )}
            {rows.map(([label, value]) => (
                <p key={label} className="text-sm leading-tight">
                    <span className="font-bold">{label}</span>{' '}
                    <span className="font-normal">{value}</span>
                </p>
            ))}
        </div>
    );
}
