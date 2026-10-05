const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem(
    'factory_session_token'
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;

    try {
      const data = await res.json();

      if (data.error) {
        errorMsg = data.error;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new ApiError(
      errorMsg,
      res.status
    );
  }

  return res.json();
}

export const api = {
  // Auth
  login: (
    credentials: {
      username: string;
      password: string;
    }
  ) =>
    request<{
      user: any;
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  getMe: () =>
    request<{
      user: any;
      token: string;
    }>('/auth/me'),

  changePassword: (
    data: {
      currentPassword: string;
      newPassword: string;
    }
  ) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboard: (date?: string) =>
    request<any>(
      `/dashboard${date ? `?date=${date}` : ''}`
    ),

  // Materials
  getMaterials: () =>
    request<any[]>('/materials'),

  getMaterial: (id: number) =>
    request<any>(`/materials/${id}`),

  createMaterial: (data: any) =>
    request<any>('/materials', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateMaterial: (
    id: number,
    data: any
  ) =>
    request<any>(`/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteMaterial: (id: number) =>
    request<any>(
      `/materials/${id}`,
      {
        method: 'DELETE'
      }
    ),

  // Products
  getProducts: () =>
    request<any[]>('/products'),

  getProduct: (id: number) =>
    request<any>(`/products/${id}`),

  createProduct: (data: any) =>
    request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateProduct: (
    id: number,
    data: any
  ) =>
    request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // NEW: Activate / Deactivate product
  toggleProductStatus: (
    id: number,
    is_active: boolean
  ) =>
    request<any>(
      `/products/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          is_active
        })
      }
    ),

  deleteProduct: (id: number) =>
    request<any>(
      `/products/${id}`,
      {
        method: 'DELETE'
      }
    ),

  // Suppliers
  getSuppliers: () =>
    request<any[]>('/suppliers'),

  getSupplierHistory: (id: number) =>
    request<any>(
      `/suppliers/${id}/history`
    ),

  createSupplier: (data: any) =>
    request<any>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateSupplier: (
    id: number,
    data: any
  ) =>
    request<any>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteSupplier: (id: number) =>
    request<any>(
      `/suppliers/${id}`,
      {
        method: 'DELETE'
      }
    ),

  // Customers
  getCustomers: () =>
    request<any[]>('/customers'),

  getCustomerHistory: (id: number) =>
    request<any>(
      `/customers/${id}/history`
    ),

  createCustomer: (data: any) =>
    request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateCustomer: (
    id: number,
    data: any
  ) =>
    request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteCustomer: (id: number) =>
    request<any>(
      `/customers/${id}`,
      {
        method: 'DELETE'
      }
    ),

  // Purchases
  getPurchases: (
    params?: {
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.supplierId) {
      q.set(
        'supplierId',
        String(params.supplierId)
      );
    }

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    return request<any[]>(
      `/purchases?${q.toString()}`
    );
  },

  createPurchase: (data: any) =>
    request<any>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  cancelPurchase: (id: number) =>
    request<any>(
      `/purchases/${id}/cancel`,
      {
        method: 'POST'
      }
    ),

  // Productions
  getProductions: (
    params?: {
      productId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.productId) {
      q.set(
        'productId',
        String(params.productId)
      );
    }

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    return request<any[]>(
      `/productions?${q.toString()}`
    );
  },

  previewBom: (
    productId: number,
    quantity: number
  ) =>
    request<any>(
      `/productions/preview-bom/${productId}?quantity=${quantity}`
    ),

  createProduction: (data: any) =>
    request<any>('/productions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Sales
  getSales: (
    params?: {
      customerId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.customerId) {
      q.set(
        'customerId',
        String(params.customerId)
      );
    }

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    return request<any[]>(
      `/sales?${q.toString()}`
    );
  },

  getSaleInvoice: (id: number) =>
    request<any>(
      `/sales/${id}`
    ),

  createSale: (data: any) =>
    request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  cancelSale: (id: number) =>
    request<any>(
      `/sales/${id}/cancel`,
      {
        method: 'POST'
      }
    ),

  // Expenses
  getExpenses: (
    params?: {
      startDate?: string;
      endDate?: string;
      method?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    if (params?.method) {
      q.set(
        'method',
        params.method
      );
    }

    return request<any[]>(
      `/expenses?${q.toString()}`
    );
  },

  createExpense: (data: any) =>
    request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deleteExpense: (id: number) =>
    request<any>(
      `/expenses/${id}`,
      {
        method: 'DELETE'
      }
    ),

  // Payments
  getCustomerPayments: (
    params?: {
      customerId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.customerId) {
      q.set(
        'customerId',
        String(params.customerId)
      );
    }

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    return request<any[]>(
      `/payments/customer?${q.toString()}`
    );
  },

  createCustomerPayment: (data: any) =>
    request<any>(
      '/payments/customer',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    ),

  getSupplierPayments: (
    params?: {
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const q = new URLSearchParams();

    if (params?.supplierId) {
      q.set(
        'supplierId',
        String(params.supplierId)
      );
    }

    if (params?.startDate) {
      q.set(
        'startDate',
        params.startDate
      );
    }

    if (params?.endDate) {
      q.set(
        'endDate',
        params.endDate
      );
    }

    return request<any[]>(
      `/payments/supplier?${q.toString()}`
    );
  },

  createSupplierPayment: (data: any) =>
    request<any>(
      '/payments/supplier',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    ),

  // Cash & Bank
  getCashBankSummary: () =>
    request<any>(
      '/cash-bank/summary'
    ),

  // Reports
  getDailyReport: (date: string) =>
    request<any>(
      `/reports/daily?date=${date}`
    ),

  getMonthlyReport: (month: string) =>
    request<any>(
      `/reports/monthly?month=${month}`
    ),

  getRawMaterialReport: (
    startDate?: string,
    endDate?: string
  ) => {
    const q = new URLSearchParams();

    if (startDate) {
      q.set(
        'startDate',
        startDate
      );
    }

    if (endDate) {
      q.set(
        'endDate',
        endDate
      );
    }

    return request<any[]>(
      `/reports/raw-materials?${q.toString()}`
    );
  },

  getFinishedProductReport: (
    startDate?: string,
    endDate?: string
  ) => {
    const q = new URLSearchParams();

    if (startDate) {
      q.set(
        'startDate',
        startDate
      );
    }

    if (endDate) {
      q.set(
        'endDate',
        endDate
      );
    }

    return request<any[]>(
      `/reports/finished-products?${q.toString()}`
    );
  },

  getCustomerOutstandingReport: () =>
    request<any[]>(
      '/reports/customer-outstanding'
    ),

  getSupplierOutstandingReport: () =>
    request<any[]>(
      '/reports/supplier-outstanding'
    ),

  // Settings
  getSettings: () =>
    request<any>('/settings'),

  updateSettings: (data: any) =>
    request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  seedDemo: () =>
    request<any>(
      '/settings/seed-demo',
      {
        method: 'POST'
      }
    ),
};