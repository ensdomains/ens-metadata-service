declare namespace Intl {
  class Segmenter {
    public segment: (name: string) => string;
  }
}

export default function getCharLength(name: string): number {
  return [...new Intl.Segmenter().segment(name)].length;
}
