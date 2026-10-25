
import './runtime-config.js';

/**
 * Studn't API Client
 *
 * Handles communication between the frontend and backend.
 * MongoDB credentials must never be stored in frontend code.
 *
 * Backend: http://localhost:5000
 * Frontend: http://localhost:5500
 */

const API_BASE_URL = String(window.STUDNT_CONFIG?.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'studnt_token';

// ==============================
// JWT Token Management
// ==============================

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

// ==============================
// Common API Request Function
// ==============================

export async function apiRequest(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    // Set JSON content type when sending a JSON body
    if (
        options.body !== undefined &&
        !(options.body instanceof FormData)
    ) {
        headers['Content-Type'] = 'application/json';
    }

    // Attach JWT token if available
    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,

            body:
                options.body &&
                typeof options.body !== 'string' &&
                !(options.body instanceof FormData)
                    ? JSON.stringify(options.body)
                    : options.body
        });
    } catch (_error) {
        throw new Error(
            'Cannot reach the backend. Check the API URL, backend status, and CORS configuration.'
        );
    }

    // Parse the response
    const data = await response.json().catch(() => ({}));

    // Handle API errors
    if (!response.ok) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

// ==============================
// API Endpoints
// ==============================

export const api = {

    // Authentication APIs
    register: (user) =>
        apiRequest('/auth/register', {
            method: 'POST',
            body: user
        }),

    login: (identifier, password) =>
        apiRequest('/auth/login', {
            method: 'POST',
            body: { identifier, password }
        }),

    me: () =>
        apiRequest('/auth/me'),

    // Notifications (stored in MongoDB)
    getNotifications: () => apiRequest('/notifications'),
    createNotification: (notification) => apiRequest('/notifications', { method: 'POST', body: notification }),
    markNotificationRead: (id) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: {} }),
    markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH', body: {} }),

    // Doubt APIs
    getDoubts: (params = '') =>
        apiRequest(
            `/doubts${params ? `?${params}` : ''}`
        ),

    getDoubt: (id) =>
        apiRequest(`/doubts/${encodeURIComponent(id)}`),

    createDoubt: (doubt) =>
        apiRequest('/doubts', {
            method: 'POST',
            body: doubt
        }),

    claimDoubt: (id) =>
        apiRequest(
            `/doubts/${encodeURIComponent(id)}/claim`,
            {
                method: 'POST',
                body: {}
            }
        ),

    resolveDoubt: (id) =>
        apiRequest(
            `/doubts/${encodeURIComponent(id)}/resolve`,
            {
                method: 'POST',
                body: {}
            }
        ),

    // Reply APIs
    addReply: (id, text) =>
        apiRequest(
            `/doubts/${encodeURIComponent(id)}/replies`,
            {
                method: 'POST',
                body: { text }
            }
        ),

    voteReply: (id, vote) =>
        apiRequest(
            `/replies/${encodeURIComponent(id)}/vote`,
            {
                method: 'POST',
                body: { vote }
            }
        ),

    markBestAnswer: (id) =>
        apiRequest(
            `/replies/${encodeURIComponent(id)}/best-answer`,
            {
                method: 'POST',
                body: {}
            }
        ),

    // User Profile API
    updateProfile: (updates) =>
        apiRequest('/users/me', {
            method: 'PATCH',
            body: updates
        }),

    // Leaderboard API
    getLeaderboard: () =>
        apiRequest('/users/leaderboard'),

    // Contribution Events API
    getMyEvents: () =>
        apiRequest('/events/me'),

    // Rating/reputation API
    rateHelper: (doubtId, rating) => apiRequest(`/doubts/${encodeURIComponent(doubtId)}/rating`, { method: 'POST', body: { rating } })
};
