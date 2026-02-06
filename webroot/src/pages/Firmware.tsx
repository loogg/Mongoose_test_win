import { useState, useRef, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { firmwareBegin, firmwareUpload, reboot, getSettings } from '../api';
import { Card, Button, ProgressBar } from '../components/ui';

type UploadState = 'idle' | 'uploading' | 'success' | 'rebooting' | 'reconnecting';

export function FirmwarePage() {
  const { t, getErrorMessage } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const reconnectTimerRef = useRef<number | null>(null);

  // Fetch current firmware version
  useEffect(() => {
    getSettings().then(res => {
      if (res.ack && res.data) {
        setCurrentVersion(res.data.ver.firmware);
      }
    });
  }, []);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      setSelectedFile(input.files[0]);
      setError('');
      setState('idle');
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
      setState('idle');
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setState('uploading');
    setProgress(0);
    setError('');

    try {
      // Begin firmware upload
      const beginRes = await firmwareBegin('controller', selectedFile.name, selectedFile.size);
      if (!beginRes.ack) {
        setError(getErrorMessage(beginRes.error?.code, beginRes.error?.message));
        setState('idle');
        return;
      }

      // Upload in chunks
      const chunkSize = 4096;
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, selectedFile.size);
        const chunk = await selectedFile.slice(start, end).arrayBuffer();

        const uploadRes = await firmwareUpload(start, chunk);
        if (!uploadRes.ack) {
          setError(getErrorMessage(uploadRes.error?.code, uploadRes.error?.message));
          setState('idle');
          return;
        }

        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Success - show reboot prompt
      setState('success');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(getErrorMessage(undefined, String(err)));
      setState('idle');
    }
  };

  // Handle reboot
  const handleReboot = async () => {
    setState('rebooting');
    setError('');

    try {
      await reboot();
      // Start reconnection attempts after a delay
      setTimeout(() => {
        setState('reconnecting');
        startReconnect();
      }, 3000);
    } catch (err) {
      // Even if request fails (device already rebooting), proceed with reconnection
      setTimeout(() => {
        setState('reconnecting');
        startReconnect();
      }, 3000);
    }
  };

  // Reconnection logic
  const startReconnect = () => {
    let attempts = 0;
    const maxAttempts = 60; // Try for about 2 minutes

    const tryConnect = async () => {
      attempts++;
      try {
        // Use /api/dashboard to check if device is back online
        await fetch('/api/dashboard');
        // Any response means device is back online (even 401 means token changed)
        // Redirect to homepage to let user re-login
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        window.location.href = '/';
        return;
      } catch {
        // Still disconnected
      }

      if (attempts < maxAttempts) {
        reconnectTimerRef.current = window.setTimeout(tryConnect, 2000);
      } else {
        setError(t('firmware.reconnectFailed'));
        setState('idle');
      }
    };

    tryConnect();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return (
    <div class="max-w-2xl mx-auto">
      <Card title={t('firmware.title')} icon="📦">
        <div class="space-y-6">
          {/* Target Selection */}
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              {t('firmware.target')}
            </label>
            <div class="flex items-center gap-4">
              <select class="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                <option value="pendant">{t('firmware.target.pendant')}</option>
              </select>
              {currentVersion && (
                <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <span class="text-sm text-gray-500">{t('firmware.currentVersion')}:</span>
                  <span class="text-sm font-mono font-medium text-gray-700">{currentVersion}</span>
                </div>
              )}
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            class={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            } ${state !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".rbl"
              onChange={handleFileSelect}
              class="hidden"
              disabled={state !== 'idle'}
            />

            {selectedFile ? (
              <div class="space-y-2">
                <div class="text-4xl">📄</div>
                <div class="font-medium text-gray-800">{selectedFile.name}</div>
                <div class="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </div>
              </div>
            ) : (
              <div class="space-y-2">
                <div class="text-4xl">📁</div>
                <div class="text-gray-600">{t('firmware.selectFile')}</div>
                <div class="text-sm text-gray-400">{t('firmware.dropHint')}</div>
              </div>
            )}
          </div>

          {/* Progress */}
          {state === 'uploading' && (
            <div class="space-y-3">
              <ProgressBar
                label={t('firmware.progress')}
                value={progress}
                max={100}
                color="blue"
              />
              <div class="text-center text-sm text-gray-500">
                {t('firmware.uploadingHint')}
              </div>
            </div>
          )}

          {/* Success - Show reboot prompt */}
          {state === 'success' && (
            <div class="space-y-4">
              <div class="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-lg">
                <span class="text-xl">✅</span>
                <span>{t('firmware.written')}</span>
              </div>
              <Button
                onClick={handleReboot}
                size="lg"
                className="w-full"
                icon="🔄"
              >
                {t('firmware.reboot')}
              </Button>
            </div>
          )}

          {/* Rebooting */}
          {state === 'rebooting' && (
            <div class="flex items-center justify-center gap-3 p-4 bg-amber-50 text-amber-700 rounded-lg">
              <span class="animate-spin">⏳</span>
              <span>{t('firmware.rebooting')}</span>
            </div>
          )}

          {/* Reconnecting */}
          {state === 'reconnecting' && (
            <div class="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
              <span class="animate-pulse">📡</span>
              <span>{t('firmware.reconnecting')}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div class="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
              <span class="text-xl">❌</span>
              <span>{error}</span>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || state !== 'idle'}
            loading={state === 'uploading'}
            size="lg"
            className="w-full"
            icon="🚀"
          >
            {state === 'uploading' ? t('firmware.uploading') : t('common.upload')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
