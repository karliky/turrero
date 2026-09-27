declare module 'epub-gen' {
  interface EpubChapter {
    title: string;
    data: string;
  }

  interface EpubOptions {
    title: string;
    author: string;
    publisher?: string;
    content: EpubChapter[];
    verbose?: boolean;
    cover?: string | null;
    css?: string;
  }

  export default class Epub {
    constructor(options: EpubOptions, output: string);
    promise: Promise<void>;
  }
}
