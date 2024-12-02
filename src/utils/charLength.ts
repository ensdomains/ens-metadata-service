declare namespace Intl {
  class Segmenter {
    public segment: (name: string) => string;
  }
}

export function getSegmentLength(name: string): number {
  let count = 0;
  for (const _ of new Intl.Segmenter().segment(name)) {
    count++;
  }
  return count;
}

export function getCodePointLength(name: string): number {
  // for...of operator will split string into its codepoints
  let count = 0;
  for (const _ of name) {
    count++;
  }
  return count;
}
