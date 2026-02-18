import axios from 'axios';

export const API_BASE_URL = "http://localhost:8585";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include token
apiClient.interceptors.request.use(
    (config) => {
        const url = config.url || '';
        const currentPath = window.location.pathname || '';
        let token = null;
        
        // Determine token based on route
        if (url.includes('/supportstaff/') || url.includes('/report/staffMasterReport')) {
            // Support staff routes: use ONLY ssToken
            token = localStorage.getItem('ssToken');
        } else if (url.includes('/admin/') || url.includes('/report/adminMasterReport')) {
            // Admin routes: use ONLY adminToken
            token = localStorage.getItem('adminToken');
        } else if (url.includes('/complaints/')) {
            // For /complaints/ routes, determine token based on current page context
            // Check if current path is admin or support staff dashboard
            if (currentPath.includes('/admin/')) {
                token = localStorage.getItem('adminToken');
            } else if (currentPath.includes('/support/')) {
                token = localStorage.getItem('ssToken');
            } else {
                // Fallback: check which token exists (prefer support staff if both exist)
                const ssToken = localStorage.getItem('ssToken');
                const adminToken = localStorage.getItem('adminToken');
                token = ssToken || adminToken;
            }
        } else {
            // For other routes, check if URL contains 'support' keyword
            // Otherwise default to adminToken
            if (url.includes('support') || url.includes('Support')) {
                token = localStorage.getItem('ssToken');
            } else {
                token = localStorage.getItem('adminToken');
            }
        }
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// Flag to prevent multiple simultaneous logout redirects
let isLoggingOut = false;

// Add response interceptor for 401 handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Prevent multiple simultaneous logout redirects
            if (isLoggingOut) {
                return Promise.reject(error);
            }
            
            // Check if we're already on a login page (prevent redirect loops)
            const currentPath = window.location.pathname || '';
            if (currentPath.includes('/login')) {
                return Promise.reject(error);
            }
            
            // Check which token was being used to determine redirect
            const ssToken = localStorage.getItem('ssToken');
            const adminToken = localStorage.getItem('adminToken');
            const requestUrl = error.config?.url || '';
            
            // Only logout if tokens actually exist (to avoid unnecessary redirects)
            if (!ssToken && !adminToken) {
                return Promise.reject(error);
            }
            
            // Set flag to prevent multiple redirects
            isLoggingOut = true;
            
            // Clear all tokens and user data from localStorage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('staffToken');
            localStorage.removeItem('ssToken');
            localStorage.removeItem('ssEmployee');
            localStorage.removeItem('ssRole');
            
            // Redirect based on route or token that was present
            if (requestUrl.includes('/supportstaff/') || requestUrl.includes('/report/staffMasterReport') || (ssToken && !adminToken)) {
                window.location.href = '/support/login';
            } else {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
