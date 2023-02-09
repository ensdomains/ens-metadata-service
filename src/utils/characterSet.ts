import emojiRegex                     from 'emoji-regex';
import { characterSet, CharacterSet } from '../base';

export function findCharacterSet(label: string): CharacterSet {
  // regex digit only
  if (/^[0-9]+$/.test(label)) return characterSet.DIGIT;
  // regex latin letters only
  if (/^[a-zA-Z]+$/.test(label)) return characterSet.LETTER;
  // regex unicode mode, alphanumeric
  // \p{L} or \p{Letter}: any kind of letter from any language.
  // \p{N} or \p{Number}: any kind of numeric character in any script.
  if (/^[\p{L}\p{N}]*$/u.test(label)) return characterSet.ALPHANUMERIC;
  // regex emoji only
  if (/^[\p{Extended_Pictographic}|\p{Emoji_Component}]+$/gu.test(label)) return characterSet.EMOJI;

  return characterSet.MIXED;
}

export function isASCII(label: string) {
  // function excludes all known emojis from ascii check
  const emojiRxp = emojiRegex();
  // check both ascii and emoji character set
  const newEmojiRxp = new RegExp(
    `^([\x00-\x7F]|${emojiRxp.source})+$`,
    emojiRxp.flags
  );
  return newEmojiRxp.test(label);
}
