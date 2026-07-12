import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hostelos.app',
  appName: 'HostelOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#4f46e5",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      keepShowSplit: false
    },
    CapacitorUpdater: {
      autoUpdate: true
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '75808913481-eiqe31mvndteeulaqmrs194bf2a4lmsg.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
