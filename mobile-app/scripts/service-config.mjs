// Nonsecret build settings only. Never resolves DNS or reads server credentials.
export function validateServiceConfig(value, { android = false } = {}) {
  const keys = ['HOMEZONE_ENABLE_API', 'HOMEZONE_API_ENV', 'HOMEZONE_API_BASE_URL', 'HOMEZONE_IMAGE_HOSTS'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k)) ||
      value.HOMEZONE_ENABLE_API !== true ||
      !['development', 'staging', 'production'].includes(value.HOMEZONE_API_ENV) ||
      typeof value.HOMEZONE_API_BASE_URL !== 'string' || typeof value.HOMEZONE_IMAGE_HOSTS !== 'string') {
    throw Error('Only the four documented nonsecret service settings are accepted.');
  }
  let origin;
  try { origin = new URL(value.HOMEZONE_API_BASE_URL); } catch { throw Error('Approved canonical origin required.'); }
  const local = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      origin.origin !== value.HOMEZONE_API_BASE_URL ||
      (origin.protocol !== 'https:' && !(value.HOMEZONE_API_ENV === 'development' && local && origin.protocol === 'http:'))) {
    throw Error('Use a canonical HTTPS origin; explicit development loopback HTTP is for supported local workflows only.');
  }
  if (android && (origin.protocol !== 'https:' || local ||
      /^127\./.test(origin.hostname) || origin.hostname.endsWith('.localhost'))) {
    throw Error('Android service builds require an approved reachable HTTPS origin, not loopback or emulator aliases. Cleartext is disabled by the existing manifest.');
  }
  const hosts = value.HOMEZONE_IMAGE_HOSTS ? value.HOMEZONE_IMAGE_HOSTS.split(',') : [];
  if (hosts.some(h => h !== h.toLowerCase() || h.length > 253 ||
      !h.split('.').every(l => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)))) {
    throw Error('Image hosts must be exact lowercase hostnames without wildcards, paths or credentials.');
  }
  return Object.freeze({ ...value, HOMEZONE_IMAGE_HOSTS: [...new Set(hosts)].join(',') });
}
