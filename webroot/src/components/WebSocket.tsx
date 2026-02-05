import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks';
import { useAuth } from '../auth';
import type { StatusPush } from '../types';

interface WebSocketContextType {
  status: any;
  isConnected: boolean;
  updateStatus: (newStatus: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: any }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 只有在用户登录后才创建WebSocket连接
    if (user) {
      const createWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const websocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

        websocket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as StatusPush;
            if (data.type === 'status') {
              setStatus(data.data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // 不在这里尝试重新连接，而是让useEffect在用户状态变化时处理
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        return websocket;
      };

      const websocket = createWebSocket();

      return () => {
        websocket.close();
        setIsConnected(false);
        setStatus(null);
      };
    }
  }, [user]);

  // 实现updateStatus方法，用于更新status状态
  const updateStatus = useCallback((newStatus: any) => {
    setStatus(newStatus);
  }, []);

  return (
    <WebSocketContext.Provider value={{ status, isConnected, updateStatus }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
