import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fluxer.mobile',
  appName: 'Flukavike',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
    // Use a proxy for local development to bypass CORS
    proxy: {
      '/proxy': {
        target: 'https://api.fluxer.app',
        changeOrigin: true,
        pathRewrite: {
          '^/proxy': '',
        },
        // Add required headers for the Fluxer API
        onProxyReq: (proxyReq) => {
          proxyReq.setHeader('Origin', 'https://api.fluxer.app');
        },
      },
    },
  },
  plugins: {
    CapacitorHttp: {
      // Routes all fetch() calls through native URLSession (iOS) / OkHttp (Android)
      // This eliminates WebView CORS restrictions entirely
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#1e1f22',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSplashResourceName: 'Splash',
    },
  },
};

export default config;
