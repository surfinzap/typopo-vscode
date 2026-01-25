declare module 'typopo' {
  export interface TypopoConfig {
    removeLines?:                         boolean;
    removeWhitespacesBeforeMarkdownList?: boolean;
    keepMarkdownCodeBlocks?:              boolean;
  }

  export function fixTypos(text: string, language: string, config?: TypopoConfig): string;
}
