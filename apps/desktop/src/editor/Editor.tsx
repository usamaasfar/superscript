import { baseKeymap, chainCommands, exitCode, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { MarkType } from "prosemirror-model";
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";
import { parseMarkdown, schema, serializeMarkdown } from "./markdown";
import { caretPlugin } from "./plugins/caret";

function markRule(pattern: RegExp, markType: MarkType): InputRule {
  return new InputRule(pattern, (state, match, start, end) => {
    const [full, inner] = match;
    const markStart = start + full.indexOf(inner);
    const markEnd = markStart + inner.length;
    const mark = markType.create();
    const tr = state.tr.addMark(markStart, markEnd, mark).delete(markEnd, end).delete(start, markStart).removeStoredMark(mark);
    return tr;
  });
}

function insertHorizontalRule() {
  return new InputRule(/^---$/, (state, _match, start, end) => {
    const { horizontal_rule, paragraph } = schema.nodes;
    const tr = state.tr.replaceWith(start - 1, end, [horizontal_rule.create(), paragraph.create()]);
    return tr;
  });
}

function buildInputRules() {
  const { strong, em, code, strikethrough } = schema.marks;
  return inputRules({
    rules: [
      // block rules
      textblockTypeInputRule(/^(#{1,3})\s$/, schema.nodes.heading, (match) => ({ level: match[1].length })),
      wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
      textblockTypeInputRule(/^```$/, schema.nodes.code_block),
      wrappingInputRule(/^\s*([-*])\s$/, schema.nodes.bullet_list),
      wrappingInputRule(
        /^(\d+)\.\s$/,
        schema.nodes.ordered_list,
        (match) => ({ order: +match[1] }),
        (match, node) => node.childCount + node.attrs.order === +match[1],
      ),
      insertHorizontalRule(),
      // inline mark rules
      markRule(/_([^_]+)_(?=\s|$)/, em), // _italic_
      markRule(/\*([^*]+)\*(?=\s|$)/, strong), // *bold*
      markRule(/~~([^~]+)~~(?=\s|$)/, strikethrough), // ~~strikethrough~~
      markRule(/~([^~]+)~(?=\s|$)/, strikethrough), // ~strikethrough~
      markRule(/`([^`]+)`(?=\s|$)/, code), // `code`
    ],
  });
}

function buildKeymap() {
  const { strong, em, code, strikethrough } = schema.marks;
  const { heading, code_block, blockquote, bullet_list, ordered_list, list_item, hard_break, paragraph } = schema.nodes;

  const insertHardBreak = chainCommands(exitCode, (state, dispatch) => {
    if (dispatch) dispatch(state.tr.replaceSelectionWith(hard_break.create()).scrollIntoView());
    return true;
  });

  return keymap({
    // history
    "Mod-z": undo,
    "Mod-Shift-z": redo,

    // inline marks
    "Mod-b": toggleMark(strong),
    "Mod-i": toggleMark(em),
    "Mod-e": toggleMark(code),
    "Mod-Shift-s": toggleMark(strikethrough),

    // headings
    "Mod-Alt-1": setBlockType(heading, { level: 1 }),
    "Mod-Alt-2": setBlockType(heading, { level: 2 }),
    "Mod-Alt-3": setBlockType(heading, { level: 3 }),
    "Mod-Alt-0": setBlockType(paragraph),

    // blocks
    "Mod-Shift-b": wrapIn(blockquote),
    "Mod-Alt-c": setBlockType(code_block),

    // lists
    "Mod-Shift-7": wrapInList(ordered_list),
    "Mod-Shift-8": wrapInList(bullet_list),
    Enter: splitListItem(list_item),
    Tab: sinkListItem(list_item),
    "Shift-Tab": liftListItem(list_item),
    "Mod-[": liftListItem(list_item),
    "Mod-]": sinkListItem(list_item),

    // line break — both Shift-Enter and Cmd-Enter
    "Shift-Enter": insertHardBreak,
    "Mod-Enter": insertHardBreak,
  });
}

function createState(initialMarkdown?: string) {
  const doc = initialMarkdown ? parseMarkdown(initialMarkdown) : undefined;
  return EditorState.create({
    schema,
    doc,
    plugins: [history(), buildInputRules(), buildKeymap(), keymap(baseKeymap), caretPlugin],
  });
}

function isEmptyDoc(state: EditorState) {
  const first = state.doc.firstChild;
  return state.doc.childCount === 1 && first?.type === schema.nodes.paragraph && first.content.size === 0;
}

function syncEmptyClass(view: EditorView) {
  view.dom.classList.toggle("is-empty", isEmptyDoc(view.state));
}

interface EditorProps {
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
}

export function Editor({ initialMarkdown, onChange }: EditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: editor is imperative; initialMarkdown is only used on mount
  useEffect(() => {
    if (!mountRef.current) return;

    viewRef.current = new EditorView(mountRef.current, {
      state: createState(initialMarkdown),
      attributes: {
        autocapitalize: "on",
        autocorrect: "on",
        spellcheck: "true",
      },
      dispatchTransaction(tr) {
        const newState = viewRef.current?.state.apply(tr);
        if (!newState) return;
        viewRef.current?.updateState(newState);
        if (viewRef.current) syncEmptyClass(viewRef.current);
        if (tr.docChanged && onChangeRef.current) {
          onChangeRef.current(serializeMarkdown(newState.doc));
        }
      },
    });

    syncEmptyClass(viewRef.current);
    requestAnimationFrame(() => {
      viewRef.current?.focus();
      mountRef.current?.classList.add("is-mounted");
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="editor-mount" />;
}
