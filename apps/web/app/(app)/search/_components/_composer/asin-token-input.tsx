'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── ASIN token input utilities ───────────────────────────────────────────────

const AMAZON_SEARCH_ASIN_GLOBAL = /\b(B[0-9A-Z]{9})\b/g
const SINGLE_ASIN_GLOBAL = /\b([A-Z0-9]{10})\b/g

type AsinTokenInputMode = 'amazon-search' | 'single-asin'

function getAsinPattern(mode: AsinTokenInputMode): RegExp {
    return mode === 'single-asin' ? SINGLE_ASIN_GLOBAL : AMAZON_SEARCH_ASIN_GLOBAL
}

/** Build safe HTML: collapse Amazon product URLs to ASIN tokens, then wrap inline ASINs. */
function buildHtml(text: string, mode: AsinTokenInputMode): string {
    // Collapse Amazon product URLs to just the ASIN before HTML escaping.
    // Handles /dp/ASIN and /gp/product/ASIN URL shapes.
    const withUrlsCollapsed = text.replace(
        /https?:\/\/[^\s]*?amazon\.[a-z]{2,3}(?:\.[a-z]{2})?\/(?:[^\s/]*\/)*(?:dp|gp\/product)\/([A-Z0-9]{10})[^\s]*/gi,
        (_, asin: string) => asin.toUpperCase(),
    )

    const pattern = getAsinPattern(mode)

    return withUrlsCollapsed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(
            pattern,
            (_, a) =>
                `<span class="asin-token" contenteditable="false" data-asin="${a}">${a}</span>`,
        )
}

/** Extract plain text from the contenteditable DOM, treating ASIN spans atomically. */
function extractText(el: HTMLElement): string {
    let out = ''
    for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            out += node.textContent ?? ''
        } else {
            const ch = node as HTMLElement
            if (ch.dataset?.asin) out += ch.dataset.asin
            else if (ch.tagName === 'BR') out += '\n'
            else out += extractText(ch)
        }
    }
    return out
}

/** Count text offset to cursor position, counting ASIN spans by their text length. */
function getCaretOffset(el: HTMLElement): number {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return 0
    const clone = sel.getRangeAt(0).cloneRange()
    clone.selectNodeContents(el)
    clone.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
    return clone.toString().length
}

/** Restore cursor to a character offset, skipping over contenteditable=false spans atomically. */
function setCaretOffset(el: HTMLElement, offset: number): void {
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    let remaining = offset
    function walk(node: ChildNode): boolean {
        const htmlEl = node as HTMLElement
        if (node.nodeType === Node.TEXT_NODE) {
            const len = (node as Text).length
            if (remaining <= len) { range.setStart(node, remaining); range.collapse(true); return true }
            remaining -= len
            return false
        }
        if (htmlEl.contentEditable === 'false') {
            const len = htmlEl.textContent?.length ?? 0
            if (remaining <= len) { range.setStartAfter(node); range.collapse(true); return true }
            remaining -= len
            return false
        }
        for (const child of Array.from(node.childNodes)) {
            if (walk(child)) return true
        }
        return false
    }
    if (!walk(el)) { range.selectNodeContents(el); range.collapse(false) }
    sel.removeAllRanges()
    sel.addRange(range)
}

// ─── AsinTokenInput ───────────────────────────────────────────────────────────

