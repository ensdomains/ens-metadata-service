import emojiRegex                     from 'emoji-regex';
import { characterSet, CharacterSet } from '../base';

export function findCharacterSet(name: string): CharacterSet {
  const label = name.substring(0, name.indexOf('.'));
  // regex digit only
  if (/^[0-9]+$/.test(label)) return characterSet.DIGIT;
  // regex latin letters only
  if (/^[a-zA-Z]+$/.test(label)) return characterSet.LETTER;
  // regex unicode mode, alphanumeric
  // \p{L} or \p{Letter}: any kind of letter from any language.
  // \p{N} or \p{Number}: any kind of numeric character in any script.
  if (/^[\p{L}\p{N}]*$/u.test(label)) return characterSet.ALPHANUMERIC;
  // regex emoji only
  const emojiRxp = emojiRegex();
  const newEmojiRxp = new RegExp(`^(${emojiRxp.source})+$`, emojiRxp.flags);
  if (newEmojiRxp.test(label)) return characterSet.EMOJI;

  return characterSet.MIXED;
}
