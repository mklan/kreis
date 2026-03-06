import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'at.klanm.kreis',
  appName: 'Kreis',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
