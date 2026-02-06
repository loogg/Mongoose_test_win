import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getLogList, downloadLogChunk } from '../api';
import { Card, Button, StatCard } from '../components/ui';
import type { LogEntry } from '../types';

export function LogPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const res = await getLogList();
    if (res.ack && res.data) {
      setLogs(res.data.logs);
    }
    setLoading(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTotalSize = (): number => {
    return logs.reduce((sum, log) => sum + log.size, 0);
  };

  const handleDownload = async (log: LogEntry) => {
    setDownloading(log.name);

    try {
      if (log.type === 'file') {
        // For file type, direct download (would be handled by server in real device)
        // In simulator, this will fail gracefully
        window.open(`/api/log/download?name=${encodeURIComponent(log.name)}`, '_blank');
      } else {
        // For memory type, download in chunks (binary data)
        let chunks: Uint8Array[] = [];
        let offset = 0;
        const chunkSize = 1024;

        while (offset < log.size) {
          const buffer = await downloadLogChunk(log.name, offset, chunkSize);
          if (buffer.byteLength === 0) break;

          const bytes = new Uint8Array(buffer);
          chunks.push(bytes);

          offset += bytes.byteLength;

          if (bytes.byteLength < chunkSize) break; // Last chunk
        }

        // Combine all chunks
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalSize);
        let position = 0;
        for (const chunk of chunks) {
          combined.set(chunk, position);
          position += chunk.length;
        }

        // Create download
        const blob = new Blob([combined], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = log.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fileCount = logs.filter(l => l.type === 'file').length;
  const memoryCount = logs.length - fileCount;

  return (
    <div class="space-y-6">
      {/* Stats */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('log.title')}
          value={logs.length}
          icon="📋"
          color="blue"
        />
        <StatCard
          title={t('log.type.file')}
          value={fileCount}
          icon="📁"
          color="purple"
        />
        <StatCard
          title={t('log.type.memory')}
          value={memoryCount}
          icon="💿"
          color="yellow"
        />
        <StatCard
          title={t('log.totalSize')}
          value={formatSize(getTotalSize())}
          icon="💾"
          color="green"
        />
      </div>

      {/* Log Table */}
      <Card title={t('log.title')} icon="📋">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-3 px-4 text-gray-500 font-medium text-sm">{t('log.name')}</th>
                <th class="text-left py-3 px-4 text-gray-500 font-medium text-sm">{t('log.size')}</th>
                <th class="text-left py-3 px-4 text-gray-500 font-medium text-sm">{t('log.type')}</th>
                <th class="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr
                  key={log.name}
                  class={`border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}
                >
                  <td class="py-4 px-4">
                    <div class="flex items-center gap-3">
                      <span class="text-lg">{log.type === 'file' ? '📄' : '💾'}</span>
                      <span class="font-mono text-sm text-gray-800">{log.name}</span>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="text-sm text-gray-600 font-medium">{formatSize(log.size)}</span>
                  </td>
                  <td class="py-4 px-4">
                    <span class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      log.type === 'file'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {log.type === 'file' ? t('log.type.file') : t('log.type.memory')}
                    </span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(log)}
                      loading={downloading === log.name}
                      disabled={downloading !== null}
                      icon="⬇️"
                    >
                      {t('common.download')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div class="text-center py-12 text-gray-500">
            <div class="text-4xl mb-3">📭</div>
            <div>暂无日志文件</div>
          </div>
        )}

        <div class="mt-5 pt-4 border-t border-gray-100 flex justify-end">
          <Button onClick={loadLogs} variant="secondary" icon="🔄">
            {t('common.refresh')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
