"use client";

import { useEffect, useRef } from "react";

import { useLanguage } from "@/i18n/language-provider";
import { translateText } from "@/i18n/phrase-dictionary";

const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TEXT_SELECTOR =
  "script, style, code, pre, textarea, [data-no-translate], [data-no-translate] *";
const SKIP_ATTRIBUTE_SELECTOR =
  "script, style, code, pre, [data-no-translate], [data-no-translate] *";

export function LocalizedTextBoundary() {
  const { locale } = useLanguage();
  const applyingRef = useRef(false);
  const frameRef = useRef(null);

  useEffect(() => {
    let observerInstance = null;

    function scheduleApply() {
      if (applyingRef.current) {
        return;
      }

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        applyingRef.current = true;
        try {
          applyTranslations(document.body, locale);
          if (observerInstance) {
            observerInstance.takeRecords();
          }
        } catch (err) {
          console.error("Translation run failed:", err);
        } finally {
          applyingRef.current = false;
        }
      });
    }

    scheduleApply();

    const observer = new MutationObserver((mutations) => {
      if (!applyingRef.current) {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            const node = mutation.target;
            node.__agriOriginalText = node.nodeValue;
          } else if (mutation.type === "attributes" && ATTRIBUTES.includes(mutation.attributeName)) {
            const element = mutation.target;
            const attr = mutation.attributeName;
            const dataKey = `agriOriginal${attr
              .replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}`;
            delete element.dataset[dataKey];
          }
        }
      }
      scheduleApply();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });

    observerInstance = observer;

    return () => {
      observer.disconnect();
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [locale]);

  return null;
}

function applyTranslations(root, locale) {
  if (!root) {
    return;
  }

  translateTextNodes(root, locale);
  translateAttributes(root, locale);
}

function translateTextNodes(root, locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_TEXT_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  for (const node of nodes) {
    if (!node.__agriOriginalText) {
      node.__agriOriginalText = node.nodeValue;
    }

    if (locale === "vi") {
      node.nodeValue = node.__agriOriginalText;
      continue;
    }

    node.nodeValue = translateText(node.__agriOriginalText, locale);
  }
}

function translateAttributes(root, locale) {
  const elements = root.querySelectorAll("*");
  for (const element of elements) {
    if (element.closest(SKIP_ATTRIBUTE_SELECTOR)) {
      continue;
    }

    for (const attr of ATTRIBUTES) {
      const current = element.getAttribute(attr);
      if (!current) {
        continue;
      }

      const dataKey = `agriOriginal${attr
        .replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}`;

      if (!element.dataset[dataKey]) {
        element.dataset[dataKey] = current;
      }

      const original = element.dataset[dataKey];
      element.setAttribute(
        attr,
        locale === "vi" ? original : translateText(original, locale)
      );
    }
  }
}
