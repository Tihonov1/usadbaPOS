function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        name: params.get('name') || '',
        email: params.get('email') || '',
        role: params.get('role') || '',
        userId: params.get('userId') || ''
    };
}
function buildQuery(user) {
    const p = new URLSearchParams();
    if (user.name) p.set('name', user.name);
    if (user.email) p.set('email', user.email);
    if (user.role) p.set('role', user.role);
    if (user.userId) p.set('userId', user.userId);
    return '?' + p.toString();
}
function goBack() {
    window.history.back();
}
window.goBack = goBack;
function formatMoney(v) {
    return `${v.toLocaleString('ru-RU')} ₽`;
}
window.formatMoney = formatMoney;
function showAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('alertModal');
        const messageEl = document.getElementById('alertModalMessage');
        if (!modal || !messageEl) {
            alert(message);
            resolve();
            return;
        }
        messageEl.textContent = message;
        modal.style.display = 'flex';
        window.closeAlertModal = () => {
            modal.style.display = 'none';
            resolve();
        };
        modal.onclick = (e) => {
            if (e.target === modal) {
                window.closeAlertModal();
            }
        };
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                window.closeAlertModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}
window.showAlert = showAlert;
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmModalMessage');
        if (!modal || !messageEl) {
            resolve(confirm(message));
            return;
        }
        messageEl.textContent = message;
        modal.style.display = 'flex';
        let resolved = false;
        window.closeConfirmModal = (result) => {
            if (!resolved) {
                resolved = true;
                modal.style.display = 'none';
                resolve(result);
            }
        };
        modal.onclick = (e) => {
            if (e.target === modal) {
                window.closeConfirmModal(false);
            }
        };
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                window.closeConfirmModal(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}
window.showConfirm = showConfirm;
document.addEventListener('DOMContentLoaded', async function() {
    if (!window.dbInitialized) {
        await window.initializeDatabase();
    }
    const db = window.db;
    let queryParams = parseQuery();
    let { name, email, role, userId } = queryParams;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', ''];
    if (!publicPages.includes(currentPage) && !userId) {
        showAlert('Пожалуйста, войдите в систему').then(() => {
            window.location.href = 'index.html';
        });
        return;
    }
    if (role === 'chef' && currentPage === 'main.html') {
        const q = buildQuery({ name, email, role, userId });
        window.location.href = 'kitchen.html' + q;
        return;
    }
    if (userId && (!name || !email || !role)) {
        const user = db.findById('users', parseInt(userId));
        if (user) {
            const userRole = db.findById('roles', user.role_id);
            name = user.name || name;
            email = user.email || email;
            role = userRole ? userRole.code : role;
            const goProfileBtn = document.getElementById('goProfile');
            if (goProfileBtn && name) {
                goProfileBtn.textContent = name;
            }
        }
    }
    const payOrderId = new URLSearchParams(window.location.search).get('payOrderId');
    if (payOrderId && db && db.db) {
        const orderId = parseInt(payOrderId);
        const order = db.findById('orders', orderId);
        if (order) {
            const total = db.calculateOrderTotal(orderId);
            setTimeout(() => {
                window.pendingOrderData = {
                    existingOrderId: orderId,
                    total: total
                };
                if (typeof window.openPaymentModal === 'function') {
                    window.openPaymentModal(total);
                } else {
                    setTimeout(() => {
                        if (typeof window.openPaymentModal === 'function') {
                            window.openPaymentModal(total);
                        }
                    }, 500);
                }
            }, 300);
        }
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const validator = new FormValidator('registerForm');
        validator.addRealTimeValidation('name', validator.validateName.bind(validator));
        validator.addRealTimeValidation('email', validator.validateEmail.bind(validator));
        validator.addRealTimeValidation('password', (val) => validator.validatePassword(val, 'Пароль'));
        validator.addRealTimeValidation('confirmPassword', (val) => {
            const password = document.getElementById('password').value;
            return validator.validatePasswordConfirm(password, val);
        });
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('name').value.trim();
            const emailInput = document.getElementById('email').value.trim();
            const roleInput = document.getElementById('role').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const isValid = validator.validateForm({
                'name': validator.validateName.bind(validator),
                'email': validator.validateEmail.bind(validator),
                'role': (val) => validator.validateSelect(val, 'Должность'),
                'password': (val) => validator.validatePassword(val, 'Пароль'),
                'confirmPassword': (val) => validator.validatePasswordConfirm(password, val)
            });
            if (!isValid) {
                showAlert('Пожалуйста, исправьте ошибки в форме');
                return;
            }
            const normalizedEmail = emailInput.toLowerCase();
            const existingUser = db.getUserByEmail(normalizedEmail);
            if (existingUser) {
                showAlert('Пользователь с таким email уже зарегистрирован.');
                return;
            }
            const roleId = db.getRoleIdByKey(roleInput) || db.getRoleIdByKey('waiter') || 1;
            const loginValue = normalizedEmail.split('@')[0];
            try {
                const newUser = await db.insert('users', {
                    login: loginValue,
                    email: normalizedEmail,
                    password: password,
                    name: nameInput,
                    role_id: roleId,
                    avatar: null
                });
                if (!newUser) {
                    showAlert('Не удалось создать пользователя. Попробуйте еще раз.');
                    return;
                }
                showAlert('Сотрудник успешно зарегистрирован');
                const roleKey = db.getRoleKeyById(newUser.role_id) || roleInput;
                const q = buildQuery({ name: newUser.name, email: newUser.email, role: roleKey, userId: newUser.id });
                window.location.href = 'main.html' + q;
            } catch (error) {
                showAlert('Ошибка регистрации. Попробуйте еще раз.');
            }
        });
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const validator = new FormValidator('loginForm');
        validator.addRealTimeValidation('email', validator.validateEmail.bind(validator));
        validator.addRealTimeValidation('password', (val) => validator.validatePassword(val, 'Пароль'));
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const isValid = validator.validateForm({
                'email': validator.validateEmail.bind(validator),
                'password': (val) => validator.validatePassword(val, 'Пароль')
            });
            if (!isValid) {
                showAlert('Пожалуйста, исправьте ошибки в форме');
                return;
            }
            const user = db.authenticateUser(emailInput, password);
            if (!user) {
                showAlert('Неверный email или пароль');
                return;
            }
            const roleKey = db.getRoleKeyById(user.role_id) || 'waiter';
            const q = buildQuery({
                name: user.name,
                email: user.email || emailInput,
                role: roleKey,
                userId: user.id
            });
            window.location.href = 'main.html' + q;
        });
    }
    const goKitchenBtn = document.getElementById('goKitchen');
    if (goKitchenBtn) {
        if (role !== 'chef' && role !== 'admin') {
            goKitchenBtn.style.display = 'none';
        }
        goKitchenBtn.addEventListener('click', function() {
            const q = buildQuery({ name, email, role, userId });
            window.location.href = 'kitchen.html' + q;
        });
    }
    const goProfileBtn = document.getElementById('goProfile');
    if (goProfileBtn) {
        if (name) goProfileBtn.textContent = name;
        goProfileBtn.addEventListener('click', function() {
            const q = buildQuery({ name, email, role, userId });
            window.location.href = 'profile.html' + q;
        });
    }
    if (role === 'admin') {
        const headerRight = document.querySelector('.header-right');
        if (headerRight && !document.getElementById('goAdmin')) {
            const adminBtn = document.createElement('button');
            adminBtn.id = 'goAdmin';
            adminBtn.className = 'button';
            adminBtn.innerHTML = `
                <img src="./icons/admin.png" alt="Admin" width="16" height="16">
                Администрирование
            `;
            adminBtn.addEventListener('click', function() {
                const q = buildQuery({ name, email, role, userId });
                window.location.href = 'admin.html' + q;
            });
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                headerRight.insertBefore(adminBtn, logoutBtn);
            } else {
                headerRight.appendChild(adminBtn);
            }
        }
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    const ordersListEl = document.getElementById('ordersList');
    const subtotalEl = document.getElementById('subtotalValue');
    const vatEl = document.getElementById('vatValue');
    const totalEl = document.getElementById('totalValue');
    const ordersCountBadge = document.getElementById('ordersCountBadge');
    const tableInput = document.querySelector('.table-input');
    const order = []; 
    if (tableInput && typeof FormValidator !== 'undefined') {
        const tableValidator = new FormValidator();
        tableInput.addEventListener('blur', function() {
            const error = tableValidator.validateTableNumber(this.value);
            if (error) {
                this.classList.add('input-error');
                const existingError = this.parentElement.querySelector('.error-message');
                if (existingError) existingError.remove();
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = error;
                this.parentElement.appendChild(errorDiv);
            } else {
                this.classList.remove('input-error');
                const errorMessage = this.parentElement.querySelector('.error-message');
                if (errorMessage) errorMessage.remove();
            }
        });
        tableInput.addEventListener('input', function() {
            if (this.classList.contains('input-error')) {
                const error = tableValidator.validateTableNumber(this.value);
                if (!error) {
                    this.classList.remove('input-error');
                    const errorMessage = this.parentElement.querySelector('.error-message');
                    if (errorMessage) errorMessage.remove();
                }
            }
        });
    }
    function findItemByName(n) {
        return order.find(i => i.name === n);
    }
    function recalcTotals() {
        const subtotal = order.reduce((s, i) => s + i.price * i.qty, 0);
        const vat = Math.round(subtotal * 0.20);
        const total = subtotal + vat;
        if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
        if (vatEl) vatEl.textContent = formatMoney(vat);
        if (totalEl) totalEl.textContent = formatMoney(total);
        if (ordersCountBadge) ordersCountBadge.textContent = `${order.length} позиций`;
    }
    function renderOrders() {
        if (!ordersListEl) return;
        if (order.length === 0) {
            ordersListEl.innerHTML = '<div class="empty-state">Корзина пуста</div>';
            recalcTotals();
            return;
        }
        ordersListEl.innerHTML = order.map((i, idx) => (
            `<div class="order-item" data-idx="${idx}">`+
                `<img src="${i.image || 'https://via.placeholder.com/80'}" alt="${i.name}" class="order-item-image">`+
                `<div class="order-item-details">`+
                    `<div class="order-item-name">${i.name}</div>`+
                    `<div class="order-item-price">${formatMoney(i.price)}</div>`+
                    `<div class="quantity-controls">`+
                        `<button class="quantity-btn" data-action="dec">-</button>`+
                        `<span class="quantity">${i.qty}</span>`+
                        `<button class="quantity-btn" data-action="inc">+</button>`+
                        `<button class="remove-btn" data-action="remove">×</button>`+
                    `</div>`+
                `</div>`+
            `</div>`
        )).join('');
        recalcTotals();
    }
    function addFromMenu(cardEl) {
        const dishId = cardEl.getAttribute('data-dish-id');
        if (!dishId) return;
        if (!db || !db.db) {
            showAlert('База данных не инициализирована. Пожалуйста, обновите страницу.');
            return;
        }
        const dish = db.findById('dishes', parseInt(dishId));
        if (!dish || !dish.available) {
            showAlert('Блюдо недоступно');
            return;
        }
        const existing = order.find(i => i.dish_id === dish.id);
        if (existing) {
            existing.qty += 1;
        } else {
            order.push({ 
                dish_id: dish.id,
                name: dish.name, 
                price: dish.price, 
                qty: 1,
                image: dish.image || 'https://via.placeholder.com/80'
            });
        }
        renderOrders();
    }
    let currentCategoryFilter = null;
    let currentSearchQuery = '';
    async function loadCategories() {
        const categoriesContainer = document.querySelector('.categories');
        if (!categoriesContainer) return;
        if (!window.db) {
            window.db = db;
        }
        if (!window.db || !window.db.db) {
            if (window.initializeDatabase) {
                await window.initializeDatabase();
            }
        }
        if (!window.db || !window.db.db) {
            return;
        }
        const categories = window.db.getAll('dish_categories');
        categoriesContainer.innerHTML = `
            <button class="category-btn active" data-category-id="all">Все</button>
            ${categories.map(cat => `
                <button class="category-btn" data-category-id="${cat.id}">${cat.name}</button>
            `).join('')}
        `;
        categoriesContainer.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                categoriesContainer.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const categoryId = this.getAttribute('data-category-id');
                currentCategoryFilter = categoryId === 'all' ? null : parseInt(categoryId);
                loadMenu();
            });
        });
    }
    async function loadMenu() {
        const menuGrid = document.querySelector('.menu-grid');
        if (!menuGrid) return;
        if (!window.db) {
            window.db = db;
        }
        if (!window.db || !window.db.db) {
            menuGrid.innerHTML = '<div class="empty-state">Загрузка меню...</div>';
            if (window.initializeDatabase) {
                await window.initializeDatabase();
            }
        }
        if (!window.db || !window.db.db) {
            menuGrid.innerHTML = '<div class="empty-state">Ошибка загрузки меню</div>';
            return;
        }
        let dishes;
        if (currentCategoryFilter !== null) {
            dishes = window.db.getDishesByCategory(currentCategoryFilter);
        } else {
            dishes = window.db.getAll('dishes').filter(d => d.available);
        }
        if (currentSearchQuery) {
            const query = currentSearchQuery.toLowerCase();
            dishes = dishes.filter(dish => 
                dish.name.toLowerCase().includes(query)
            );
        }
        if (dishes.length === 0) {
            menuGrid.innerHTML = '<div class="empty-state">Блюда не найдены</div>';
            return;
        }
        menuGrid.innerHTML = dishes.map(dish => {
            const category = window.db.findById('dish_categories', dish.category_id);
            const imageUrl = dish.image || 'https://via.placeholder.com/300x200?text=Нет+изображения';
            return `
                <div class="menu-item" data-dish-id="${dish.id}" data-category-id="${dish.category_id}">
                    <img src="${imageUrl}" alt="${dish.name}" class="menu-item-image" onerror="this.src='https://via.placeholder.com/300x200?text=Ошибка+загрузки'">
                    <div class="menu-item-content">
                        <div class="menu-item-name">${dish.name}</div>
                        <div class="menu-item-description">${category ? category.name : ''}</div>
                        <div class="menu-item-footer">
                            <div class="menu-item-price">${formatMoney(dish.price)}</div>
                            <button class="add-button">Добавить</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchQuery = this.value.trim();
                loadMenu();
            }, 300); 
        });
    }
    if (document.querySelector('.menu-grid')) {
        loadCategories(); 
        loadMenu(); 
        window.addEventListener('databaseUpdated', () => {
            loadCategories();
            loadMenu();
        });
    }
    window.loadMenu = loadMenu;
    window.loadCategories = loadCategories;
    const sendToKitchenBtn = document.getElementById('sendToKitchenBtn');
    if (sendToKitchenBtn) {
        sendToKitchenBtn.addEventListener('click', async function() {
            if (order.length === 0) {
                showAlert('Добавьте блюда в заказ');
                return;
            }
            if (typeof FormValidator !== 'undefined' && tableInput) {
                const validator = new FormValidator();
                const tableError = validator.validateTableNumber(tableInput.value);
                if (tableError) {
                    tableInput.classList.add('input-error');
                    const existingError = tableInput.parentElement.querySelector('.error-message');
                    if (existingError) existingError.remove();
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = tableError;
                    tableInput.parentElement.appendChild(errorDiv);
                    return;
                } else {
                    tableInput.classList.remove('input-error');
                    const errorMessage = tableInput.parentElement.querySelector('.error-message');
                    if (errorMessage) errorMessage.remove();
                }
            }
            const tableNumber = tableInput ? parseInt(tableInput.value) : null;
            const table = db.find('tables', t => t.number === tableNumber)[0];
            if (!table) {
                showAlert('Стол не найден');
                return;
            }
            const userId = parseInt(queryParams.userId, 10);
            if (!userId) {
                showAlert('Ошибка: пользователь не определен. Войдите в систему заново.');
                return;
            }
            if (!db || !db.db) {
                showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
                return;
            }
            const activeOrder = db.getActiveOrderForTable(table.id);
            const orderItems = order.map(item => ({
                dish_id: item.dish_id,
                count: item.qty,
                price: item.price
            }));
            try {
                let resultMessage = '';
                if (activeOrder) {
                    const existingItems = db.getOrderItems(activeOrder.id);
                    const existingTotal = db.calculateOrderTotal(activeOrder.id);
                    const addToExisting = await showConfirm(
                        `Для стола ${tableNumber} уже есть активный заказ #${activeOrder.id} на сумму ${formatMoney(existingTotal)}.\n\nДобавить новые блюда к этому заказу?`
                    );
                    if (addToExisting) {
                        const success = await db.addItemsToOrder(activeOrder.id, orderItems);
                        if (success) {
                            const newTotal = db.calculateOrderTotal(activeOrder.id);
                            resultMessage = `Блюда добавлены к заказу #${activeOrder.id}!\nНовая сумма: ${formatMoney(newTotal)}`;
                        } else {
                            showAlert('Ошибка при добавлении блюд к заказу');
                            return;
                        }
                    } else {
                        const newOrder = await db.createOrder(table.id, userId, orderItems);
                        if (newOrder) {
                            resultMessage = `Создан новый заказ #${newOrder.id} для стола ${tableNumber}!\nОплата будет позже.`;
                        } else {
                            showAlert('Ошибка при создании заказа');
                            return;
                        }
                    }
                } else {
                    const newOrder = await db.createOrder(table.id, userId, orderItems);
                    if (newOrder) {
                        resultMessage = `Заказ #${newOrder.id} отправлен на кухню!\nОплата будет позже.`;
                    } else {
                        showAlert('Ошибка при создании заказа');
                        return;
                    }
                }
                showAlert(resultMessage);
                order.length = 0;
                if (tableInput) tableInput.value = '';
                renderOrders();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('databaseUpdated'));
                }
            } catch (error) {
                showAlert('Ошибка при создании заказа. Попробуйте еще раз.');
            }
        });
    }
    if (!window.pendingOrderData) window.pendingOrderData = null;
    let selectedPaymentMethod = null;
    window.openPaymentModal = function(total) {
        const modal = document.getElementById('paymentModal');
        const totalAmount = document.getElementById('paymentTotalAmount');
        if (modal && totalAmount) {
            totalAmount.textContent = formatMoney(total);
            modal.style.display = 'flex';
            selectedPaymentMethod = null;
            updatePaymentButton();
            document.querySelectorAll('.payment-method-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
    };
    window.closePaymentModal = function() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            window.pendingOrderData = null;
            selectedPaymentMethod = null;
            isPaymentProcessing = false; 
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Подтвердить оплату';
            }
        }
    };
    window.selectPaymentMethod = function(method) {
        selectedPaymentMethod = method;
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-method') === method) {
                btn.classList.add('active');
            }
        });
        updatePaymentButton();
    };
    function updatePaymentButton() {
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = !selectedPaymentMethod;
        }
    }
    let isPaymentProcessing = false; 
    window.confirmPayment = async function() {
        if (isPaymentProcessing) {
            return;
        }
        if (!selectedPaymentMethod) {
            showAlert('Выберите способ оплаты');
            return;
        }
        if (!window.pendingOrderData) {
            showAlert('Ошибка: данные заказа потеряны. Попробуйте создать заказ заново.');
            return;
        }
        if (!window.db || !window.db.db) {
            showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
            return;
        }
        isPaymentProcessing = true;
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Обработка...';
        }
        try {
            let orderId;
            let paymentTotal;
            if (window.pendingOrderData.existingOrderId) {
                orderId = window.pendingOrderData.existingOrderId;
                paymentTotal = window.pendingOrderData.total;
                const allBills = window.db.getAll('bills');
                let bill = allBills.find(b => b.order_id === orderId);
                if (!bill) {
                    const subtotal = Math.round(paymentTotal / 1.2);
                    const vat = paymentTotal - subtotal;
                    bill = await window.db.createBill(orderId, paymentTotal, {
                        subtotal: subtotal,
                        vat: vat,
                        paymentMethod: selectedPaymentMethod
                    });
                    if (!bill) {
                        showAlert('Не удалось создать счет');
                        return;
                    }
                }
                const paidBill = await window.db.payBill(bill.id, selectedPaymentMethod);
                if (!paidBill) {
                    showAlert('Не удалось оплатить счет');
                    return;
                }
            } else {
                if (!window.pendingOrderData.total || !window.pendingOrderData.orderItems || window.pendingOrderData.orderItems.length === 0) {
                    showAlert('Ошибка: данные заказа некорректны. Попробуйте заново.');
                    return;
                }
                const newOrder = await window.db.createOrder(
                    window.pendingOrderData.tableId,
                    window.pendingOrderData.userId,
                    window.pendingOrderData.orderItems
                );
                if (!newOrder) {
                    showAlert('Не удалось создать заказ. Проверьте консоль (F12)');
                    return;
                }
                orderId = newOrder.id;
                paymentTotal = window.pendingOrderData.total;
                const bill = await window.db.createBill(newOrder.id, window.pendingOrderData.total, {
                    subtotal: window.pendingOrderData.subtotal,
                    vat: window.pendingOrderData.vat,
                    paymentMethod: selectedPaymentMethod
                });
                if (!bill) {
                    showAlert('Не удалось создать счет');
                    return;
                }
                const paidBill = await window.db.payBill(bill.id, selectedPaymentMethod);
                if (!paidBill) {
                    showAlert('Не удалось оплатить счет');
                    return;
                }
            }
            const paymentMethod = selectedPaymentMethod;
            const wasExistingOrder = window.pendingOrderData.existingOrderId;
            closePaymentModal();
            const methodNames = {
                'cash': 'наличными',
                'card': 'банковской картой',
                'online': 'онлайн'
            };
            showAlert(`Заказ #${orderId} успешно оплачен ${methodNames[paymentMethod]}!\nСумма: ${formatMoney(paymentTotal)}`).then(() => {
                if (wasExistingOrder) {
                    const params = new URLSearchParams(window.location.search);
                    params.delete('payOrderId'); 
                    window.location.href = 'profile.html?' + params.toString();
                }
            });
            if (!wasExistingOrder) {
                order.length = 0;
                if (tableInput) tableInput.value = '';
                renderOrders();
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('databaseUpdated'));
            }
        } catch (error) {
            showAlert('Ошибка при оплате: ' + (error.message || error));
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Подтвердить оплату';
            }
        } finally {
            isPaymentProcessing = false;
        }
    };
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.add-button');
        if (btn) {
            const card = btn.closest('.menu-item');
            if (card) addFromMenu(card);
        }
    });
    if (ordersListEl) {
        ordersListEl.addEventListener('click', function(e) {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            const wrap = actionBtn.closest('.order-item');
            if (!wrap) return;
            const idx = parseInt(wrap.getAttribute('data-idx'), 10);
            if (Number.isNaN(idx) || !order[idx]) return;
            const action = actionBtn.getAttribute('data-action');
            if (action === 'inc') order[idx].qty += 1;
            if (action === 'dec') order[idx].qty = Math.max(1, order[idx].qty - 1);
            if (action === 'remove') order.splice(idx, 1);
            renderOrders();
        });
    }
    if (ordersListEl) renderOrders();
    if (tableInput) {
        tableInput.addEventListener('input', function() {
            const tableNumber = parseInt(tableInput.value);
            const tableOrderInfo = document.getElementById('tableOrderInfo');
            if (!tableOrderInfo || !tableNumber || isNaN(tableNumber)) {
                if (tableOrderInfo) tableOrderInfo.style.display = 'none';
                return;
            }
            const table = db.find('tables', t => t.number === tableNumber)[0];
            if (!table) {
                tableOrderInfo.style.display = 'none';
                return;
            }
            const activeOrder = db.getActiveOrderForTable(table.id);
            if (activeOrder) {
                const orderItems = db.getOrderItems(activeOrder.id);
                const orderTotal = db.calculateOrderTotal(activeOrder.id);
                const orderStatus = db.findById('order_status', activeOrder.status_id);
                tableOrderInfo.innerHTML = `
                    <div class="table-order-info-title">📋 Активный заказ #${activeOrder.id}</div>
                    <div class="table-order-info-details">
                        Позиций: ${orderItems.length} • Сумма: ${formatMoney(orderTotal)}<br>
                        Статус: ${orderStatus ? orderStatus.name : 'Неизвестно'}
                    </div>
                `;
                tableOrderInfo.style.display = 'block';
            } else {
                tableOrderInfo.style.display = 'none';
            }
        });
    }
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const avatarInitials = document.getElementById('avatarInitials');
    if (userNameEl || userEmailEl || userRoleBadge || avatarInitials) {
        const displayName = name || 'Пользователь';
        if (userNameEl) userNameEl.textContent = displayName;
        if (userEmailEl) userEmailEl.textContent = email || '—';
        if (userRoleBadge) userRoleBadge.textContent = role ? roleLabel(role) : 'Сотрудник';
        if (avatarInitials) avatarInitials.textContent = makeInitials(displayName);
    }
    const profileUserId = parseInt(parseQuery().userId) || null;
    if (profileUserId && document.querySelector('.stats-grid')) {
        if (window.dbInitialized) {
            loadUserStatistics(profileUserId);
        } else {
            const initStats = () => {
                if (window.dbInitialized) {
                    loadUserStatistics(profileUserId);
                    window.removeEventListener('databaseUpdated', initStats);
                }
            };
            window.addEventListener('databaseUpdated', initStats);
            setTimeout(() => {
                if (window.dbInitialized) {
                    loadUserStatistics(profileUserId);
                }
            }, 500);
        }
        window.addEventListener('databaseUpdated', () => {
            if (window.dbInitialized) {
                loadUserStatistics(profileUserId);
            }
        });
    }
    const ordersGrid = document.getElementById('ordersGrid');
    if (ordersGrid) {
        loadKitchenOrders();
        setInterval(loadKitchenOrders, 5000);
    }
});
function loadKitchenOrders() {
    const ordersGrid = document.getElementById('ordersGrid');
    if (!ordersGrid) return;
    if (!db || !db.db) {
        return;
    }
    const allOrders = db.getAll('orders');
    const newOrders = db.getOrdersByStatus(1); 
    const kitchenOrders = db.getOrdersByStatus(2); 
    const readyOrders = db.getOrdersByStatus(3); 
    updateKitchenCounts(allOrders.length, newOrders.length, kitchenOrders.length, readyOrders.length);
    const activeOrders = [...newOrders, ...kitchenOrders];
    if (activeOrders.length === 0) {
        ordersGrid.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                    <line x1="6" y1="17" x2="18" y2="17"/>
                </svg>
                <p>Нет активных заказов</p>
            </div>
        `;
        return;
    }
    ordersGrid.innerHTML = activeOrders.map(order => {
        const table = db.findById('tables', order.table_id);
        const status = db.findById('order_status', order.status_id);
        const items = db.getOrderItems(order.id);
        const total = db.calculateOrderTotal(order.id);
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-card-header">
                    <div>
                        <h3>Заказ #${order.id}</h3>
                        <p>Стол ${table ? table.number : '?'}</p>
                    </div>
                    <span class="badge ${order.status_id === 1 ? 'orange' : 'blue'}">${status ? status.name : ''}</span>
                </div>
                <div class="order-card-items">
                    ${items.map(item => {
                        const dish = db.findById('dishes', item.dish_id);
                        return `<div class="order-item-row">
                            <span>${dish ? dish.name : 'Блюдо'} x${item.count}</span>
                            <span>${formatMoney(item.price * item.count)}</span>
                        </div>`;
                    }).join('')}
                </div>
                <div class="order-card-footer">
                    <div class="order-total">Итого: ${formatMoney(total)}</div>
                    <div class="order-actions">
                        ${order.status_id === 1 ? `
                            <button class="button blue" onclick="updateOrderStatus(${order.id}, 2)">Взять в работу</button>
                        ` : ''}
                        ${order.status_id === 2 ? `
                            <button class="button green" onclick="updateOrderStatus(${order.id}, 3)">Готово</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
window.updateOrderStatus = function(orderId, statusId) {
    if (!db || !db.db) {
        showAlert('Ошибка: база данных не инициализирована');
        return;
    }
    db.update('orders', orderId, { status_id: statusId }).then(() => {
        loadKitchenOrders();
    }).catch(error => {
        showAlert('Ошибка при обновлении статуса заказа');
    });
};
window.filterOrders = function(filter) {
    const ordersGrid = document.getElementById('ordersGrid');
    if (!ordersGrid) return;
    if (!db || !db.db) {
        return;
    }
    let orders = [];
    switch(filter) {
        case 'all':
            orders = db.getAll('orders');
            break;
        case 'pending':
            orders = db.getOrdersByStatus(1); 
            break;
        case 'preparing':
            orders = db.getOrdersByStatus(2); 
            break;
        case 'ready':
            orders = db.getOrdersByStatus(3); 
            break;
    }
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.filter-btn')?.classList.add('active');
    if (orders.length === 0) {
        ordersGrid.innerHTML = '<div class="empty-state">Нет заказов</div>';
        return;
    }
    ordersGrid.innerHTML = orders.map(order => {
        const table = db.findById('tables', order.table_id);
        const status = db.findById('order_status', order.status_id);
        const items = db.getOrderItems(order.id);
        const total = db.calculateOrderTotal(order.id);
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-card-header">
                    <div>
                        <h3>Заказ #${order.id}</h3>
                        <p>Стол ${table ? table.number : '?'}</p>
                    </div>
                    <span class="badge">${status ? status.name : ''}</span>
                </div>
                <div class="order-card-items">
                    ${items.map(item => {
                        const dish = db.findById('dishes', item.dish_id);
                        return `<div class="order-item-row">
                            <span>${dish ? dish.name : 'Блюдо'} x${item.count}</span>
                            <span>${formatMoney(item.price * item.count)}</span>
                        </div>`;
                    }).join('')}
                </div>
                <div class="order-card-footer">
                    <div class="order-total">Итого: ${formatMoney(total)}</div>
                </div>
            </div>
        `;
    }).join('');
};
function roleLabel(role) {
    switch (role) {
        case 'waiter': return 'Официант';
        case 'chef': return 'Повар';
        case 'manager': return 'Менеджер';
        case 'admin': return 'Администратор';
        default: return 'Сотрудник';
    }
}
function loadUserStatistics(userId) {
    if (!userId) {
        return;
    }
    if (!db || !db.db) {
        if (window.initializeDatabase) {
            window.initializeDatabase().then(() => {
                if (db && db.db) {
                    loadUserStatistics(userId);
                }
            });
        }
        return;
    }
    try {
        const stats = db.getUserStatistics(userId);
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            const ordersValue = statCards[0].querySelector('.stat-value');
            if (ordersValue) ordersValue.textContent = stats.ordersCount || 0;
            const revenueValue = statCards[1].querySelector('.stat-value');
            if (revenueValue) revenueValue.textContent = formatMoney(stats.totalRevenue || 0);
            const hoursValue = statCards[2].querySelector('.stat-value');
            if (hoursValue) hoursValue.textContent = Math.round(stats.workHours || 0);
            const avgCheckValue = statCards[3].querySelector('.stat-value');
            if (avgCheckValue) avgCheckValue.textContent = formatMoney(stats.averageCheck || 0);
        } else {
        }
    } catch (error) {
    }
}
function makeInitials(displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}
function updateKitchenCounts(all, pending, preparing, ready) {
    const totalOrdersBadge = document.getElementById('totalOrdersBadge');
    const countAll = document.getElementById('countAll');
    const countPending = document.getElementById('countPending');
    const countPreparing = document.getElementById('countPreparing');
    const countReady = document.getElementById('countReady');
    if (totalOrdersBadge) totalOrdersBadge.textContent = `${all} заказов`;
    if (countAll) countAll.textContent = all;
    if (countPending) countPending.textContent = pending;
    if (countPreparing) countPreparing.textContent = preparing;
    if (countReady) countReady.textContent = ready;
}