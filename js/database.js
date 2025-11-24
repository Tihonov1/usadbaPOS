const DEFAULT_DATABASE = {
    roles: [
        { id: 1, code: 'waiter', name: 'Официант' },
        { id: 2, code: 'admin', name: 'Администратор' },
        { id: 3, code: 'chef', name: 'Повар' },
        { id: 4, code: 'manager', name: 'Менеджер' }
    ],
    users: [
        {
            id: 1,
            login: 'admin',
            email: 'admin@usadba.local',
            password: 'admin123',
            name: 'Тихонов Илья Денисович',
            role_id: 2,
            avatar: null,
            created_at: '2024-01-10T09:00:00Z'
        },
        {
            id: 2,
            login: 'waiter',
            email: 'waiter@usadba.local',
            password: 'waiter123',
            name: 'Иванов Иван Иванович',
            role_id: 1,
            avatar: null,
            created_at: '2024-01-11T09:00:00Z'
        },
        {
            id: 3,
            login: 'chef',
            email: 'chef@usadba.local',
            password: 'chef123',
            name: 'Сидоров Петр Васильевич',
            role_id: 3,
            avatar: null,
            created_at: '2024-01-12T09:00:00Z'
        },
        {
            id: 4,
            login: 'manager',
            email: 'manager@usadba.local',
            password: 'manager123',
            name: 'Петрова Анна Сергеевна',
            role_id: 4,
            avatar: null,
            created_at: '2024-01-13T09:00:00Z'
        }
    ],
    table_status: [
        { id: 1, name: 'СВОБОДЕН' },
        { id: 2, name: 'ЗАНЯТ' },
        { id: 3, name: 'ЗАБРОНИРОВАН' }
    ],
    tables: [
        { id: 1, number: 1, status_id: 1, capacity: 4, created_at: '2024-01-01T00:00:00' },
        { id: 2, number: 2, status_id: 2, capacity: 2, created_at: '2024-01-01T00:00:00' },
        { id: 3, number: 3, status_id: 1, capacity: 6, created_at: '2024-01-01T00:00:00' },
        { id: 4, number: 4, status_id: 3, capacity: 4, created_at: '2024-01-01T00:00:00' },
        { id: 5, number: 5, status_id: 2, capacity: 2, created_at: '2024-01-01T00:00:00' }
    ],
    dish_categories: [
        { id: 1, name: 'Холодные закуски', description: 'Салаты и холодные закуски' },
        { id: 2, name: 'Горячие закуски', description: 'Горячие закуски и аппетайзеры' },
        { id: 3, name: 'Основные блюда', description: 'Главные блюда' },
        { id: 4, name: 'Десерты', description: 'Сладости и десерты' },
        { id: 5, name: 'Напитки', description: 'Безалкогольные и алкогольные напитки' }
    ],
    dishes: [
        { id: 1, name: 'Цезарь с курицей', category_id: 1, price: 550, available: true, image: 'https://via.placeholder.com/300x200?text=Caesar' },
        { id: 2, name: 'Греческий салат', category_id: 1, price: 450, available: true, image: 'https://via.placeholder.com/300x200?text=Greek+Salad' },
        { id: 3, name: 'Стейк рибай', category_id: 3, price: 1200, available: true, image: 'https://via.placeholder.com/300x200?text=Ribeye' },
        { id: 4, name: 'Паста карбонара', category_id: 3, price: 650, available: true, image: 'https://via.placeholder.com/300x200?text=Carbonara' },
        { id: 5, name: 'Тирамису', category_id: 4, price: 320, available: true, image: 'https://via.placeholder.com/300x200?text=Tiramisu' },
        { id: 6, name: 'Кола 0.5', category_id: 5, price: 180, available: true, image: 'https://via.placeholder.com/300x200?text=Cola' }
    ],
    order_status: [
        { id: 1, name: 'НОВЫЙ' },
        { id: 2, name: 'НА_КУХНЕ' },
        { id: 3, name: 'ГОТОВ' },
        { id: 4, name: 'ОПЛАЧЕН' }
    ],
    orders: [],
    order_items: [],
    bill_status: [
        { id: 1, name: 'НЕ_ОПЛАЧЕН' },
        { id: 2, name: 'ОПЛАЧЕН' }
    ],
    bills: [],
    reports: []
};
function cloneDeep(data) {
    return JSON.parse(JSON.stringify(data));
}
function cloneArray(arr = []) {
    return arr.map(item => (item && typeof item === 'object' ? { ...item } : item));
}
class Database {
    constructor() {
        this.db = null;
        this.jsonPath = 'json/database.json';
        this.storageKey = 'restaurant_db';
    }
    async init() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.db = JSON.parse(saved);
                return;
            }
            try {
                const response = await fetch(`${this.jsonPath}?v=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const jsonData = await response.json();
                this.db = jsonData;
                this.persistToLocalStorage();
            } catch (fetchError) {
                this.db = this.getEmptyDatabase();
                this.persistToLocalStorage();
            }
        } catch (error) {
            this.db = this.getEmptyDatabase();
            this.persistToLocalStorage();
        } finally {
            const structureUpdated = this.ensureBaseData();
            if (structureUpdated) {
                this.persistToLocalStorage();
            }
        }
    }
    getEmptyDatabase() {
        return cloneDeep(DEFAULT_DATABASE);
    }
    ensureBaseData() {
        if (!this.db) {
            this.db = this.getEmptyDatabase();
            return true;
        }
        const defaults = this.getEmptyDatabase();
        let changed = false;
        const ensureTable = (key, restoreDefaultsWhenEmpty = false) => {
            if (!Array.isArray(this.db[key])) {
                this.db[key] = cloneArray(defaults[key]);
                changed = true;
                return;
            }
            if (restoreDefaultsWhenEmpty && this.db[key].length === 0 && defaults[key].length > 0) {
                this.db[key] = cloneArray(defaults[key]);
                changed = true;
            }
        };
        ['roles', 'table_status', 'order_status', 'bill_status', 'dish_categories', 'dishes', 'tables', 'users'].forEach(key => ensureTable(key, true));
        ['orders', 'order_items', 'bills', 'reports'].forEach(key => ensureTable(key, false));
        const adminRoleId = this.getRoleIdByKey('admin') || 2;
        const usersTable = this.db.users || [];
        const hasAdminWithPassword = usersTable.some(user => user.role_id === adminRoleId && user.password);
        if (!hasAdminWithPassword) {
            const defaultAdmin = defaults.users.find(user => user.role_id === adminRoleId);
            if (defaultAdmin) {
                const existingAdmin = usersTable.find(user => (user.login || '').toLowerCase() === (defaultAdmin.login || '').toLowerCase());
                if (existingAdmin) {
                    const preservedId = existingAdmin.id || defaultAdmin.id;
                    Object.assign(existingAdmin, { ...defaultAdmin, id: preservedId });
                } else {
                    const adminClone = { ...defaultAdmin, id: this.getNextId('users') };
                    this.db.users.push(adminClone);
                }
                changed = true;
            }
        }
        return changed;
    }
    persistToLocalStorage() {
        try {
            if (!this.db) return;
            localStorage.setItem(this.storageKey, JSON.stringify(this.db));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('databaseUpdated'));
            }
        } catch (error) {
        }
    }
    getAll(tableName) {
        if (!this.db) {
            return [];
        }
        if (!this.db[tableName]) {
            return [];
        }
        return [...this.db[tableName]];
    }
    findById(tableName, id) {
        const table = this.getAll(tableName);
        return table.find(item => item.id === id) || null;
    }
    find(tableName, predicate) {
        const table = this.getAll(tableName);
        return table.filter(predicate);
    }
    getRoleByKey(roleKey) {
        if (!roleKey) return null;
        const normalized = roleKey.toString().toLowerCase();
        return this.find('roles', role => {
            const code = (role.code || '').toLowerCase();
            const name = (role.name || '').toLowerCase();
            return code === normalized || name === normalized;
        })[0] || null;
    }
    getRoleIdByKey(roleKey) {
        const role = this.getRoleByKey(roleKey);
        return role ? role.id : null;
    }
    getRoleKeyById(roleId) {
        const role = this.findById('roles', roleId);
        if (!role) return '';
        return role.code || role.name || '';
    }
    getUserByEmail(email) {
        if (!email) return null;
        const normalized = email.trim().toLowerCase();
        return this.find('users', user => (user.email || '').toLowerCase() === normalized)[0] || null;
    }
    authenticateUser(identifier, password) {
        if (!identifier) return null;
        const emailCandidate = identifier.includes('@') ? identifier : null;
        const loginCandidate = identifier.includes('@') ? identifier.split('@')[0] : identifier;
        const user = this.getUserByEmail(emailCandidate || '') || this.getUserByLogin(loginCandidate);
        if (!user) {
            return null;
        }
        if (!user.password) {
            return null;
        }
        if (password === undefined || user.password !== password) {
            return null;
        }
        return user;
    }
    async insert(tableName, data) {
        if (!this.db) {
            await this.init();
            if (!this.db) {
                return null;
            }
        }
        if (!this.db[tableName]) {
            this.db[tableName] = [];
        }
        if (!data.id) {
            const maxId = this.db[tableName].length > 0
                ? Math.max(...this.db[tableName].map(item => item.id || 0))
                : 0;
            data.id = maxId + 1;
        }
        if (!data.created_at) {
            data.created_at = new Date().toISOString();
        }
        this.db[tableName].push(data);
        this.persistToLocalStorage(); 
        return data;
    }
    async update(tableName, id, updates) {
        if (!this.db) {
            await this.init();
            if (!this.db) {
                return null;
            }
        }
        const table = this.db[tableName];
        if (!table) {
            return null;
        }
        const index = table.findIndex(item => item.id === id);
        if (index === -1) {
            return null;
        }
        if (tableName === 'orders' && !updates.updated_at) {
            updates.updated_at = new Date().toISOString();
        }
        const oldData = { ...this.db[tableName][index] };
        this.db[tableName][index] = { ...oldData, ...updates };
        this.persistToLocalStorage(); 
        return this.db[tableName][index];
    }
    async delete(tableName, id) {
        if (!this.db) {
            await this.init();
            if (!this.db) {
                return false;
            }
        }
        const table = this.db[tableName];
        if (!table) {
            return false;
        }
        const index = table.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        this.db[tableName].splice(index, 1);
        this.persistToLocalStorage(); 
        return true;
    }
    getNextId(tableName) {
        if (!this.db[tableName] || this.db[tableName].length === 0) {
            return 1;
        }
        return Math.max(...this.db[tableName].map(item => item.id || 0)) + 1;
    }
    async createOrder(tableId, userId, items) {
        if (!items || items.length === 0) {
            return null;
        }
        const order = {
            id: this.getNextId('orders'),
            table_id: parseInt(tableId),
            status_id: 1, 
            user_id: parseInt(userId),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        await this.insert('orders', order);
        for (const item of items) {
            const dish = this.findById('dishes', parseInt(item.dish_id));
            if (dish) {
                const orderItem = {
                    order_id: order.id,
                    dish_id: parseInt(item.dish_id),
                    count: parseInt(item.count),
                    price: dish.price,
                    created_at: new Date().toISOString()
                };
                await this.insert('order_items', orderItem);
            }
        }
        await this.update('tables', parseInt(tableId), { status_id: 2 });
        return order;
    }
    getOrderItems(orderId) {
        return this.find('order_items', item => item.order_id === orderId);
    }
    calculateOrderTotal(orderId) {
        const items = this.getOrderItems(orderId);
        return items.reduce((total, item) => total + (item.price * item.count), 0);
    }
    async createBill(orderId, amount, meta = {}) {
        const bill = {
            id: this.getNextId('bills'),
            order_id: parseInt(orderId),
            amount: parseFloat(amount),
            subtotal: meta.subtotal !== undefined ? parseFloat(meta.subtotal) : parseFloat(amount),
            vat: meta.vat !== undefined ? parseFloat(meta.vat) : 0,
            payment_method: meta.paymentMethod || null,
            status_id: 1, 
            created_at: new Date().toISOString(),
            paid_at: null
        };
        await this.insert('bills', bill);
        return bill;
    }
    async payBill(billId, paymentMethod = 'cash') {
        const bill = this.findById('bills', billId);
        if (!bill) {
            return null;
        }
        await this.update('bills', billId, {
            status_id: 2, 
            paid_at: new Date().toISOString(),
            payment_method: paymentMethod
        });
        await this.update('orders', bill.order_id, {
            status_id: 4 
        });
        const order = this.findById('orders', bill.order_id);
        if (order) {
            await this.update('tables', order.table_id, { status_id: 1 }); 
        }
        return this.findById('bills', billId);
    }
    getDishesByCategory(categoryId) {
        if (categoryId === null || categoryId === undefined) {
            return this.find('dishes', dish => dish.available === true);
        }
        return this.find('dishes', dish => dish.category_id === categoryId && dish.available === true);
    }
    getOrdersByStatus(statusId) {
        return this.find('orders', order => order.status_id === statusId);
    }
    getActiveOrderForTable(tableId) {
        const orders = this.find('orders', order => {
            return order.table_id === tableId && order.status_id !== 4; 
        });
        return orders.length > 0 ? orders[orders.length - 1] : null;
    }
    async addItemsToOrder(orderId, newItems) {
        if (!this.db) {
            return false;
        }
        try {
            const order = this.findById('orders', orderId);
            if (!order) {
                return false;
            }
            for (const item of newItems) {
                const orderItem = {
                    order_id: orderId,
                    dish_id: item.dish_id,
                    count: item.count,
                    price: item.price || 0
                };
                await this.insert('order_items', orderItem);
            }
            await this.update('orders', orderId, {
                updated_at: new Date().toISOString()
            });
            return true;
        } catch (error) {
            return false;
        }
    }
    getUserByLogin(login) {
        if (!login) return null;
        const normalized = login.trim().toLowerCase();
        return this.find('users', user => (user.login || '').toLowerCase() === normalized)[0] || null;
    }
    getRevenueReport(dateFrom, dateTo) {
        const bills = this.getAll('bills');
        const paidBills = bills.filter(bill => {
            if (bill.status_id !== 2) return false; 
            if (!bill.paid_at) return false;
            const paidDate = new Date(bill.paid_at);
            const from = dateFrom ? new Date(dateFrom) : new Date(0);
            const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date();
            return paidDate >= from && paidDate <= to;
        });
        const totalRevenue = paidBills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
        const ordersCount = paidBills.length;
        const averageCheck = ordersCount > 0 ? totalRevenue / ordersCount : 0;
        return {
            totalRevenue: totalRevenue,
            ordersCount: ordersCount,
            averageCheck: averageCheck,
            bills: paidBills
        };
    }
    async createReport(userId, dateFrom, dateTo) {
        const report = this.getRevenueReport(dateFrom, dateTo);
        const reportRecord = {
            id: this.getNextId('reports'),
            revenue: report.totalRevenue,
            user_id: userId,
            report_date: dateFrom || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
        };
        await this.insert('reports', reportRecord);
        return { ...report, reportId: reportRecord.id };
    }
    getUserStatistics(userId) {
        if (!this.db || !userId) {
            return {
                ordersCount: 0,
                totalRevenue: 0,
                averageCheck: 0,
                workHours: 0
            };
        }
        const userOrders = this.find('orders', order => order.user_id === userId);
        const userBills = this.find('bills', bill => {
            const order = this.findById('orders', bill.order_id);
            return order && order.user_id === userId;
        });
        const paidBills = userBills.filter(bill => bill.status_id === 2);
        let totalRevenue = 0;
        let ordersCount = paidBills.length;
        paidBills.forEach(bill => {
            totalRevenue += parseFloat(bill.amount || 0);
        });
        const averageCheck = ordersCount > 0 ? totalRevenue / ordersCount : 0;
        const workHours = this.calculateWorkHours(userId);
        return {
            ordersCount: ordersCount,
            totalRevenue: totalRevenue,
            averageCheck: averageCheck,
            workHours: workHours
        };
    }
    calculateWorkHours(userId) {
        const userOrders = this.find('orders', order => order.user_id === userId);
        if (userOrders.length === 0) return 0;
        const dates = userOrders.map(order => new Date(order.created_at)).sort((a, b) => a - b);
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        return Math.max(1, daysDiff) * 8; 
    }
    exportToJSON() {
        return JSON.stringify(this.db, null, 2);
    }
    async importFromJSON(jsonString) {
        try {
            this.db = JSON.parse(jsonString);
            this.persistToLocalStorage();
            return true;
        } catch (error) {
            return false;
        }
    }
    async reset() {
        try {
            this.db = this.getEmptyDatabase();
            this.persistToLocalStorage();
            return true;
        } catch (error) {
            return false;
        }
    }
}
const db = new Database();
if (typeof window !== 'undefined') {
    window.db = db;
}
async function initializeDatabase() {
    if (window.dbInitialized) {
        return;
    }
    await db.init();
    window.dbInitialized = true;
    window.db = db; 
}
if (typeof window !== 'undefined') {
    window.dbInitialized = false;
    window.initializeDatabase = initializeDatabase;
}
if (typeof window !== 'undefined') {
    initializeDatabase();
}