export function AsinTokenInput({
    value,
    onValueChange,
    onSubmit,
    placeholder,
    tokenMode = 'amazon-search',
    disabled,
    autoFocus = false,
    editorRef: externalRef,
}: {
    value: string
    onValueChange: (v: string) => void
    onSubmit: () => void
    placeholder: string
    tokenMode?: AsinTokenInputMode
    disabled?: boolean
    autoFocus?: boolean
    editorRef?: React.RefObject<HTMLDivElement | null>
}) {
    const localRef = useRef<HTMLDivElement>(null)
    const divRef = externalRef ?? localRef
    const composingRef = useRef(false)
    const isEmpty = value.trim().length === 0

    // Sync DOM when value is set externally (clear, etc.)
    useEffect(() => {
        const div = divRef.current
        if (!div) return
        const domText = extractText(div)
        if (domText !== value) {
            div.innerHTML = value ? buildHtml(value, tokenMode) : ''
            if (document.activeElement !== div) setCaretOffset(div, value.length)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenMode, value])

    function handleInput() {
        const div = divRef.current
        if (!div || composingRef.current) return
        const rawText = extractText(div)
        const textAsinCount = [...rawText.matchAll(getAsinPattern(tokenMode))].length
        const spanAsinCount = div.querySelectorAll('[data-asin]').length
        if (textAsinCount !== spanAsinCount) {
            const offset = getCaretOffset(div)
            div.innerHTML = buildHtml(rawText, tokenMode)
            setCaretOffset(div, offset)
        }
        onValueChange(rawText)
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        if (!text) return
        const sel = window.getSelection()
        if (!sel?.rangeCount) return
        sel.deleteFromDocument()
        const textNode = document.createTextNode(text)
        const range = sel.getRangeAt(0)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        handleInput()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey && !disabled) { e.preventDefault(); onSubmit(); return }

        // Atomic token deletion — Backspace/Delete must remove the whole span when
        // the caret is immediately after (Backspace) or before (Delete) a token.
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const div = divRef.current
            if (!div) return
            const sel = window.getSelection()
            if (!sel?.rangeCount) return
            const range = sel.getRangeAt(0)
            if (!range.collapsed) return  // let browser handle selection deletion

            const isBackspace = e.key === 'Backspace'
            let tokenToRemove: HTMLElement | null = null

            if (isBackspace) {
                // Check if the node immediately before the cursor is a token span
                const { startContainer, startOffset } = range
                if (startOffset === 0) {
                    // cursor at start of a text node — check previous sibling
                    const prev = startContainer.previousSibling
                    if (prev instanceof HTMLElement && prev.dataset?.asin) tokenToRemove = prev
                } else if (startContainer.nodeType === Node.TEXT_NODE && startOffset === 0) {
                    const prev = startContainer.previousSibling
                    if (prev instanceof HTMLElement && prev.dataset?.asin) tokenToRemove = prev
                } else {
                    // cursor inside the parent div — check if prev sibling of container is token
                    const containerEl = startContainer.parentElement
                    if (containerEl === div) {
                        const prev = startContainer.previousSibling
                        if (prev instanceof HTMLElement && prev.dataset?.asin) tokenToRemove = prev
                    }
                }
            } else {
                // Delete — check next sibling
                const { endContainer, endOffset } = range
                const nodeLen = endContainer.nodeType === Node.TEXT_NODE
                    ? (endContainer as Text).length
                    : 0
                if (endOffset === nodeLen) {
                    const next = endContainer.nextSibling
                    if (next instanceof HTMLElement && next.dataset?.asin) tokenToRemove = next
                } else if (endContainer === div) {
                    const childNodes = Array.from(div.childNodes)
                    const idx = childNodes.indexOf(endContainer as ChildNode)
                    const next = idx >= 0 ? childNodes[idx + 1] : null
                    if (next instanceof HTMLElement && (next as HTMLElement).dataset?.asin) tokenToRemove = next as HTMLElement
                }
            }

            if (tokenToRemove) {
                e.preventDefault()
                tokenToRemove.remove()
                onValueChange(extractText(div))
            }
        }
    }

    return (
        <div className="relative">
            {isEmpty && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-0 select-none text-base text-muted-foreground"
                >
                    {placeholder}
                </span>
            )}
            <div
                ref={divRef}
                contentEditable={disabled ? 'false' : 'true'}
                suppressContentEditableWarning
                autoFocus={autoFocus}
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                onInput={handleInput}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={() => { composingRef.current = false; handleInput() }}
                className={cn(
                    'min-h-10 w-full bg-transparent text-base text-foreground focus:outline-none',
                    disabled && 'cursor-not-allowed opacity-50',
                )}
            />
        </div>
    )
}
