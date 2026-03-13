"use client";

import React from "react";
import {
  MdFormatUnderlined,
  MdFormatBold,
  MdFormatItalic,
} from "react-icons/md";

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter your question here...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const toggleWrap = (tag: "b" | "i" | "u") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === null || end === null) return;

    const selectedText = value.substring(start, end);
    const startTag = `<${tag}>`;
    const endTag = `</${tag}>`;

    const beforeSelection = value.substring(0, start);
    const afterSelection = value.substring(end);

    const isWrappedBefore =
      start >= startTag.length &&
      beforeSelection.substring(start - startTag.length, start) === startTag;
    const isWrappedAfter =
      afterSelection.substring(0, endTag.length) === endTag;

    if (selectedText && isWrappedBefore && isWrappedAfter) {
      const newBefore = beforeSelection.slice(0, -startTag.length);
      const newAfter = afterSelection.slice(endTag.length);
      const newValue = newBefore + selectedText + newAfter;
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newStart = start - startTag.length;
        const newEnd = end - startTag.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
      return;
    }

    if (selectedText) {
      const newValue =
        beforeSelection + startTag + selectedText + endTag + afterSelection;
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newStart = start + startTag.length;
        const newEnd = end + startTag.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    }
  };

  const renderPreview = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/<b>(.*?)<\/b>/g, "<b>$1</b>")
      .replace(/<i>(.*?)<\/i>/g, "<i>$1</i>")
      .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>");
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      {value && (
        <>
          <strong>Preview:</strong>
          <div
            style={{
              marginTop: "8px",
              padding: "8px",
              border: "1px dashed var(--fg)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "transparent",
              fontSize: "14px",
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: renderPreview(value) }} />
          </div>
        </>
      )}
      <br />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            resize: "vertical",
            fontFamily: "monospace",
            fontSize: "14px",
            borderBottomLeftRadius: "0",
            borderBottomRightRadius: "0",
          }}
        />

        <div
          style={{
            display: "flex",
            backgroundColor: "var(--white)",
            width: "100%",
            borderBottomLeftRadius: "var(--border-radius)",
            borderBottomRightRadius: "var(--border-radius)",
          }}
        >
          <button
            type="button"
            onClick={() => toggleWrap("u")}
            title="Underline selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatUnderlined style={{ fontSize: "1.5rem" }} />
          </button>

          <button
            type="button"
            onClick={() => toggleWrap("b")}
            title="Bold selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatBold style={{ fontSize: "1.5rem" }} />
          </button>

          <button
            type="button"
            onClick={() => toggleWrap("i")}
            title="Italic selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatItalic style={{ fontSize: "1.5rem" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
