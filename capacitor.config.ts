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
    allowNavigation: [
      '*.hcaptcha.com',
      'hcaptcha.com',
      // Cloudflare Turnstile challenge domain
      'challenges.cloudflare.com',
    ],
  },
  // Spoof the WebView User-Agent to look like standard Mobile Safari.
  // This helps bypass Cloudflare's strict WebView bot-detection.
  overrideUserAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
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
