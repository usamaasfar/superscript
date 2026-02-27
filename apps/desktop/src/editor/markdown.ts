import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import { Schema } from "prosemirror-model";

// schema: CommonMark nodes + strikethrough mark
export const schema = new Schema({
  nodes: {
    doc: { content: "block+" },

    paragraph: {
      content: "inline*",
      group: "block",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },

    blockquote: {
      content: "block+",
      group: "block",
      defining: true,
      toDOM: () => ["blockquote", 0],
      parseDOM: [{ tag: "blockquote" }],
    },

    horizontal_rule: {
      group: "block",
      toDOM: () => ["hr"],
      parseDOM: [{ tag: "hr" }],
    },

    heading: {
      attrs: { level: { default: 1 } },
      content: "(text | image)*",
      group: "block",
      defining: true,
      toDOM: (node) => [`h${node.attrs.level}`, 0],
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
    },

    code_block: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      marks: "",
      attrs: { params: { default: "" } },
      toDOM: (node) => (node.attrs.params ? ["pre", { "data-params": node.attrs.params }, ["code", 0]] : ["pre", ["code", 0]]),
      parseDOM: [
        {
          tag: "pre",
          preserveWhitespace: "full" as const,
          getAttrs: (dom) => ({
            params: (dom as HTMLElement).getAttribute("data-params") || "",
          }),
        },
      ],
    },

    bullet_list: {
      content: "(list_item | task_item)+",
      group: "block",
      attrs: { tight: { default: false } },
      toDOM: (node) => ["ul", { "data-tight": node.attrs.tight ? "true" : null }, 0],
      parseDOM: [
        {
          tag: "ul",
          getAttrs: (dom) => ({ tight: (dom as HTMLElement).hasAttribute("data-tight") }),
        },
      ],
    },

    ordered_list: {
      content: "list_item+",
      group: "block",
      attrs: { order: { default: 1 }, tight: { default: false } },
      toDOM: (node) => [
        "ol",
        {
          start: node.attrs.order === 1 ? null : node.attrs.order,
          "data-tight": node.attrs.tight ? "true" : null,
        },
        0,
      ],
      parseDOM: [
        {
          tag: "ol",
          getAttrs: (dom) => ({
            order: (dom as HTMLElement).hasAttribute("start") ? Number((dom as HTMLElement).getAttribute("start")) : 1,
            tight: (dom as HTMLElement).hasAttribute("data-tight"),
          }),
        },
      ],
    },

    list_item: {
      content: "paragraph block*",
      defining: true,
      toDOM: () => ["li", 0],
      parseDOM: [{ tag: "li" }],
    },

    task_item: {
      attrs: { checked: { default: false } },
      content: "paragraph block*",
      defining: true,
      toDOM: (node) => ["li", { "data-task": node.attrs.checked ? "true" : "false" }, 0],
      parseDOM: [
        {
          tag: "li[data-task]",
          getAttrs: (dom) => ({ checked: (dom as HTMLElement).getAttribute("data-task") === "true" }),
        },
      ],
    },

    text: { group: "inline" },

    image: {
      inline: true,
      group: "inline",
      draggable: true,
      attrs: { src: {}, alt: { default: null }, title: { default: null } },
      toDOM: (node) => ["img", node.attrs],
      parseDOM: [
        {
          tag: "img[src]",
          getAttrs: (dom) => ({
            src: (dom as HTMLElement).getAttribute("src"),
            alt: (dom as HTMLElement).getAttribute("alt"),
            title: (dom as HTMLElement).getAttribute("title"),
          }),
        },
      ],
    },

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      toDOM: () => ["br"],
      parseDOM: [{ tag: "br" }],
    },
  },

  marks: {
    em: {
      toDOM: () => ["em", 0],
      parseDOM: [{ tag: "em" }, { tag: "i" }],
    },
    strong: {
      toDOM: () => ["strong", 0],
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
    },
    link: {
      attrs: { href: {}, title: { default: null } },
      inclusive: false,
      toDOM: (mark) => ["a", { href: mark.attrs.href, title: mark.attrs.title }, 0],
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (dom) => ({
            href: (dom as HTMLElement).getAttribute("href"),
            title: (dom as HTMLElement).getAttribute("title"),
          }),
        },
      ],
    },
    code: {
      toDOM: () => ["code", 0],
      parseDOM: [{ tag: "code" }],
    },
    strikethrough: {
      toDOM: () => ["s", 0],
      parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }],
    },
  },
});

function listIsTight(tokens: Token[], i: number) {
  while (++i < tokens.length) if (tokens[i].type !== "list_item_open") return tokens[i].hidden;
  return false;
}

// parser: CommonMark + strikethrough (~~text~~)
const md = MarkdownIt("commonmark", { html: false }).enable("strikethrough");

// core rule: detect GFM task list items (- [ ] / - [x]) and rename their tokens
md.core.ruler.push("task_list", (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "list_item_open") continue;
    // find the first inline token inside this list item
    for (let j = i + 1; j < tokens.length; j++) {
      const t = tokens[j].type;
      if (t === "list_item_close") break;
      if (t !== "inline") continue;
      const children = tokens[j].children;
      if (!children?.length || children[0].type !== "text") break;
      const m = /^\[([ xX])\] /.exec(children[0].content);
      if (!m) break;
      // rename to task_item_open / task_item_close
      tokens[i].type = "task_item_open";
      tokens[i].attrSet("data-task", m[1] !== " " ? "true" : "false");
      let depth = 0;
      for (let k = i + 1; k < tokens.length; k++) {
        if (tokens[k].type === "list_item_open") depth++;
        else if (tokens[k].type === "list_item_close") {
          if (depth === 0) { tokens[k].type = "task_item_close"; break; }
          depth--;
        }
      }
      children[0].content = children[0].content.slice(m[0].length);
      break;
    }
  }
});

export const markdownParser = new MarkdownParser(schema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  task_item: {
    block: "task_item",
    getAttrs: (tok: Token) => ({ checked: tok.attrGet("data-task") === "true" }),
  },
  bullet_list: {
    block: "bullet_list",
    getAttrs: (_: unknown, tokens: Token[], i: number) => ({ tight: listIsTight(tokens, i) }),
  },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok: Token, tokens: Token[], i: number) => ({
      order: Number(tok.attrGet("start")) || 1,
      tight: listIsTight(tokens, i),
    }),
  },
  heading: { block: "heading", getAttrs: (tok: Token) => ({ level: +tok.tag.slice(1) }) },
  code_block: { block: "code_block", noCloseToken: true },
  fence: {
    block: "code_block",
    getAttrs: (tok: Token) => ({ params: tok.info || "" }),
    noCloseToken: true,
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok: Token) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: tok.children?.[0]?.content || null,
    }),
  },
  hardbreak: { node: "hard_break" },
  // softbreak is intentionally omitted: prosemirror-markdown's default handler adds a
  // plain space " " rather than a hard_break node, so soft line breaks in .md source
  // are never round-tripped back as "  \n" hard-break syntax on save.
  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok: Token) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code", noCloseToken: true },
  s: { mark: "strikethrough" },
});

// serializer: default + strikethrough → ~~text~~ + task_item → - [ ] / - [x]
export const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    task_item: (state, node) => {
      state.write(node.attrs.checked ? "[x] " : "[ ] ");
      state.renderContent(node);
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    strikethrough: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
  },
);

export function parseMarkdown(text: string) {
  return markdownParser.parse(text);
}

export function serializeMarkdown(doc: ReturnType<typeof parseMarkdown>) {
  if (!doc) return "";
  return markdownSerializer.serialize(doc);
}
