import { useState, useEffect } from 'react';
import { healthService } from '../services/api';
import socketService from '../services/socket';
import type { SystemHealthStatus } from '../types';

export const useSystemHealth = () => {
  const [status, setStatus] = useState<SystemHealthStatus>({
    apiOnline: false,
    dbOnline: false,
    socketConnected: false,
    socketId: undefined,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const checkHealth = async () => {
    try {
      setLoading(true);
      const [apiRes, dbRes] = await Promise.allSettled([
        healthService.getApiHealth(),
        healthService.getDatabaseHealth(),
      ]);

      const apiOk = apiRes.status === 'fulfilled' && apiRes.value.success;
      const dbOk = dbRes.status === 'fulfilled' && dbRes.value.success;
      const socket = socketService.connect();

      setStatus({
        apiOnline: apiOk,
        dbOnline: dbOk,
        socketConnected: socket.connected,
        socketId: socket.id,
        lastChecked: new Date().toLocaleTimeString(),
      });
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch {
      setStatus((prev) => ({
        ...prev,
        apiOnline: false,
        dbOnline: false,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Setup socket connection
    const socket = socketService.connect();

    const handleConnect = () => {
      setStatus((prev) => ({
        ...prev,
        socketConnected: true,
        socketId: socket.id,
      }));
    };

    const handleDisconnect = () => {
      setStatus((prev) => ({
        ...prev,
        socketConnected: false,
        socketId: undefined,
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Periodically re-verify every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearInterval(interval);
    };
  }, []);

  return { status, loading, lastCheckTime, recheck: checkHealth };
};
