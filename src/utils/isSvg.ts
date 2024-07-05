// @ref: https://github.com/sindresorhus/is-svg
// @ref: https://github.com/sindresorhus/is-svg/pull/38
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export default function isSvg(data: string) {
  if (typeof data !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof data}\``);
  }

  data = data.toLowerCase().trim();

  if (data.length === 0) {
    return false;
  }

  // Has to be `!==` as it can also return an object with error info.
  if (XMLValidator.validate(data) !== true) {
    return false;
  }

  let jsonObject;
  const parser = new XMLParser();

  try {
    jsonObject = parser.parse(data);
  } catch {
    return false;
  }

  if (!jsonObject) {
    return false;
  }

  if (!('svg' in jsonObject)) {
    return false;
  }

  return true;
}
