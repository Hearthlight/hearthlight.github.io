// Controller invitations keep their controller view; remote invitations need the full key.
export function invitationUrl(value, base) {
  const text = value.trim();
  const short = /^#?([A-Z]{4}\.[a-f0-9]{32})$/i.exec(text);
  let url;
  try { url = short ? new URL(base) : new URL(text); } catch { throw new Error('Paste the complete invitation link from the host.'); }
  if (short) url.hash = short[1];
  const match = /^#([A-Z]{4})(?:\.([a-f0-9]{32}))?$/i.exec(url.hash);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !/\/(?:pad|play)\.html$/.test(url.pathname) || !match || (/\/play\.html$/.test(url.pathname) && !match[2])) {
    throw new Error('Paste the complete invitation link from the host.');
  }
  url.pathname = url.pathname.replace(/(?:pad|play)\.html$/, match[2] ? 'play.html' : 'pad.html');
  url.hash = match[1].toUpperCase() + (match[2] ? '.' + match[2].toLowerCase() : '');
  return url.href;
}
