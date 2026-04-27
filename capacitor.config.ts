import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.azatechnologies.ductulator",
  appName: "AZA Ductulator",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    backgroundColor: "#0b1220",
    allowMixedContent: false,
  },
};

export default config;
