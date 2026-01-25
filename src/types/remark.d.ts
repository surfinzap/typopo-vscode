declare module 'unified' {
  export interface Processor {
    use(plugin: any, options?: any): Processor;
    parse(doc: string): any;
  }
  export function unified(): Processor;
}

declare module 'remark-parse' {
  const plugin: any;
  export default plugin;
}

declare module 'remark-gfm' {
  const plugin: any;
  export default plugin;
}

declare module 'remark-frontmatter' {
  const plugin: any;
  export default plugin;
}

declare module 'unist-util-visit' {
  export function visit(
    tree: any,
    test: string | string[] | ((node: any) => boolean) | undefined,
    visitor: (node: any, index: number | undefined, parent: any) => void | typeof SKIP
  ): void;
  export const SKIP: unique symbol;
}

export interface Position {
  start: { line: number; column: number; offset: number };
  end:   { line: number; column: number; offset: number };
}

export interface MdastNode {
  type:      string;
  position?: Position;
  value?:    string;
  children?: MdastNode[];
}
