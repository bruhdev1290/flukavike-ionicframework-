# Android 12+ Splash Screen Setup

After running `npx cap add android`, update the launch theme in:
`android/app/src/main/res/values/styles.xml`

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
  <item name="windowSplashScreenBackground">#1e1f22</item>
  <item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
  <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

This ensures the native Android 12+ splash API uses the same `#1e1f22` background
before the Capacitor SplashScreen plugin takes over — preventing a jarring white frame.
