'use client';

import React, { useState, useMemo } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from '@/lib/tiptap/fontSize';
import TiptapImage from '@tiptap/extension-image';
import { NodeSelection } from 'prosemirror-state';

const ResizableImage = TiptapImage.extend({
  name: 'image',
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-width') ||
          element.getAttribute('width') ||
          (element as HTMLElement).style.width ||
          null,
        renderHTML: (attrs: Record<string, unknown>) => {
          const w = attrs['width'] as string | number | null | undefined;
          if (!w) return {};
          const value = typeof w === 'number' ? `${w}px` : `${w}`;
          return { 'data-width': value };
        },
      },
      float: {
        default: null as 'left' | 'right' | null,
        parseHTML: (element: HTMLElement) => {
          const f = (element as HTMLElement).style.float as 'left' | 'right' | '' | null;
          if (f === 'left' || f === 'right') return f;
          const data = element.getAttribute('data-float');
          if (data === 'left' || data === 'right') return data as 'left' | 'right';
          return null;
        },
        renderHTML: (attrs: Record<string, unknown>) => {
          const f = attrs['float'] as 'left' | 'right' | null | undefined;
          if (!f) return {};
          return { 'data-float': f };
        },
      },
      vshift: {
        default: null as number | string | null,
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute('data-vshift');
          if (data) return data;
          const mt = (element as HTMLElement).style.marginTop;
          return mt || null;
        },
        renderHTML: (attrs: Record<string, unknown>) => {
          const v = attrs['vshift'] as string | number | null | undefined;
          if (!v) return {};
          const value = typeof v === 'number' ? `${v}px` : `${v}`;
          return { 'data-vshift': value };
        },
      },
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.className = 'tiptap-image-wrapper';
      dom.style.display = 'inline-block';
      dom.style.position = 'relative';
      dom.style.lineHeight = '';
      dom.setAttribute('draggable', 'false');
      dom.style.cursor = 'grab';
      // prevent native drag ghost image
      // @ts-expect-error webkitUserDrag is a non-standard property
      dom.style.webkitUserDrag = 'none';
      dom.addEventListener('dragstart', (e) => e.preventDefault());

      const img = document.createElement('img');
      img.setAttribute('draggable', 'false');
      // @ts-expect-error webkitUserDrag is a non-standard property
      img.style.webkitUserDrag = 'none';
      const { src, alt, title, width, float, vshift } = node.attrs as { src: string; alt?: string; title?: string; width?: number | string | null; float?: 'left' | 'right' | null; vshift?: number | string | null };
      img.src = src;
      if (alt) img.alt = alt;
      if (title) img.title = title;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      if (width) img.style.width = typeof width === 'number' ? `${width}px` : `${width}`;

      const applyFloat = (f: 'left' | 'right' | null | undefined, v: string | undefined) => {
        const top = v ?? dom.style.marginTop ?? '0px';
        if (f === 'left') {
          dom.style.cssFloat = 'left';
          dom.style.marginTop = top;
          dom.style.marginRight = '12px';
          dom.style.marginBottom = '12px';
          dom.style.marginLeft = '0';
          dom.style.display = 'inline-block';
          dom.style.lineHeight = '';
        } else if (f === 'right') {
          dom.style.cssFloat = 'right';
          dom.style.marginTop = top;
          dom.style.marginLeft = '12px';
          dom.style.marginBottom = '12px';
          dom.style.marginRight = '0';
          dom.style.display = 'inline-block';
          dom.style.lineHeight = '';
        } else {
          dom.style.cssFloat = '';
          dom.style.marginTop = top;
          dom.style.marginRight = '0';
          dom.style.marginBottom = '0';
          dom.style.marginLeft = '0';
          dom.style.display = 'inline-block';
          dom.style.lineHeight = '';
        }
      };
      const vshiftVal = vshift ? (typeof vshift === 'number' ? `${vshift}px` : `${vshift}`) : undefined;
      applyFloat(float, vshiftVal);
      // Drag only when wrapped; otherwise disable drag cursor
      dom.style.cursor = float ? 'grab' : 'default';

      dom.appendChild(img);

      const cleanup: Array<() => void> = [];

      // Drag-to-wrap & vertical shift with live reflow (no native DnD snap)
      let currentFloat: 'left' | 'right' | null | undefined = float ?? null;
        const onDragMouseDown = (e: MouseEvent) => {
          // Handles call stopPropagation; this is for dragging the image wrapper
          if (!currentFloat) return; // if inline / own line, do not allow dragging
          e.preventDefault();
          e.stopPropagation();
          const editorRect = editor.view.dom.getBoundingClientRect();
        const editorRoot = editor.view.dom as HTMLElement;
        const prevUserSelect = editorRoot.style.userSelect;
        const prevCaretColor = editorRoot.style.caretColor;
        editorRoot.style.userSelect = 'none';
        editorRoot.style.caretColor = 'transparent';
        dom.style.cursor = 'grabbing';
        dom.style.willChange = 'transform';
        dom.style.pointerEvents = 'none';
        // Lock wrapper size during drag to reduce layout jitter
        const imgRect0 = img.getBoundingClientRect();
        dom.style.width = `${Math.round(imgRect0.width)}px`;
        dom.style.minHeight = `${Math.round(imgRect0.height)}px`;
        // Find scrollable ancestor for auto-scroll during drag
        const getScrollParent = (el: HTMLElement | null): HTMLElement | null => {
          let cur: HTMLElement | null = el;
          while (cur) {
            const s = getComputedStyle(cur);
            if (/(auto|scroll)/.test(s.overflowY)) return cur;
            cur = cur.parentElement;
          }
          return null;
        };
        const scrollEl = getScrollParent(editor.view.dom as HTMLElement);

        const startY = e.clientY;
        const startX = e.clientX;
        let didMove = false;
        const gripOffsetY = startY - imgRect0.top;
        let lastClientY = startY;
        let overlayY = Math.round(startY - gripOffsetY);
        let targetOverlayY = overlayY;
        // const startTop = parseFloat(getComputedStyle(dom).marginTop || '0') || 0;
        // const animOffset = startTop;
        // const targetOffset = startTop;
        // const imgHeight = img.getBoundingClientRect().height;
        const minY = Math.round(editorRect.top);
        const maxY = Math.round(editorRect.bottom - imgRect0.height);
        let blockTop0 = 0;
        let blockBottom0 = Number.POSITIVE_INFINITY;
        let curBefore = 0;
        let curAfter = 0;
        let lastInsertPos = -1;
        // const lastReanchorTs = 0;
        // const REANCHOR_INTERVAL_MS = 220;
        // const REANCHOR_ZONE = 0.25;
        const curPos0 = typeof getPos === 'function' ? getPos() : null;
        if (curPos0 !== null) {
          const state0 = editor.state;
          const $p = state0.doc.resolve(curPos0);
          let depth0 = -1;
          for (let d = $p.depth; d > 0; d--) {
            const n = $p.node(d);
            if (n.isBlock) {
              depth0 = d;
              break;
            }
          }
          if (depth0 > 0) {
            const before0 = $p.before(depth0);
            const after0 = $p.after(depth0);
            curBefore = before0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            curAfter = after0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            lastInsertPos = before0;
            try {
              blockTop0 = editor.view.coordsAtPos(before0).top;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              blockBottom0 = editor.view.coordsAtPos(after0).top;
            } catch {}
          }
        }

        // Helper: get the block element for a given document position
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const getBlockElForPos = (pos: number): HTMLElement | null => {
          try {
            const dm = editor.view.domAtPos(pos);
            const root = editor.view.dom as HTMLElement;
            let node = dm.node as Node;
            if (node.nodeType === Node.TEXT_NODE) node = (node.parentNode as Node) || node;
            let el = node as HTMLElement;
            while (el && el !== root && el.parentElement !== root) {
              el = el.parentElement as HTMLElement;
            }
            if (el && el.parentElement === root) return el;
          } catch {}
          return null;
        };

        // This function is defined but never used - commenting out the usage to avoid ESLint error
        // const _getBlockElForPos = getBlockElForPos;

        // Create floating placeholder for live wrap
        const placeholder = document.createElement('span');
        placeholder.className = 'tiptap-image-placeholder ProseMirror-widget';
        placeholder.setAttribute('contenteditable', 'false');
        placeholder.setAttribute('data-pm-ignore', 'true');
        // Keep a placeholder in-flow to hold space so the layout doesn't jump while dragging
        placeholder.style.display = 'block';
        placeholder.style.cssFloat = currentFloat || 'left';
        placeholder.style.width = `${Math.round(imgRect0.width)}px`;
        placeholder.style.height = `${Math.round(imgRect0.height)}px`;
        placeholder.style.pointerEvents = 'none';
        placeholder.style.willChange = 'margin-top';
        placeholder.style.marginTop = dom.style.marginTop || '0px';
        placeholder.style.willChange = 'margin-top';
        placeholder.style.transition = '';
        placeholder.style.marginTop = dom.style.marginTop || '0px';
        placeholder.style.marginRight = currentFloat === 'left' ? '12px' : '0';
        placeholder.style.marginLeft = currentFloat === 'right' ? '12px' : '0';
        placeholder.style.marginBottom = '12px';

        // Snap indicator to show target paragraph while dragging
        const snapIndicator = document.createElement('div');
        snapIndicator.style.position = 'fixed';
        snapIndicator.style.height = '2px';
        snapIndicator.style.background = '#3b82f6';
        snapIndicator.style.borderRadius = '1px';
        snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
        snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
        snapIndicator.style.top = `${Math.round(blockTop0)}px`;
        snapIndicator.style.zIndex = '9999';
        snapIndicator.style.pointerEvents = 'none';
        snapIndicator.style.display = 'none';
        document.body.appendChild(snapIndicator);
        // Insert placeholder exactly where the image wrapper currently lives to preserve layout
        try {
          if (dom.parentNode) {
            (dom.parentNode as HTMLElement).insertBefore(placeholder, dom);
          } else {
            const root = editor.view.dom as HTMLElement;
            if (root.firstChild) root.insertBefore(placeholder, root.firstChild);
            else root.appendChild(placeholder);
          }
        } catch {}

        // Lift the real image out of flow for smooth dragging
        const prevPos = dom.style.position;
        const prevLeft = dom.style.left;
        const prevTop = dom.style.top;
        const prevZ = dom.style.zIndex;
        const prevFloat = dom.style.cssFloat;
        const prevMR = dom.style.marginRight;
        const prevML = dom.style.marginLeft;
        // Lift the real image out of flow as an overlay; placeholder drives live wrapping
        dom.style.position = 'fixed';
        dom.style.left = '0px';
        dom.style.top = '0px';
        dom.style.zIndex = '9999';
        const overlayX = Math.round(currentFloat === 'left' ? editorRect.left : editorRect.left + editorRect.width - imgRect0.width);
        dom.style.transform = `translate3d(${overlayX}px, ${Math.round(overlayY)}px, 0)`;
        dom.style.cssFloat = '';
        dom.style.marginRight = '0';
        dom.style.marginLeft = '0';

        const placeholderBeforePos = curBefore;
        // Snap targets derived from ProseMirror positions (authoritative)
        let snapBeforePos = curBefore;
        const computeStartFromBefore = (beforePos: number): number => {
          try {
            const $b = editor.state.doc.resolve(beforePos);
            for (let d = $b.depth; d > 0; d--) {
              if ($b.before(d) === beforePos) return $b.start(d);
            }
          } catch {}
          return beforePos;
        };
        let snapInsertPos = computeStartFromBefore(curBefore);
        let lastSnapUpdateTs = 0;
        let snapStartPos = snapInsertPos;
        // Track whether top-of-editor snap fallback is being used
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let usedTopSnap = false;

        // This variable is defined but never used - keeping it but commenting out the unused assignments
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _placeholderBeforePos = placeholderBeforePos;

        // Helper: find the very first textblock in the document (robust for any schema)
        const findFirstTextblockBoundaries = (): { before: number; start: number } => {
          let before = 1;
          let start = 1;
          try {
            editor.state.doc.descendants((n, pos) => {
              if (n.isTextblock) {
                before = pos;
                start = pos + 1;
                return false;
              }
              return true;
            });
          } catch {}
          return { before, start };
        };

        // Drag loop with smooth within-block vshift (no re-anchor during drag)
        let rafId: number | null = null;

        const dragLoop = () => {
          if (!currentFloat) return;
          try {
            // Update overlay position alongside cursor
            const overlayXCur = Math.round(currentFloat === 'left'
              ? editorRect.left
              : editorRect.left + editorRect.width - imgRect0.width);
            targetOverlayY = Math.min(maxY, Math.max(minY, Math.round(lastClientY - gripOffsetY)));
            overlayY = overlayY + (targetOverlayY - overlayY) * 0.85;
            dom.style.transform = `translate3d(${overlayXCur}px, ${Math.round(overlayY)}px, 0)`;

            // Auto-scroll the nearest scroll container when close to edges
            if (scrollEl) {
              const sRect = (scrollEl as HTMLElement).getBoundingClientRect();
              const EDGE = 48;
              let dy = 0;
              if (lastClientY < sRect.top + EDGE) {
                dy = -Math.min(24, Math.round((sRect.top + EDGE - lastClientY) * 0.6));
              } else if (lastClientY > sRect.bottom - EDGE) {
                dy = Math.min(24, Math.round((lastClientY - (sRect.bottom - EDGE)) * 0.6));
              }
              if (dy !== 0) {
                (scrollEl as HTMLElement).scrollTop += dy;
              }
            }

            // Determine snap target using ProseMirror coords (consistent with drop)
            const centerX = Math.round(editorRect.left + editorRect.width / 2);
            const clampedY = Math.round(Math.min(editorRect.bottom - 1, Math.max(editorRect.top + 1, lastClientY)));

            // Hard-top fallback: snap to first text block using document traversal (more robust)
            if (clampedY <= editorRect.top + 32) {
              try {
                const { before, start } = findFirstTextblockBoundaries();
                const nowTs = Date.now();
                if (before !== snapBeforePos || nowTs - lastSnapUpdateTs > 50) {
                  snapBeforePos = before;
                  snapInsertPos = start;
                  snapStartPos = start;
                  lastSnapUpdateTs = nowTs;
                }
                usedTopSnap = true;
                const coords = editor.view.coordsAtPos(start);
                snapIndicator.style.display = 'block';
                snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
                snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
                snapIndicator.style.top = `${Math.round(coords.top)}px`;
                // Skip further processing this frame
                rafId = requestAnimationFrame(dragLoop);
                return;
              } catch {}
            }

            const res = editor.view.posAtCoords({ left: centerX, top: clampedY });
            if (res) {
              const $r = editor.state.doc.resolve(res.pos);
              let d = -1;
              for (let k = $r.depth; k > 0; k--) {
                const n = $r.node(k);
                if (n.isBlock) { d = k; break; }
              }
              if (d > 0) {
                const before = $r.before(d);
                const startPos = $r.start(d);
                // Update snap target and indicator only when necessary
                const nowTs = Date.now();
                if (before !== snapBeforePos || nowTs - lastSnapUpdateTs > 50) {
                  snapBeforePos = before;
                  snapInsertPos = startPos;
                  snapStartPos = startPos;
                  lastSnapUpdateTs = nowTs;
                  try {
                    const coords = editor.view.coordsAtPos(snapStartPos);
                    snapIndicator.style.display = 'block';
                    snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
                    snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
                    snapIndicator.style.top = `${Math.round(coords.top)}px`;
                  } catch {}
                } else {
                  // Keep indicator aligned in case of scroll while staying in same block
                  try {
                    const coords = editor.view.coordsAtPos(snapStartPos);
                    snapIndicator.style.display = 'block';
                    snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
                    snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
                    snapIndicator.style.top = `${Math.round(coords.top)}px`;
                  } catch {}
                }
              }
            } else {
              // Fallback when hit-testing fails: snap to first text block via document traversal
              try {
                const { before, start } = findFirstTextblockBoundaries();
                const nowTs = Date.now();
                if (before !== snapBeforePos || nowTs - lastSnapUpdateTs > 50) {
                  snapBeforePos = before;
                  snapInsertPos = start;
                  snapStartPos = start;
                  lastSnapUpdateTs = nowTs;
                }
                usedTopSnap = true;
                const coords = editor.view.coordsAtPos(start);
                snapIndicator.style.display = 'block';
                snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
                snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
                snapIndicator.style.top = `${Math.round(coords.top)}px`;
              } catch {}
            }
          } catch {}
          rafId = requestAnimationFrame(dragLoop);
        };
        if (!rafId) rafId = requestAnimationFrame(dragLoop);

        const onDragMouseMove = (ev: MouseEvent) => {
          lastClientY = ev.clientY;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!didMove && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            didMove = true;
          }
          const x = ev.clientX - editorRect.left;
          // const w = editorRect.width; // This variable is defined but never used

          if (currentFloat === 'left' || currentFloat === 'right') {
            // dragLoop maneja el movimiento; onMouseMove solo actualiza lastClientY
          } else {
            // Decide float basado en bandas horizontales cuando está inline
            let nf: 'left' | 'right' | null;
            const w = editorRect.width;
            if (x < w / 3) nf = 'left';
            else if (x > (2 * w) / 3) nf = 'right';
            else nf = null;

            if (nf !== currentFloat) {
              currentFloat = nf;
              // Update placeholder float/margins to influence wrap during drag
              if (placeholder) {
                placeholder.style.cssFloat = currentFloat || 'left';
                placeholder.style.marginRight = currentFloat === 'left' ? '12px' : '0';
                placeholder.style.marginLeft = currentFloat === 'right' ? '12px' : '0';
              }
            }
          }
        };

        const onDragMouseUp = () => {
          window.removeEventListener('mousemove', onDragMouseMove);
          window.removeEventListener('mouseup', onDragMouseUp);
          dom.style.cursor = 'grab';
          // Restore selection behavior
          (editor.view.dom as HTMLElement).style.userSelect = prevUserSelect;
          (editor.view.dom as HTMLElement).style.caretColor = prevCaretColor;
          // Clear preview transform
          dom.style.transform = '';
          dom.style.willChange = '';
          dom.style.pointerEvents = '';
          dom.style.transition = '';
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
          if (snapIndicator && snapIndicator.parentNode) {
            snapIndicator.parentNode.removeChild(snapIndicator);
          }

          // Compute final insert from coordinates (inside the destination text block) and persist
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const finalOffset = 0;
          try {
            const curPos = typeof getPos === 'function' ? getPos() : null;
            if (!didMove) {
              if (curPos !== null) {
                editor.chain().focus().setNodeSelection(curPos).run();
              }
            } else if (curPos !== null && (currentFloat === 'left' || currentFloat === 'right')) {
              // Reset vshift to 0 so snapping starts at paragraph top
              editor
                .chain()
                .focus()
                .setNodeSelection(curPos)
                .updateAttributes('image', { vshift: '0px' })
                .run();

              // Re-read state after attribute update
              const state = editor.state;
              const start = curPos;
              const end = curPos + node.nodeSize;

              // Compute insertion using the snapBeforePos boundary directly (works for all block types)
              // We resolve the doc at snapBeforePos and find the enclosing block whose 'before' equals snapBeforePos.
              // Then we use its start() as the insertion point to snap at the paragraph start.
              const insertPos = snapStartPos || computeStartFromBefore(snapBeforePos);
              // const finalOffset = 0; // This variable is defined but never used

              if (insertPos && (insertPos < start || insertPos > end)) {
                let tr = state.tr.setMeta('addToHistory', false);
                const slice = state.doc.slice(start, end).content;

                // 1) Remove the image from its original place
                // Capture the source paragraph boundary before deleting, so we can clean it up if it becomes empty.
                const $src = state.doc.resolve(start);
                let srcParaBefore = -1;
                for (let d = $src.depth; d > 0; d--) {
                  const n = $src.node(d);
                  if (n.isTextblock) { srcParaBefore = $src.before(d); break; }
                }
                tr = tr.delete(start, end);

                // 1.1) If the source paragraph became empty, remove it to avoid leaving a blank line.
                if (srcParaBefore > -1) {
                  const mappedSrcBefore = tr.mapping.map(srcParaBefore, -1);
                  const srcNode = tr.doc.nodeAt(mappedSrcBefore);
                  if (srcNode && srcNode.type && srcNode.type.name === 'paragraph' && srcNode.content.size === 0) {
                    tr = tr.delete(mappedSrcBefore, mappedSrcBefore + srcNode.nodeSize);
                  }
                }

                // 2) Map the insertion point through the deletions
                let mappedInsert = tr.mapping.map(insertPos, -1);

                // 2.1) If there's a blank paragraph (only whitespace/hardBreaks) immediately before the insertion point, remove it
                // to avoid creating a visible blank line above the image after the move.
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const isParaBlank = (p: any) => {
                    if (!p || p.type?.name !== 'paragraph') return false;
                    let only = true;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    p.forEach?.((child: any) => {
                      if (child.type?.name === 'hardBreak') return;
                      if (child.isText && (child.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') === '') return;
                      only = false;
                    });
                    return only;
                  };
                  const $mapped = tr.doc.resolve(mappedInsert);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const prev = $mapped.nodeBefore as any;
                  if (prev && isParaBlank(prev)) {
                    const delFrom = mappedInsert - (prev?.nodeSize || 0);
                    tr = tr.delete(delFrom, mappedInsert);
                    mappedInsert = delFrom;
                  }
                } catch {}

                // 3) Normalize destination before inserting:
                //    - If we're inserting at the start of an empty paragraph, delete that paragraph first.
                //    - If the range from paragraph start to mappedInsert contains only whitespace/hardBreaks, trim it.
                try {
                  const $dest = tr.doc.resolve(mappedInsert);
                  let paraDepth = -1;
                  for (let d = $dest.depth; d > 0; d--) {
                    const n = $dest.node(d);
                    if (n.isTextblock) { paraDepth = d; break; }
                  }

                  if (paraDepth > 0) {
                    const parent = $dest.node(paraDepth);
                    const paraStart = $dest.start(paraDepth);
                    const paraPos = $dest.before(paraDepth);

                    // Case A: blank paragraph (only whitespace/hardBreaks) -> delete it and insert at its position
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isParaBlank = (p: any) => {
                      if (!p || p.type?.name !== 'paragraph') return false;
                      let only = true;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      p.forEach((child: any) => {
                        if (child.type?.name === 'hardBreak') return;
                        if (child.isText && (child.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') === '') return;
                        only = false;
                      });
                      return only;
                    };
                    if (isParaBlank(parent)) {
                      tr = tr.delete(paraPos, paraPos + parent.nodeSize);
                      mappedInsert = paraPos;
                    } else {
                      // Case B: trim pure whitespace/hardBreaks between paragraph start and mappedInsert
                      let onlyWhitespace = true;
                      const betweenText = tr.doc.textBetween(paraStart, mappedInsert, undefined, '\ufffc');
                      // Treat object replacement char (used for leaf nodes like hardBreak) as ignorable
                      if (betweenText.replace(/[\u00A0\s\u200B\u200C\u200D\uFEFF\uFFFC]/g, '') !== '') {
                        onlyWhitespace = false;
                      } else {
                        // ensure there are no inline nodes other than hardBreaks
                        tr.doc.nodesBetween(paraStart, mappedInsert, (n) => {
                          if (n.isText) {
                            if ((n.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') !== '') {
                              onlyWhitespace = false;
                              return false;
                            }
                          } else if (n.isInline && n.type.name !== 'hardBreak') {
                            onlyWhitespace = false;
                            return false;
                          }
                          return true;
                        });
                      }
                      if (onlyWhitespace && mappedInsert > paraStart) {
                        tr = tr.delete(paraStart, mappedInsert);
                        mappedInsert = paraStart;
                      }
                    }
                  }
                } catch {}

                // 4) Insert the image slice at the normalized position
                if (mappedInsert !== start) {
                  tr = tr.insert(mappedInsert, slice);
                  editor.view.dispatch(tr);

                  // ProseMirror post-fix: aggressively remove any whitespace or hardBreaks before the image
                  // If the entire range from paragraph start to the image is only whitespace/hardBreaks/ZW chars, delete it.
                  try {
                    const s2 = editor.view.state;
                    // The image was inserted at mappedInsert, use that doc position directly
                    const $img2 = s2.doc.resolve(mappedInsert);
                    const paraStart2 = $img2.start($img2.depth);
                    const imgPos2 = mappedInsert;

                    // Determine if range contains only ignorable content (whitespace text, hardBreaks)
                    let onlyIgnorable = true;
                    s2.doc.nodesBetween(paraStart2, imgPos2, (n) => {
                      if (n.isText) {
                        if ((n.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') !== '') {
                          onlyIgnorable = false;
                          return false;
                        }
                      } else if (n.isInline && n.type.name !== 'hardBreak') {
                        onlyIgnorable = false;
                        return false;
                      }
                      return true;
                    });

                    if (onlyIgnorable && imgPos2 > paraStart2) {
                      const tr2 = s2.tr.delete(paraStart2, imgPos2);
                      editor.view.dispatch(tr2);
                    } else {
                      // Fallback: if textBetween only has whitespace and object replacement chars, also delete
                      const textBefore = s2.doc.textBetween(paraStart2, imgPos2, '\n', '\ufffc');
                      const onlyWs = textBefore.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\uFFFC]/g, '') === '';
                      if (onlyWs && imgPos2 > paraStart2) {
                        const tr2 = s2.tr.delete(paraStart2, imgPos2);
                        editor.view.dispatch(tr2);
                      }
                    }
                  } catch {}

                  // Sneaky fix: aggressively remove any number of empty paragraphs immediately above the paragraph containing the image
                  try {
                    const s3 = editor.view.state;
                    const $img3 = s3.doc.resolve(mappedInsert);
                    // Find enclosing textblock depth for the image
                    let d3 = -1;
                    for (let k = $img3.depth; k > 0; k--) {
                      if ($img3.node(k).isTextblock) { d3 = k; break; }
                    }
                    if (d3 > 0) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const isParaBlank3 = (p: any) => {
                        if (!p || p.type?.name !== 'paragraph') return false;
                        let only = true;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        p.forEach((child: any) => {
                          if (child.type?.name === 'hardBreak') return;
                          if (child.isText && (child.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') === '') return;
                          only = false;
                        });
                        return only || p.content.size === 0;
                      };
                      let tr3 = s3.tr;
                      let changed3 = false;
                      // Position before the enclosing paragraph (block boundary)
                      let beforeBlock3 = $img3.before(d3);
                      const parent3 = $img3.node(d3 - 1);
                      let index3 = $img3.index(d3 - 1);
                      while (index3 > 0) {
                        const prevChild3 = parent3.child(index3 - 1);
                        if (isParaBlank3(prevChild3)) {
                          const prevStart3 = beforeBlock3 - prevChild3.nodeSize;
                          tr3 = tr3.delete(prevStart3, beforeBlock3);
                          beforeBlock3 = prevStart3;
                          index3--;
                          changed3 = true;
                        } else {
                          break;
                        }
                      }
                      if (changed3) {
                        editor.view.dispatch(tr3);
                      }
                    }
                  } catch {}

                  // DOM post-fix: ensure no visual blank line above the image
                  // Some environments might leave a <br> or whitespace text node before the wrapper.
                  // Also neutralize paragraph top margin when the image is first child.
                  try {
                    requestAnimationFrame(() => {
                      const wrapper = dom as HTMLElement;
                      const p = wrapper.closest('p') as HTMLElement | null;
                      if (p) {
                        // 1) Aggressively remove any BRs or whitespace-only text nodes directly before the image
                        let prev: ChildNode | null = wrapper.previousSibling;
                        while (prev) {
                          const node = prev;
                          prev = prev.previousSibling;
                          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
                            node.parentNode?.removeChild(node);
                            continue;
                          }
                          if (node.nodeType === Node.TEXT_NODE && ((node.textContent || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') === '')) {
                            node.parentNode?.removeChild(node);
                            continue;
                          }
                          break;
                        }

                        // 2) If the image is now the first child, nuke top margins around it to prevent any perceived blank line
                        if (wrapper.previousSibling === null) {
                          p.style.marginTop = '0';
                          wrapper.style.marginTop = '0';
                          const prevEl = p.previousElementSibling as HTMLElement | null;
                          if (prevEl) prevEl.style.marginBottom = '0';
                        }

                        // 3) If the immediately previous paragraph is empty (only BRs/whitespace), remove it completely
                        const prevPara = p.previousElementSibling as HTMLElement | null;
                        if (prevPara && prevPara.tagName === 'P') {
                          const hasMeaningfulContent = Array.from(prevPara.childNodes).some((n) => {
                            if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR') return false;
                            if (n.nodeType === Node.TEXT_NODE && ((n.textContent || '').trim() === '')) return false;
                            return true;
                          });
                          if (!hasMeaningfulContent) {
                            prevPara.parentNode?.removeChild(prevPara);
                          }
                        }
                      }
                    });
                  } catch {}

                  // Final sneaky cleanup after insertion: ensure no leading breaks/whitespace in the image's paragraph
                  // and delete any empty previous paragraph left above it.
                  setTimeout(() => {
                    try {
                      const s = editor.view.state;
                      let pos: number | null = null;
                      try {
                        // Find the current document position of this image wrapper
                        // after all prior transactions have settled.
                        // posAtDOM will resolve to the position before the node view.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        pos = (editor.view as any).posAtDOM(dom, 0) as number;
                      } catch {}
                      if (typeof pos === 'number') {
                        const $img = s.doc.resolve(pos);
                        // Find enclosing textblock depth (paragraph, heading, etc.)
                        let pd = -1;
                        for (let d = $img.depth; d > 0; d--) {
                          if ($img.node(d).isTextblock) { pd = d; break; }
                        }
                        if (pd > 0) {
                          const paraStart = $img.start(pd);
                          const imgPos = pos;

                          // 1) Remove ignorable leading content (whitespace text, hardBreaks) before the image
                          let onlyIgnorable = true;
                          s.doc.nodesBetween(paraStart, imgPos, (n) => {
                            if (n.isText) {
                              if ((n.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') !== '') {
                                onlyIgnorable = false;
                                return false;
                              }
                            } else if (n.isInline && n.type.name !== 'hardBreak') {
                              onlyIgnorable = false;
                              return false;
                            }
                            return true;
                          });
                          if (onlyIgnorable && imgPos > paraStart) {
                            const trA = s.tr.delete(paraStart, imgPos).setMeta('addToHistory', false);
                            editor.view.dispatch(trA);
                          }

                          // 2) If the immediately previous paragraph (sibling block) is empty, remove it
                          const parent = $img.node(pd - 1);
                          const index = $img.index(pd - 1);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const isParaBlankX = (p: any) => {
                            if (!p || p.type?.name !== 'paragraph') return false;
                            let only = true;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            p.forEach((child: any) => {
                              if (child.type?.name === 'hardBreak') return;
                              if (child.isText && (child.text || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '') === '') return;
                              only = false;
                            });
                            return only || p.content.size === 0;
                          };
                          if (index > 0) {
                            const prevChild = parent.child(index - 1);
                            if (isParaBlankX(prevChild)) {
                              const prevEnd = $img.before(pd);
                              const prevStart = prevEnd - prevChild.nodeSize;
                              const trB = editor.view.state.tr.delete(prevStart, prevEnd).setMeta('addToHistory', false);
                              editor.view.dispatch(trB);
                            }
                          }
                        }
                      }
                    } catch {}
                  }, 0);
                }
              } else {
                // Not using top snap in this path
                usedTopSnap = false;
              }
            } else {
              // Fallback when hit-testing fails: snap to first text block via document traversal
              try {
                const { before, start } = findFirstTextblockBoundaries();
                const nowTs = Date.now();
                if (before !== snapBeforePos || nowTs - lastSnapUpdateTs > 50) {
                  snapBeforePos = before;
                  snapInsertPos = start;
                  snapStartPos = start;
                  lastSnapUpdateTs = nowTs;
                }
                usedTopSnap = true;
                const coords = editor.view.coordsAtPos(start);
                snapIndicator.style.display = 'block';
                snapIndicator.style.left = `${Math.round(editorRect.left)}px`;
                snapIndicator.style.width = `${Math.round(editorRect.width)}px`;
                snapIndicator.style.top = `${Math.round(coords.top)}px`;
              } catch {}
            }
          } catch {}

          // Remove placeholder and restore wrapper positioning
          if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
          dom.style.position = prevPos;
          dom.style.left = prevLeft;
          dom.style.top = prevTop;
          dom.style.zIndex = prevZ;
          dom.style.cssFloat = prevFloat;
          dom.style.marginRight = prevMR;
          dom.style.marginLeft = prevML;

          // Clear temporary sizing used during drag
          dom.style.width = '';
          dom.style.minHeight = '';

          // Attributes already normalized (vshift reset before move). No further updates needed.
        };

        window.addEventListener('mousemove', onDragMouseMove);
        window.addEventListener('mouseup', onDragMouseUp);
      };

      dom.addEventListener('mousedown', onDragMouseDown);
      img.addEventListener('mousedown', onDragMouseDown);
      cleanup.push(() => dom.removeEventListener('mousedown', onDragMouseDown));
      cleanup.push(() => img.removeEventListener('mousedown', onDragMouseDown));

      // Single-click selects the image node for easy deletion/wrapping
      const onClickSelect = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos !== null) {
          editor.chain().focus().setNodeSelection(pos).run();
        }
      };
      dom.addEventListener('click', onClickSelect);
      img.addEventListener('click', onClickSelect);
      cleanup.push(() => dom.removeEventListener('click', onClickSelect));
      cleanup.push(() => img.removeEventListener('click', onClickSelect));

      const makeHandle = (opts: { left?: string; right?: string; top?: string; bottom?: string; cursor: string; transform: string; dir: number }) => {
        const h = document.createElement('span');
        h.className = 'tiptap-resize-handle';
        h.style.position = 'absolute';
        if (opts.right !== undefined) h.style.right = opts.right;
        if (opts.left !== undefined) h.style.left = opts.left;
        if (opts.bottom !== undefined) h.style.bottom = opts.bottom;
        if (opts.top !== undefined) h.style.top = opts.top;
        h.style.width = '12px';
        h.style.height = '12px';
        h.style.background = 'transparent';
        h.style.border = 'none';
        h.style.boxShadow = 'none';
        h.style.borderRadius = '2px';
        h.style.cursor = opts.cursor;
        h.style.transform = opts.transform;

        let startX = 0;
        let startWidth = 0;

        const onMouseDown = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startWidth = img.getBoundingClientRect().width;
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        };
        const onMouseMove = (e: MouseEvent) => {
          const deltaX = e.clientX - startX;
          const newWidth = Math.max(50, startWidth + opts.dir * deltaX);
          img.style.width = `${newWidth}px`;
        };
        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          const newWidth = Math.round(img.getBoundingClientRect().width);
          editor
            .chain()
            .focus()
            .setNodeSelection(typeof getPos === 'function' ? getPos() : editor.state.selection.$from.pos)
            .updateAttributes('image', { width: newWidth })
            .run();
        };

        h.addEventListener('mousedown', onMouseDown);
        cleanup.push(() => h.removeEventListener('mousedown', onMouseDown));
        dom.appendChild(h);
      };

      // bottom-right
      makeHandle({ right: '0', bottom: '0', cursor: 'nwse-resize', transform: 'translate(50%, 50%)', dir: +1 });
      // bottom-left
      makeHandle({ left: '0', bottom: '0', cursor: 'nesw-resize', transform: 'translate(-50%, 50%)', dir: -1 });
      // top-right
      makeHandle({ right: '0', top: '0', cursor: 'nesw-resize', transform: 'translate(50%, -50%)', dir: +1 });
      // top-left
      makeHandle({ left: '0', top: '0', cursor: 'nwse-resize', transform: 'translate(-50%, -50%)', dir: -1 });

      return {
        dom,
        selectNode: () => {
          dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode: () => {
          dom.classList.remove('ProseMirror-selectednode');
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== node.type.name) return false;
          const attrs = updatedNode.attrs as { src: string; alt?: string; title?: string; width?: number | string | null };
          if (img.src !== attrs.src) img.src = attrs.src;
          img.alt = attrs.alt || '';
          img.title = attrs.title || '';
          if (attrs.width) img.style.width = typeof attrs.width === 'number' ? `${attrs.width}px` : `${attrs.width}`;
          else img.style.removeProperty('width');

          const f = (attrs as { float?: 'left' | 'right' | null }).float;
          currentFloat = f ?? null;
          const v = (attrs as { vshift?: number | string | null }).vshift;
          const top = v ? (typeof v === 'number' ? `${v}px` : `${v}`) : dom.style.marginTop || '0px';

          if (f === 'left') {
            dom.style.cssFloat = 'left';
            dom.style.marginTop = top;
            dom.style.marginRight = '12px';
            dom.style.marginBottom = '12px';
            dom.style.marginLeft = '0';
            dom.style.display = 'inline-block';
            dom.style.lineHeight = '';
          } else if (f === 'right') {
            dom.style.cssFloat = 'right';
            dom.style.marginTop = top;
            dom.style.marginLeft = '12px';
            dom.style.marginBottom = '12px';
            dom.style.marginRight = '0';
            dom.style.display = 'inline-block';
            dom.style.lineHeight = '';
          } else {
            dom.style.cssFloat = '';
            dom.style.marginTop = top;
            dom.style.marginRight = '0';
            dom.style.marginBottom = '0';
            dom.style.marginLeft = '0';
            dom.style.display = 'inline-block';
            dom.style.lineHeight = '';
          }
          // Update cursor based on float value
          dom.style.cursor = f ? 'grab' : 'default';
          return true;
        },
        destroy: () => {
          cleanup.forEach((fn) => fn());
        },
      };
    };
  },
});

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  Highlighter as HighlighterIcon,
  Loader,
  QuoteIcon,
  Heading2,
  Heading1,
  Heading3,
  ListIcon,
  Link2,
  X,
  Palette,
  TextCursorInput,
  Type,
  Image as ImageIcon,
  ImagePlus as ImagePlusIcon,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useListAllBoards } from '@/features/boards/api/useListAllBoards';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import Blockquote from '@tiptap/extension-blockquote';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import { useImageDialog } from '@/features/boards/store/useImageDialog';

