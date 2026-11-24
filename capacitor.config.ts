import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.leabook.cinema",
  appName: "Lea Books",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0c0f14",
    minWebViewVersion: 60,
  },
};

export default config;
