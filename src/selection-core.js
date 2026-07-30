(() => {
  if (globalThis.SelectionTranslatorCore) return;

  const BLOCK_SELECTOR = "p, li, blockquote, td, th, figcaption, article, section, dd, dt";
  const SHORT_CONTEXT_WORDS = 120;
  const SHORT_CONTEXT_CHARS = 800;
  const SURROUNDING_WORDS = 10;

  function normalizeWhitespace(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function segmentWords(value) {
    const text = normalizeWhitespace(value);
    if (!text) return [];
    if (typeof Intl?.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
      const words = Array.from(segmenter.segment(text))
        .filter((part) => part.isWordLike)
        .map((part) => part.segment);
      if (words.length) return words;
    }
    return text.split(/\s+/).filter(Boolean);
  }

  function findTextBlock(range) {
    const common = range.commonAncestorContainer;
    const element = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement;
    return element?.closest?.(BLOCK_SELECTOR) ?? element;
  }

  function extractContext(selection) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0).cloneRange();
    const selectedText = normalizeWhitespace(selection.toString());
    if (!selectedText) return null;

    const block = findTextBlock(range);
    if (!block) return { selectedText, contextText: "" };

    const blockText = normalizeWhitespace(block.textContent);
    const wordCount = segmentWords(blockText).length;
    if (blockText && wordCount <= SHORT_CONTEXT_WORDS && blockText.length <= SHORT_CONTEXT_CHARS) {
      return { selectedText, contextText: blockText };
    }

    const { before, after } = textAroundRange(block, range, blockText, selectedText);
    const beforeWords = segmentWords(before).slice(-SURROUNDING_WORDS).join(" ");
    const afterWords = segmentWords(after).slice(0, SURROUNDING_WORDS).join(" ");
    const contextText = [
      beforeWords && `[前文] ${beforeWords}`,
      `[选中] ${selectedText}`,
      afterWords && `[后文] ${afterWords}`
    ].filter(Boolean).join("\n");

    return { selectedText, contextText };
  }

  function textAroundRange(block, range, blockText, selectedText) {
    try {
      if (block.contains(range.startContainer) && block.contains(range.endContainer)) {
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(block);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const afterRange = document.createRange();
        afterRange.selectNodeContents(block);
        afterRange.setStart(range.endContainer, range.endOffset);
        return {
          before: normalizeWhitespace(beforeRange.toString()),
          after: normalizeWhitespace(afterRange.toString())
        };
      }
    } catch {
      // 某些动态页面会在读取选区时替换节点，下面使用纯文本回退。
    }

    const index = blockText.indexOf(selectedText);
    return index >= 0
      ? { before: blockText.slice(0, index), after: blockText.slice(index + selectedText.length) }
      : { before: "", after: "" };
  }

  function selectionRect(selection) {
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());
    const rect = rects.at(-1) ?? range.getBoundingClientRect();
    if (!rect) return null;
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  globalThis.SelectionTranslatorCore = {
    extractContext,
    normalizeWhitespace,
    selectionRect
  };
})();