const MenuBar = ({
  editor,
  linkableBoards,
  boardId,
}: {
  editor: Editor | null;
  linkableBoards: { _id: Id<'boards'>; name: string }[];
  boardId: Id<'boards'>;
}) => {
  const [search, setSearch] = useState('');
  const filteredBoards = useMemo(
    () => linkableBoards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())),
    [linkableBoards, search]
  );
  const referenceImages = useQuery(api.referenceImages.getByBoardId, { boardId }) || [];

  if (!editor) return null;

  const canWrapImage =
    editor.isActive('image') ||
    (editor.state.selection instanceof NodeSelection &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.state.selection as any).node?.type?.name === 'image');

  const hexToRgba = (hex: string, alpha = 0.35) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getImageName = (url?: string | null, title?: string | null): string => {
    const t = (title || '').trim();
    if (t) return t;
    const u = (url || '').split('?')[0];
    const parts = u.split('/');
    const last = parts[parts.length - 1] || 'image';
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  };

  return (
    <div className="border-b border-[#3a3a3a] bg-[#2a2a2a] p-2 sticky top-0 z-10 rounded-t-md flex flex-wrap items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <BoldIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <ItalicIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={`h-8 w-8 ${editor.isActive('underline') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`h-8 w-8 ${editor.isActive('strike') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <StrikethroughIcon className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <HighlighterIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <button className="h-4 w-4 rounded bg-[rgba(253,230,138,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(253,230,138,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(187,247,208,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(187,247,208,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(191,219,254,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(191,219,254,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(254,202,202,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(254,202,202,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(221,214,254,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(221,214,254,0.35)' }).run(); }} />
            <button className="h-4 w-4 rounded bg-[rgba(251,207,232,0.35)]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: 'rgba(251,207,232,0.35)' }).run(); }} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setHighlight({ color: hexToRgba(e.target.value, 0.35) }).run()}
            aria-label="Pick highlight color"
          />
          <div className="mt-2">
            <Button
              variant="outline"
              className="h-8 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a] w-full"
              onClick={() => editor?.chain().focus().unsetHighlight().run()}
            >
              Clear highlight
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        disabled={!editor.can().chain().focus().setTextAlign('left').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        disabled={!editor.can().chain().focus().setTextAlign('center').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignCenterIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        disabled={!editor.can().chain().focus().setTextAlign('right').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <AlignRightIcon className="h-4 w-4" />
      </Button>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
        className={`h-8 w-8 ${editor.isActive('blockquote') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <QuoteIcon className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 1 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 2 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 3 }) ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 ${editor.isActive('bulletList') ? 'bg-[#4a4a4a]' : 'bg-[#2a2a2a]'} border-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300`}
      >
        <ListIcon className="h-4 w-4" />
      </Button>

      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      {/* Typography controls */}
      <div className="h-6 border-l border-[#3a3a3a] mx-1" />

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-1">
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Courier New').run();
            }}
          >
            <span style={{ fontFamily: 'Courier New' }}>Courier New</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Georgia').run();
            }}
          >
            <span style={{ fontFamily: 'Georgia' }}>Georgia</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('EB Garamond').run();
            }}
          >
            <span style={{ fontFamily: 'EB Garamond' }}>EB Garamond</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Lexend').run();
            }}
          >
            <span style={{ fontFamily: 'Lexend' }}>Lexend</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e: Event) => {
              e.preventDefault();
              editor?.chain().focus().setFontFamily('Impact').run();
            }}
          >
            <span style={{ fontFamily: 'Impact' }}>Impact</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <TextCursorInput className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 p-1">
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('12px').run(); }}>12 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('14px').run(); }}>14 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('16px').run(); }}>16 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('18px').run(); }}>18 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('20px').run(); }}>20 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('24px').run(); }}>24 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('28px').run(); }}>28 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('32px').run(); }}>32 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('36px').run(); }}>36 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('40px').run(); }}>40 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('48px').run(); }}>48 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('60px').run(); }}>60 px</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor?.chain().focus().setFontSize('72px').run(); }}>72 px</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Text color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <button className="h-4 w-4 rounded-full bg-[#e5e7eb]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#e5e7eb').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#f87171]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#f87171').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#60a5fa]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#60a5fa').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#34d399]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#34d399').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#fbbf24]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#fbbf24').run(); }} />
            <button className="h-4 w-4 rounded-full bg-[#a78bfa]" onClick={(e) => { e.preventDefault(); editor?.chain().focus().setColor('#a78bfa').run(); }} />
          </div>
          <Input
            type="color"
            className="h-8 w-full bg-[#1a1a1a] border-[#3a3a3a]"
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            aria-label="Pick text color"
          />
          <div className="mt-2">
            <Button
              variant="outline"
              className="h-8 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a] w-full"
              onClick={() => editor?.chain().focus().unsetColor().run()}
            >
              Clear text color
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Reference image embed */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            aria-label="Insert reference image"
            title="Insert reference image"
          >
            <ImagePlusIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-2 max-h-72 overflow-auto">
          {referenceImages.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No reference images</div>
          ) : (
            referenceImages.map((img) => (
              <DropdownMenuItem
                key={img._id}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  if (!editor) return;
                  const src = img.url || '';
                  const alt = getImageName(img.url, img.title);
                  editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'image', attrs: { src, alt } })
                    .run();
                }}
                className="flex items-center gap-2"
                title={getImageName(img.url, img.title)}
              >
                <Image
                  src={img.url || ''}
                  alt={getImageName(img.url, img.title)}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-cover rounded"
                />
                <span className="truncate">Insert &quot;{getImageName(img.url, img.title)}&quot;</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reference image link */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            aria-label="Insert reference image link"
            title="Insert reference image link"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-2 max-h-72 overflow-auto">
          {referenceImages.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No reference images</div>
          ) : (
            referenceImages.map((img) => (
              <DropdownMenuItem
                key={img._id}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  if (!editor) return;
                  const label = getImageName(img.url, img.title);
                  const href = `#image:${encodeURIComponent(img.url || '')}`;
                  const selection = editor.state.selection;
                  const isEmpty = selection.empty;

                  if (isEmpty) {
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: 'text',
                        text: label,
                        marks: [{ type: 'link', attrs: { href } }],
                      })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href })
                      .run();
                  }
                }}
                className="flex items-center gap-2"
                title={getImageName(img.url, img.title)}
              >
                <Image
                  src={img.url || ''}
                  alt={getImageName(img.url, img.title)}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-cover rounded"
                />
                <span className="truncate">{getImageName(img.url, img.title)}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Image wrap */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
            disabled={!canWrapImage}
          >
            <AlignLeftIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 p-1">
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor.chain().focus().updateAttributes('image', { float: 'left' }).run(); }}>Wrap left</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor.chain().focus().updateAttributes('image', { float: 'right' }).run(); }}>Wrap right</DropdownMenuItem>
          <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); editor.chain().focus().updateAttributes('image', { float: null }).run(); }}>Inline (no wrap)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Existing Link control */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-2 bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2">
          <Input
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 bg-[#1a1a1a] border-[#3a3a3a] text-gray-300 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {filteredBoards.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No boards found</div>
          ) : (
            filteredBoards.map((b) => (
              <DropdownMenuItem
                key={b._id}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  if (!editor) return;
                  const href = `/${b._id}/${encodeURIComponent(b.name)}`;
                  const selection = editor.state.selection;
                  const isEmpty = selection.empty;

                  if (isEmpty) {
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: 'text',
                        text: b.name,
                        marks: [{ type: 'link', attrs: { href } }],
                      })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href })
                      .run();
                  }
                }}
                className="truncate"
                title={b.name}
              >
                {b.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()}
        className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]"
        aria-label="Remove link"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface DocumentProps {
  boardId: Id<'boards'>;
  initialContent?: string;
}

