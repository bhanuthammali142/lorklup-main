import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupPushNotifications } from './push-notifications';
import { useAuth } from './AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    let cleanupFn: (() => void) | undefined;

    setupPushNotifications((data) => {
      console.log('[usePushNotifications] Notification clicked with data:', data);
      
      // Handle deep linking/routing on click
      if (data.type === 'complaint') {
        if (user.role === 'student') navigate('/student/complaints');
        else if (user.role === 'admin') navigate('/admin/complaints');
      } else if (data.type === 'fee') {
        if (user.role === 'student') navigate('/student/fees');
        else if (user.role === 'admin') navigate('/admin/fees');
      } else if (data.type === 'announcement') {
        if (user.role === 'student') navigate('/student/announcements');
        else if (user.role === 'admin') navigate('/admin/announcements');
      } else if (data.url) {
        // Fallback custom relative url routing
        navigate(data.url);
      }
    }).then(cleanup => {
      cleanupFn = cleanup;
    });

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [user, navigate]);
}
