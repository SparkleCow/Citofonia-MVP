const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android bloquea HTTP sin cifrar en builds release. Solo se habilita cuando la API
 * configurada (EXPO_PUBLIC_API_URL) es `http://` — pruebas en red local. Con una API
 * `https://` el APK queda con el tráfico en claro prohibido.
 */
module.exports = function withCleartextTraffic(config) {
  const cleartext = /^http:\/\//i.test((process.env.EXPO_PUBLIC_API_URL || '').trim());
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) application.$['android:usesCleartextTraffic'] = cleartext ? 'true' : 'false';
    return mod;
  });
};
