import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const auth = JSON.parse(localStorage.getItem('inventory-auth') || '{}');
      const token = auth?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('inventory-auth');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (d: object) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (d: object) => api.post('/auth/change-password', d),

  // ✅ ADD THIS
  updateProfile: (d: object) => api.put('/auth/profile', d),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getRoles: () => api.get('/users/roles'),
  create: (d: object) => api.post('/users', d),
  update: (id: string, d: object) => api.put(`/users/${id}`, d),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const rolePermissionsAPI = {
  getPermissions: () => api.get('/role-permissions/permissions'),
  getRoles: () => api.get('/role-permissions/roles'),
  getRole: (id: string) => api.get(`/role-permissions/roles/${id}`),
  getRoleById: (id: string) => api.get(`/role-permissions/roles/${id}`),
  updateRole: (id: string, d: object) => api.put(`/role-permissions/roles/${id}`, d),
  updateRolePermissions: (id: string, d: object) => api.put(`/role-permissions/roles/${id}`, d),
  createRole: (d: object) => api.post('/role-permissions/roles', d),
  getMyPermissions: () => api.get('/role-permissions/my-permissions'),
};

export const locationAPI = {
  getCountries: () => api.get('/location/countries'),
  createCountry: (d: object) => api.post('/location/countries', d),
  updateCountry: (id: string, d: object) => api.put(`/location/countries/${id}`, d),
  deleteCountry: (id: string) => api.delete(`/location/countries/${id}`),
  getStates: (country_id?: string) => api.get('/location/states', { params: { country_id } }),
  createState: (d: object) => api.post('/location/states', d),
  updateState: (id: string, d: object) => api.put(`/location/states/${id}`, d),
  deleteState: (id: string) => api.delete(`/location/states/${id}`),
  getCities: (state_id?: string) => api.get('/location/cities', { params: { state_id } }),
  createCity: (d: object) => api.post('/location/cities', d),
  updateCity: (id: string, d: object) => api.put(`/location/cities/${id}`, d),
  deleteCity: (id: string) => api.delete(`/location/cities/${id}`),
};

export const suppliersAPI = {
  getAll: (p?: object) => api.get('/suppliers', { params: p }),
  getById: (id: string) => api.get(`/suppliers/${id}`),
  create: (d: object) => api.post('/suppliers', d),
  update: (id: string, d: object) => api.put(`/suppliers/${id}`, d),
};

export const commercialAPI = {
  getCategories: () => api.get('/commercial/categories'),
  createCategory: (d: object) => api.post('/commercial/categories', d),
  updateCategory: (id: string, d: object) => api.put(`/commercial/categories/${id}`, d),
  deleteCategory: (id: string) => api.delete(`/commercial/categories/${id}`),
  getUOM: () => api.get('/commercial/uom'),
  createUOM: (d: object) => api.post('/commercial/uom', d),
  updateUOM: (id: string, d: object) => api.put(`/commercial/uom/${id}`, d),
  getAttributes: () => api.get('/commercial/attributes'),
  createAttribute: (d: object) => api.post('/commercial/attributes', d),
  addAttributeValue: (id: string, d: object) => api.post(`/commercial/attributes/${id}/values`, d),
  deleteAttributeValue: (id: string, vid: string) => api.delete(`/commercial/attributes/${id}/values/${vid}`),
  getProducts: (p?: object) => api.get('/commercial/products', { params: p }),
  getProduct: (id: string) => api.get(`/commercial/products/${id}`),
  createProduct: (d: object) => api.post('/commercial/products', d),
  updateProduct: (id: string, d: object) => api.put(`/commercial/products/${id}`, d),
  deleteProduct: (id: string) => api.delete(`/commercial/products/${id}`),
  getVariants: (pid: string) => api.get(`/commercial/products/${pid}/variants`),
  createVariant: (pid: string, d: object) => api.post(`/commercial/products/${pid}/variants`, d),
};

export const prAPI = {
  getAll: (p?: object) => api.get('/purchase-requisitions', { params: p }),
  getById: (id: string) => api.get(`/purchase-requisitions/${id}`),
  create: (d: object) => api.post('/purchase-requisitions', d),
  submit: (id: string) => api.patch(`/purchase-requisitions/${id}/submit`),
  approve: (id: string) => api.patch(`/purchase-requisitions/${id}/approve`),
  reject: (id: string, d: object) => api.patch(`/purchase-requisitions/${id}/reject`, d),
};

