import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'WhispPro',
    executableName: 'WhispPro',
    appBundleId: 'com.whispro.app',
    appVersion: '0.1.0',
    icon: './assets/icons/icon',
    extraResource: ['app/renderer/dist'],
    osxSign: process.env.APPLE_IDENTITY
      ? {
          identity: process.env.APPLE_IDENTITY,
          hardenedRuntime: true,
          entitlements: 'assets/entitlements.mac.plist',
          entitlementsInherit: 'assets/entitlements.mac.plist',
        }
      : undefined,
    osxNotarize: process.env.APPLE_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD ?? '',
          teamId: process.env.APPLE_TEAM_ID ?? '',
        }
      : undefined,
  },
  makers: [
    new MakerDMG({
      name: 'WhispPro',
      icon: './assets/icons/icon.icns',
      format: 'ULFO',
    }),
  ],
};

export default config;