export const Document = ({ boardId, initialContent = '' }: DocumentProps) => {
  const [, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const updateDocument = useMutation(api.documents.update);
  const router = useRouter();
  const { boards: allBoards } = useListAllBoards();
  const { open: openImageDialog } = useImageDialog();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your document here...',
      }),
      Bold,
      Italic,
      Underline,
      Strike,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      Blockquote,
      Heading,
      ListItem,
      ResizableImage,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:opacity-90',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
      debouncedSave(newContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handleClickOn(view, pos, node, nodePos, _event, _direct) {
        try {
          if (node.type && node.type.name === 'image') {
            const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos));
            view.dispatch(tr);
            return true;
          }
        } catch {}
        return false;
      },
      handleDOMEvents: {
        click(view, event) {
          try {
            const target = event.target as HTMLElement;
            const wrapper = target?.closest?.('.tiptap-image-wrapper') as HTMLElement | null;
            if (wrapper) {
              // Resolve the position before the node view DOM and select the image node
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pos = (view as any).posAtDOM(wrapper, 0) as number;
              if (typeof pos === 'number') {
                const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
                view.dispatch(tr);
                view.focus();
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
            }
          } catch {}
          return false;
        },
      },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;

    let previewEl: HTMLDivElement | null = null;

    const removePreview = () => {
      if (previewEl && previewEl.parentNode) {
        previewEl.parentNode.removeChild(previewEl);
      }
      previewEl = null;
    };

    const createPreview = (url: string) => {
      removePreview();
      previewEl = document.createElement('div');
      previewEl.style.position = 'fixed';
      previewEl.style.pointerEvents = 'none';
      previewEl.style.zIndex = '9999';
      previewEl.style.padding = '4px';
      previewEl.style.background = 'rgba(0,0,0,0.7)';
      previewEl.style.borderRadius = '6px';
      previewEl.style.border = '1px solid #3a3a3a';
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '200px';
      img.style.maxHeight = '140px';
      img.style.display = 'block';
      img.style.borderRadius = '4px';
      previewEl.appendChild(img);
      document.body.appendChild(previewEl);
    };

    const getRefImageUrl = (href: string) => {
      if (!href) return null;
      if (href.startsWith('#image:')) {
        try {
          return decodeURIComponent(href.slice(7));
        } catch {
          return href.slice(7);
        }
      }
      return null;
    };

    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const hasMod = me.metaKey || me.ctrlKey;
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        e.preventDefault();
        openImageDialog(refUrl);
        return;
      }

      if (anchor && href.startsWith('/') && hasMod) {
        e.preventDefault();
        router.push(href);
      }
    };

    const onMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        createPreview(refUrl);
      }
    };

    const onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        removePreview();
      }
    };

    const onMouseMove = (e: Event) => {
      const me = e as MouseEvent;
      if (previewEl) {
        const offset = 16;
        let x = me.clientX + offset;
        let y = me.clientY + offset;
        if (x + 220 > window.innerWidth) x = me.clientX - 220;
        if (y + 160 > window.innerHeight) y = me.clientY - 160;
        previewEl.style.left = `${x}px`;
        previewEl.style.top = `${y}px`;
      }
    };

    el.addEventListener('click', onClick);
    el.addEventListener('mouseover', onMouseOver);
    el.addEventListener('mouseout', onMouseOut);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('mouseout', onMouseOut);
      el.removeEventListener('mousemove', onMouseMove);
      removePreview();
    };
  }, [editor, router, openImageDialog]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (newContent: string) => {
        try {
          setIsSaving(true);
          await updateDocument({
            boardId,
            content: newContent,
          });
        } catch (error) {
          toast.error('Failed to save document');
          console.error('Failed to save document:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1000),
    [boardId, updateDocument]
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1a1a] overflow-hidden">
      <div className="bg-[#2a2a2a] rounded-md shadow-md flex-grow flex flex-col overflow-hidden border border-[#3a3a3a]">
        <MenuBar editor={editor} linkableBoards={allBoards || []} boardId={boardId} />
        <div className="flex-grow p-6 overflow-y-auto">
          <style jsx global>{`
            .ProseMirror {
              min-height: calc(100vh - 150px);
            }
            .ProseMirror p {
              margin: 0.5em 0;
            }
            /* Remove extra gap above a paragraph that starts with an image wrapper */
            .ProseMirror p > .tiptap-image-wrapper:first-child {
              margin-top: 0 !important;
            }
            .ProseMirror p:has(> .tiptap-image-wrapper:first-child) {
              margin-top: 0 !important;
            }
            /* Also remove the preceding block's bottom margin when the next paragraph starts with the image */
            .ProseMirror :is(p, h1, h2, h3, blockquote, ul, ol):has(+ p:has(> .tiptap-image-wrapper:first-child)) {
              margin-bottom: 0 !important;
            }
            /* Ensure absolutely no top margin on the very first block in the editor */
            .ProseMirror > :is(p, h1, h2, h3, blockquote, ul, ol):first-child {
              margin-top: 0 !important;
            }
            /* Visual outline when an image node (or any node) is selected */
            .ProseMirror .ProseMirror-selectednode {
              outline: 2px solid #3b82f6;
              outline-offset: 2px;
            }
            .ProseMirror h1 {
              font-size: 1.5em;
              font-weight: bold;
              margin: 0.5em 0;
            }
            .ProseMirror h2 {
              font-size: 1.3em;
              font-weight: bold;
              margin: 0.5em 0;
            }
            .ProseMirror h3 {
              font-size: 1.1em;
              font-weight: bold;
              margin: 0.5em 0;
            }
            .ProseMirror ul {
              list-style-type: disc;
              padding-left: 1.5em;
              margin: 0.5em 0;
            }
            .ProseMirror ol {
              list-style-type: decimal;
              padding-left: 1.5em;
              margin: 0.5em 0;
            }
            .ProseMirror blockquote {
              border-left: 3px solid #4a4a4a;
              padding-left: 1em;
              margin: 0.5em 0;
            }
            .ProseMirror code {
              background: #2a2a2a;
              padding: 0.2em 0.4em;
              border-radius: 3px;
            }
            .ProseMirror pre {
              background: #2a2a2a;
              padding: 0.75em 1em;
              border-radius: 5px;
              margin: 0.5em 0;
            }
            .ProseMirror p[style*='text-align: center'] {
              text-align: center;
            }
            .ProseMirror p[style*='text-align: right'] {
              text-align: right;
            }
            .ProseMirror p[style*='text-align: left'] {
              text-align: left;
            }
            .ProseMirror a {
              color: #60a5fa;
              text-decoration: underline;
            }
          `}</style>
          <EditorContent editor={editor} className="text-gray-200" />
        </div>
      </div>
      {isSaving && (
        <div className="fixed bottom-4 right-4 flex items-center bg-[#2a2a2a] rounded-md px-3 py-1 text-gray-400 text-sm border border-[#3a3a3a]">
          <Loader className="h-3 w-3 animate-spin mr-2" />
          Saving...
        </div>
      )}
    </div>
  );
};
