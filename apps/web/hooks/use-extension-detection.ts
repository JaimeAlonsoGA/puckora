'use client'

import { useEffect, useState } from 'react'

const EXTENSION_DETECTION = {
    FAST_INTERVAL_MS: 150,
    FAST_ATTEMPT_LIMIT: 14,
    SLOW_INTERVAL_MS: 3000,
} as const

type ExtensionReadyPayload = {
    type?: string
    extId?: string
}

export interface UseExtensionDetectionResult {
    extId: string | null
    isInstalled: boolean
    isChecking: boolean
}

export function useExtensionDetection(): UseExtensionDetectionResult {
    const [extId, setExtId] = useState<string | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        let slowIntervalId: ReturnType<typeof setInterval> | null = null
        let detected = false

        function requestExtensionReady() {
            window.postMessage({ type: 'PUCKORA_EXT_REQUEST' }, '*')
        }

        function handleDetected(nextExtId?: string) {
            if (detected) return
            detected = true
            setExtId(nextExtId ?? null)
            setIsInstalled(true)
            setIsChecking(false)
            clearInterval(fastIntervalId)

            if (slowIntervalId) {
                clearInterval(slowIntervalId)
                slowIntervalId = null
            }
        }

        function onMessage(event: MessageEvent<ExtensionReadyPayload>) {
            if (event.source !== window) return
            if (event.data?.type !== 'PUCKORA_EXT_READY') return
            handleDetected(event.data.extId)
        }

        window.addEventListener('message', onMessage)

        let attempts = 0
        const fastIntervalId = setInterval(() => {
            attempts += 1
            requestExtensionReady()

            if (attempts >= EXTENSION_DETECTION.FAST_ATTEMPT_LIMIT) {
                clearInterval(fastIntervalId)
                setIsChecking(false)
                slowIntervalId = setInterval(requestExtensionReady, EXTENSION_DETECTION.SLOW_INTERVAL_MS)
            }
        }, EXTENSION_DETECTION.FAST_INTERVAL_MS)

        requestExtensionReady()

        return () => {
            clearInterval(fastIntervalId)
            if (slowIntervalId) clearInterval(slowIntervalId)
            window.removeEventListener('message', onMessage)
        }
    }, [])

    return { extId, isInstalled, isChecking }
}