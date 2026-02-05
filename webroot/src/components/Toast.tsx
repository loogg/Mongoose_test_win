import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  icon?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error', icon?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: any }) {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
    icon: undefined
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success', icon?: string) => {
    setToast({ show: true, message, type, icon });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false, message: '', icon: undefined }));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.show && (
        <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-500 px-6 py-4 rounded-lg shadow-xl transition-all duration-300 transform ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`} style={{ zIndex: 9999 }}>
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              {toast.icon ? (
                <span class="text-lg">{toast.icon}</span>
              ) : toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="#10b981">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="#ef4444">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              )}
            </div>
            <span class="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
