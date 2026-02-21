import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export type CaretStyle = "line" | "underline";

let caretStyle: CaretStyle = (localStorage.getItem("cursor") as CaretStyle) ?? "line";
const caretInstances = new Set<{ view: EditorView; el: HTMLElement }>();

export function setCaretStyle(style: CaretStyle) {
  caretStyle = style;
  caretInstances.forEach(({ view, el }) => updateCaret(view, el));
}

function getCursorRect(view: EditorView) {
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rects = range.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : null;
    if (rect?.height) return rect;
  }
  return view.coordsAtPos(view.state.selection.head);
}

function updateCaret(view: EditorView, el: HTMLElement) {
  const container = el.parentElement;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const cursorRect = getCursorRect(view);
  if (!cursorRect) return;

  const lineHeight = cursorRect.bottom - cursorRect.top;
  el.setAttribute("data-style", caretStyle);
  el.style.left = `${cursorRect.left - containerRect.left}px`;
  el.style.top =
    caretStyle === "underline"
      ? `${cursorRect.bottom - containerRect.top - 2}px`
      : `${cursorRect.top - containerRect.top}px`;
  el.style.height = caretStyle === "underline" ? "2px" : `${lineHeight}px`;

  // restart blink so caret stays solid while typing
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
}

export const caretPlugin = new Plugin({
  view(view) {
    const parent = view.dom.parentElement;
    if (!parent) {
      console.warn("caretPlugin: editor has no parent element; skipping custom caret");
      return {};
    }

    const el = document.createElement("div");
    el.className = "pm-caret";
    el.setAttribute("data-style", caretStyle);
    parent.appendChild(el);
    const instance = { view, el };
    caretInstances.add(instance);
    updateCaret(view, el);

    return {
      update(v) {
        updateCaret(v, el);
      },
      destroy() {
        el.remove();
        caretInstances.delete(instance);
      },
    };
  },
});
