declare namespace Intl {
  class Segmenter {
    public segment: (name: string) => string;
  }
}

export function getSegmentLength(name: string): number {
  return [...new Intl.Segmenter().segment(name)].length;
}

export function getCodePointLength(name: string): number {
  // spread operator will split string into its codepoints
  return [...name].length;
}
