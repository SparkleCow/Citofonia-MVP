const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RULES = `
# react-native-webrtc: R8 no debe eliminar ni renombrar las clases que usa el código nativo (JNI).
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
`;

/** Añade las reglas de ProGuard/R8 de WebRTC al build release de Android. */
module.exports = function withWebrtcProguard(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const file = path.join(mod.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes('org.webrtc.**')) fs.writeFileSync(file, current + RULES);
      return mod;
    },
  ]);
};
