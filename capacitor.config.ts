import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Remote Next.js app on Vercel. Set CAPACITOR_SERVER_URL for the WebView entry URL.
 * Local dev example: CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap run android
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.callmedaily.learn",
  appName: "CallMeDaily",
  webDir: "public",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
  server: serverUrl
    ? {
        url: serverUrl,
        androidScheme: "https",
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0e0e0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
