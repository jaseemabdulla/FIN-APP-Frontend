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

export default api;

