/* Shared, dependency-free validation. Browser and Node use the same rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TASTAMA_UTILS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /** @param {unknown} language */
  function normalizeLanguage(language) {
    const value = String(language || '').toLowerCase().split('-')[0];
    return value === 'kz' ? 'kk' : ['ru', 'kk', 'en'].includes(value) ? value : 'en';
  }
  /** @param {{appUrl?: string, appUrlVerified?: boolean}} config */
  function safeAppUrl(config) {
    if (!config.appUrlVerified || !config.appUrl) return '';
    try {
      const url = new URL(config.appUrl);
      if (url.protocol !== 'https:' || url.username || url.password || /(^localhost$|^127\.|^0\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\.|\[|\.local$|ngrok|trycloudflare|localhost|localtunnel)/i.test(url.hostname)) return '';
      return url.href;
    } catch { return ''; }
  }
  /** @param {{contactEmail?: string, contactEmailVerified?: boolean}} config */
  function verifiedContact(config) {
    const email = String(config.contactEmail || '').trim();
    return config.contactEmailVerified && /^[^\s@?&\r\n]+@[^\s@?&\r\n]+\.[^\s@?&\r\n]+$/.test(email) ? email : '';
  }
  /** @param {{name: string, email: string, organization?: string, message: string, website?: string}} data */
  function validateContact(data) {
    /** @type {Record<string, string>} */
    const errors = {};
    if (data.name.trim().length < 2 || data.name.trim().length > 100 || /[\r\n]/.test(data.name)) errors.name = 'contact.invalidName';
    if (data.email.length > 254 || !/^[^\s@?&\r\n]+@[^\s@?&\r\n]+\.[^\s@?&\r\n]+$/.test(data.email)) errors.email = 'contact.invalidEmail';
    if (data.message.trim().length < 10 || data.message.trim().length > 3000) errors.message = 'contact.invalidMessage';
    if ((data.organization || '').length > 160) errors.organization = 'contact.invalidName';
    if (data.website) errors.spam = 'contact.error';
    return errors;
  }
  /** @param {{name: string, email: string, organization?: string, message: string}} data
   * @param {Record<string, string>} labels
   * @param {string} subject */
  function makeDraft(data, labels, subject) {
    return `${subject}\n\n${labels['contact.name']}: ${data.name.trim()}\n${labels['contact.organization']}: ${(data.organization || '').trim()}\n${labels['contact.email']}: ${data.email.trim()}\n\n${labels['contact.message']}:\n${data.message.trim()}`;
  }
  /** @param {string} email @param {string} subject @param {string} body */
  function mailtoUrl(email, subject, body) {
    return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return {normalizeLanguage, safeAppUrl, verifiedContact, validateContact, makeDraft, mailtoUrl};
});
