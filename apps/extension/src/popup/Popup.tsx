import React, { useEffect, useState } from 'react'
import { silkflowApi } from '../lib/api'

export default function Popup() {
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (res) => {
            setToken(res?.token ?? null)
            setLoading(false)
        })
    }, [])

    const handleLogout = () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_TOKEN' }, () => {
            setToken(null)
        })
    }

    if (loading) {
        return (
            <div className="popup-container">
                <p className="popup-loading">Loading…</p>
            </div>
        )
    }

    return (
        <div className="popup-container">
            <header className="popup-header">
                <span className="popup-logo">Silkflow</span>
                {token && (
                    <button className="popup-logout" onClick={handleLogout}>
                        Sign out
                    </button>
                )}
            </header>

            {!token ? (
                <div className="popup-body">
                    <p className="popup-cta">Sign in to unlock Silkflow insights on every Amazon page.</p>
                    <a
                        href="https://app.silkflow.io/auth/login?ext=1"
                        target="_blank"
                        rel="noreferrer"
                        className="popup-btn"
                    >
                        Sign in
                    </a>
                </div>
            ) : (
                <div className="popup-body">
                    <p className="popup-status">✅ Connected to Silkflow</p>
                    <a
                        href="https://app.silkflow.io"
                        target="_blank"
                        rel="noreferrer"
                        className="popup-btn"
                    >
                        Open Dashboard
                    </a>
                </div>
            )}
        </div>
    )
}
