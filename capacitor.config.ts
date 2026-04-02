import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fluxer.mobile',
  appName: 'Flukavike',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
    // Sets window.location.hostname to 'web.fluxer.app' inside the WebView.
    // Required so hCaptcha's sitekey validates against the correct registered domain
    // instead of 'localhost'. CapacitorHttp bypasses CORS so this doesn't affect
    // API calls on native.
    hostname: 'web.fluxer.app',
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
  android: {
    buildOptions: {
      keystorePath: 'undefined',
      keystoreAlias: 'undefined',
      signingType: 'apksigner',
    },
  },
};

export default config;
