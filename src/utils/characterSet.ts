import emojiRegex                     from "emoji-regex";
import { characterSet, CharacterSet } from "../base";


export function findCharacterSet(name: string): CharacterSet {
    const label = name.substring(0, name.lastIndexOf('.'));
    // digit only
    if (!isNaN(Number(label)))
      return characterSet.DIGIT;
    // regex latin letters only
    if (/^[a-zA-Z]+$/.test(label))
      return characterSet.LETTER;
    // regex emoji only
    const emojiRegExp = emojiRegex();
    if (emojiRegExp.test(label))
      return characterSet.EMOJI;
    // regex unicode mode, alphanumeric
    // \p{L} or \p{Letter}: any kind of letter from any language. 
    // \p{N} or \p{Number}: any kind of numeric character in any script. 
    if (/^[\p{L}\p{N}]*$/u.test(label))
      return characterSet.ALPHANUMERIC;

    return characterSet.MIXED;
  }
