import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Get backend base URL by removing '/api' and any trailing slashes from the API URL
export const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add access token to headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh on 401 Unauthorized
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            // Bypass auth endpoints to avoid infinite loops
            if (
                originalRequest.url.includes('auth/login/') ||
                originalRequest.url.includes('auth/register/') ||
                originalRequest.url.includes('auth/refresh/') ||
                originalRequest.url.includes('auth/exists/')
            ) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                isRefreshing = false;
                window.dispatchEvent(new Event('auth_session_expired'));
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
                const { access, refresh } = res.data;
                localStorage.setItem('access_token', access);
                if (refresh) {
                    localStorage.setItem('refresh_token', refresh);
                }
                api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                originalRequest.headers['Authorization'] = `Bearer ${access}`;
                processQueue(null, access);
                isRefreshing = false;
                return api(originalRequest);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                isRefreshing = false;
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.dispatchEvent(new Event('auth_session_expired'));
                return Promise.reject(refreshErr);
            }
        }
        return Promise.reject(error);
    }
);

console.log("Environment:", import.meta.env);
console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("API_BASE_URL:", API_BASE_URL);

// Authentication requests
export const loginUser = (data) => api.post('auth/login/', data);
export const registerUser = (data) => api.post('auth/register/', data);
export const logoutUser = (data) => api.post('auth/logout/', data);
export const getCurrentUser = () => api.get('auth/me/');
export const checkUsersExist = () => api.get('auth/exists/');

export const getTransactions = (date) => api.get(`transactions/?date=${date}`);
export const createTransaction = (data) => api.post('transactions/', data);
export const updateTransaction = (id, data) => api.put(`transactions/${id}/`, data);
export const deleteTransaction = (id) => api.delete(`transactions/${id}/`);
export const getDailyReport = (date) => api.get(`reports/daily/?date=${date}`);
export const getMonthlyReport = (month, year) => api.get(`reports/monthly/?month=${month}&year=${year}`);
export const exportReport = (month, year) => api.get(`reports/export/?month=${month}&year=${year}`, { responseType: 'blob' });
export const exportPDFReport = (params) => api.get('reports/export-pdf/', { params, responseType: 'blob' });
export const getDebts = () => api.get('debts/');
export const getDebtPeople = () => api.get('debts/people/');
export const createDebt = (data) => api.post('debts/', data);
export const updateDebt = (id, data) => api.put(`debts/${id}/`, data);
export const deleteDebt = (id) => api.delete(`debts/${id}/`);
export const settlePersonDebts = (data) => api.post('debts/settle-person/', data);
export const getLedgers = () => api.get('ledgers/');
export const createLedger = (data) => api.post('ledgers/', data);
export const updateLedger = (id, data) => api.put(`ledgers/${id}/`, data);
export const deleteLedger = (id) => api.delete(`ledgers/${id}/`);
export const checkAppInit = () => api.get('init/');
export const initializeApp = (data) => api.post('init/', data);

export const getCategories = () => api.get('categories/');
export const createCategory = (data) => api.post('categories/', data);
export const updateCategory = (id, data) => api.put(`categories/${id}/`, data);
export const deleteCategory = (id) => api.delete(`categories/${id}/`);

export const getEvents = () => api.get('events/');
export const createEvent = (data) => api.post('events/', data);
export const updateEvent = (id, data) => api.put(`events/${id}/`, data);
export const deleteEvent = (id) => api.delete(`events/${id}/`);

export const getFunds = () => api.get('funds/');
export const getFundDetails = (id) => api.get(`funds/${id}/`);
export const createFund = (data) => api.post('funds/', data);
export const updateFund = (id, data) => api.put(`funds/${id}/`, data);
export const deleteFund = (id) => api.delete(`funds/${id}/`);
export const settleFund = (id, data) => api.post(`funds/${id}/settle/`, data);
export const reopenFund = (id) => api.post(`funds/${id}/reopen/`);
export const getFundReports = () => api.get('funds/reports/');

export const createFundAddition = (data) => api.post('fund-additions/', data);
export const deleteFundAddition = (id) => api.delete(`fund-additions/${id}/`);

export const createFundExpense = (data) => api.post('fund-expenses/', data, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});
export const deleteFundExpense = (id) => api.delete(`fund-expenses/${id}/`);

export const globalSearch = (query) => api.get(`search/?q=${query}`);

export default api;

