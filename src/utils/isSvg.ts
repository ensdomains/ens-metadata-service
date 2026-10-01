// Cheap magic-bytes check for SVG content served with a wrong/generic
// Content-Type. Only inspects the first few KB with plain string scans
// (no regex, no backtracking) so classification cost stays O(1) regardless
// of body size (a full-document XML parse here was a DoS vector).
// False negatives are safe: undetected SVGs are served under their declared
// non-SVG mimetype, which browsers only handle in scriptless image mode.

export const SNIFF_BYTES = 4096;

export default function isSvg(data: string) {
  if (typeof data !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof data}\``);
  }

  let head = data.slice(0, SNIFF_BYTES).trimStart().toLowerCase();
  if (head.startsWith('\uFEFF')) {
    head = head.slice(1).trimStart();
  }

  if (head.startsWith('<svg')) {
    return true;
  }
  if (head.startsWith('<!doctype svg')) {
    return true;
  }
  if (head.startsWith('<?xml')) {
    const declEnd = head.indexOf('?>');
    return declEnd !== -1 && head.slice(declEnd + 2).trimStart().startsWith('<svg');
  }
  return false;
}