export const poAPI = {
  getAll: (p?: object) => api.get('/purchase-orders', { params: p }),
  getById: (id: string) => api.get(`/purchase-orders/${id}`),
  approve: (id: string) => api.patch(`/purchase-orders/${id}/approve`),
  operationsApprove: (id: string, d: object) => api.patch(`/purchase-orders/${id}/operations-approve`, d),
  cancel: (id: string) => api.patch(`/purchase-orders/${id}/cancel`),
};

export const inboundAPI = {
  getAll: (p?: object) => api.get('/inbound', { params: p }),
  getById: (id: string) => api.get(`/inbound/${id}`),
  addItem: (id: string, d: object) => api.post(`/inbound/${id}/items`, d),
  complete: (id: string) => api.patch(`/inbound/${id}/complete`),
};

export const stackAPI = {
  getAll: (p?: object) => api.get('/product-stack', { params: p }),
  getPending: () => api.get('/product-stack/pending'),
  getInboundPending: () => api.get('/product-stack/inbound-pending'),
  getBins: (storeId: string) => api.get(`/product-stack/bins/${storeId}`),
  create: (d: object) => api.post('/product-stack', d),
};

export const stockAPI = {
  getOverview: (p?: object) => api.get('/stock-overview', { params: p }),
  getProductBins: (pid: string) => api.get(`/stock-overview/product/${pid}/bins`),
  getBinDetail: (binId: string) => api.get(`/stock-overview/bin/${binId}`),
  getWarehouseMap: (storeId: string) => api.get(`/stock-overview/warehouse-map/${storeId}`),
  getMovements: (p?: object) => api.get('/stock-overview/movements', { params: p }),
};

export const outboundAPI = {
  getAll: (p?: object) => api.get('/outbound', { params: p }),
  getById: (id: string) => api.get(`/outbound/${id}`),
  getStats: () => api.get('/outbound/stats'),
  getCustomers: (p?: object) => api.get('/outbound/customers', { params: p }),
  create: (d: object) => api.post('/outbound', d),
  approve: (id: string) => api.patch(`/outbound/${id}/approve`),
  sendToPackaging: (id: string) => api.patch(`/outbound/${id}/send-to-packaging`),
  cancel: (id: string, d: object) => api.patch(`/outbound/${id}/cancel`, d),
};

export const packagingAPI = {
  getPendingOrders: () => api.get('/packaging/orders-pending'),
  getOrders: () => api.get('/packaging/orders-pending'),
  getPackages: (p?: object) => api.get('/packaging', { params: p }),
  getAll: (p?: object) => api.get('/packaging', { params: p }),
  getById: (id: string) => api.get(`/packaging/${id}`),
  createPackage: (d: object) => api.post('/packaging', d),
  create: (d: object) => api.post('/packaging', d),
  completePackage: (id: string) => api.patch(`/packaging/${id}/complete`),
  complete: (id: string) => api.patch(`/packaging/${id}/complete`),
  getMaterials: () => api.get('/packaging/materials'),
  getVehicles: () => api.get('/packaging/vehicles/list'),
  createMasterPackage: (d: object) => api.post('/packaging/master-package', d),
};

export const damageAPI = {
  getAll: (p?: object) => api.get('/damage', { params: p }),
  create: (d: object) => api.post('/damage', d),
  approve: (id: string) => api.patch(`/damage/${id}/approve`),
  reject: (id: string) => api.patch(`/damage/${id}/reject`),
};

export const warehouseAPI = {
  getStores: () => api.get('/warehouse/stores'),
  createStore: (d: object) => api.post('/warehouse/stores', d),
  updateStore: (id: string, d: object) => api.put(`/warehouse/stores/${id}`, d),
  getFloors: (store_id?: string) => api.get('/warehouse/floors', { params: { store_id } }),
  createFloor: (d: object) => api.post('/warehouse/floors', d),
  getRooms: (floor_id?: string) => api.get('/warehouse/rooms', { params: { floor_id } }),
  createRoom: (d: object) => api.post('/warehouse/rooms', d),
  getRacks: (room_id?: string) => api.get('/warehouse/racks', { params: { room_id } }),
  createRack: (d: object) => api.post('/warehouse/racks', d),
  getRows: (rack_id?: string) => api.get('/warehouse/rows', { params: { rack_id } }),
  createRow: (d: object) => api.post('/warehouse/rows', d),
  getBins: (p?: object) => api.get('/warehouse/bins', { params: p }),
  createBin: (d: object) => api.post('/warehouse/bins', d),
  updateBin: (id: string, d: object) => api.put(`/warehouse/bins/${id}`, d),
  getTree: (storeId: string) => api.get(`/warehouse/tree/${storeId}`),
};

export const dashboardAPI = {
  getAnalytics: (days?: number) => api.get(`/dashboard?days=${days || 30}`),
};

export default api;
