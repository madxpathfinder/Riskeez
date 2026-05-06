import { storageService } from './storageService';
import { Notification, NotificationType } from '../types/notification';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const NOTIFICATIONS_KEY = 'riskeez_notifications';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ notifications: Notification[] }>('/api/notifications');
      return res.notifications;
    }
    const notifications = await storageService.getItem<Notification[]>(NOTIFICATIONS_KEY);
    return notifications || [];
  },

  async addNotification(data: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const res = await api.post<{ notification: Notification }>('/api/notifications', data);
        window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
        return res.notification;
      } catch {
        const fallback: Notification = { ...data, id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), read: false };
        return fallback;
      }
    }
    const notifications = await this.getNotifications();
    const newNotification: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 50);
    await storageService.setItem(NOTIFICATIONS_KEY, updatedNotifications);
    window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
    return newNotification;
  },

  async markNotificationRead(id: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.post(`/api/notifications/${id}/read`, {});
      window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
      return;
    }
    const notifications = await this.getNotifications();
    const updatedNotifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await storageService.setItem(NOTIFICATIONS_KEY, updatedNotifications);
    window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
  },

  async markAllNotificationsRead(): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.post('/api/notifications/read-all', {});
      window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
      return;
    }
    const notifications = await this.getNotifications();
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    await storageService.setItem(NOTIFICATIONS_KEY, updatedNotifications);
    window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
  },

  async clearNotifications(): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.delete('/api/notifications');
      window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
      return;
    }
    await storageService.setItem(NOTIFICATIONS_KEY, []);
    window.dispatchEvent(new CustomEvent('riskeez_notifications_updated'));
  },

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.read).length;
  }
};
