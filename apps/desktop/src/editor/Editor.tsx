import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

// Minimal schema: doc → paragraph+ → text, with strong and em marks
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
    text: { group: "inline" },
  },
  marks: {
    strong: {
      toDOM: () => ["strong", 0],
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
    },
    em: {
      toDOM: () => ["em", 0],
      parseDOM: [{ tag: "em" }, { tag: "i" }],
    },
  },
});

function createState() {
  return EditorState.create({
    schema,
    plugins: [
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-Shift-z": redo,
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
      }),
      keymap(baseKeymap),
    ],
  });
}

export function Editor() {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    viewRef.current = new EditorView(mountRef.current, {
      state: createState(),
      dispatchTransaction(tr) {
        const newState = viewRef.current!.state.apply(tr);
        viewRef.current!.updateState(newState);
      },
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="editor-mount" />;
}
