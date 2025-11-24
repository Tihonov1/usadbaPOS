document.addEventListener('DOMContentLoaded', async function() {
    if (!window.dbInitialized) {
        await window.initializeDatabase();
    }
    const db = window.db;
    const queryParams = parseQuery();
    const role = queryParams.role;
    const userId = queryParams.userId;
    if (role !== 'admin') {
        showAlert('У вас нет доступа к этой странице');
        window.location.href = 'main.html';
        return;
    }
    initTabs();
    await loadDishes();
    await loadStaff();
    document.getElementById('addDishBtn')?.addEventListener('click', async () => await openDishModal());
    document.getElementById('dishForm')?.addEventListener('submit', handleDishSubmit);
    document.getElementById('addStaffBtn')?.addEventListener('click', async () => await openStaffModal());
    document.getElementById('staffForm')?.addEventListener('submit', handleStaffSubmit);
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    const dishImageInput = document.getElementById('dishImage');
    if (dishImageInput) {
        dishImageInput.addEventListener('change', handleImageUpload);
    }
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = document.getElementById('reportDateFrom');
    const dateTo = document.getElementById('reportDateTo');
    if (dateFrom) dateFrom.value = today;
    if (dateTo) dateTo.value = today;
    window.addEventListener('databaseUpdated', async () => {
        await loadDishes();
        await loadStaff();
    });
});
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab + 'Tab') {
                    content.classList.add('active');
                }
            });
        });
    });
}
async function loadDishes() {
    if (!window.db || !window.db.db) {
        const dishesList = document.getElementById('dishesList');
        if (dishesList) {
            dishesList.innerHTML = '<div class="empty-state">Загрузка блюд...</div>';
        }
        return;
    }
    const dishes = window.db.getAll('dishes');
    const categories = window.db.getAll('dish_categories');
    const dishesList = document.getElementById('dishesList');
    if (!dishesList) return;
    if (dishes.length === 0) {
        dishesList.innerHTML = '<div class="empty-state">Нет блюд. Добавьте первое блюдо.</div>';
        return;
    }
    dishesList.innerHTML = dishes.map(dish => {
        const category = categories.find(c => c.id === dish.category_id);
        const imageUrl = dish.image || 'https://via.placeholder.com/200x150?text=Нет+изображения';
        return `
            <div class="dish-card" data-dish-id="${dish.id}">
                <div class="dish-card-content">
                    <img src="${imageUrl}" alt="${dish.name}" class="dish-image" onerror="this.src='https://via.placeholder.com/200x150?text=Ошибка+загрузки'">
                    <div class="dish-info">
                        <h3>${dish.name}</h3>
                        <p class="dish-category">${category ? category.name : 'Без категории'}</p>
                        <p class="dish-price">${formatMoney(dish.price)}</p>
                        <span class="badge ${dish.available ? 'green' : 'red'}">
                            ${dish.available ? 'Доступно' : 'Недоступно'}
                        </span>
                    </div>
                    <div class="dish-actions">
                        <button class="button blue" onclick="editDish(${dish.id})">Редактировать</button>
                        <button class="button red" onclick="deleteDish(${dish.id})">Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showAlert('Пожалуйста, выберите файл изображения');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewDiv = document.getElementById('dishImagePreview');
        const previewImg = document.getElementById('dishImagePreviewImg');
        if (previewDiv && previewImg) {
            previewImg.src = e.target.result;
            previewDiv.style.display = 'block';
        }
        const hiddenInput = document.getElementById('dishImageData');
        if (!hiddenInput) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.id = 'dishImageData';
            document.getElementById('dishForm').appendChild(input);
        }
        document.getElementById('dishImageData').value = e.target.result;
    };
    reader.readAsDataURL(file);
}
async function openDishModal(dishId = null) {
    const modal = document.getElementById('dishModal');
    const form = document.getElementById('dishForm');
    const title = document.getElementById('modalTitle');
    if (!modal || !form || !title) {
        return;
    }
    if (!window.dbInitialized) {
        await window.initializeDatabase();
    }
    modal.style.display = 'flex';
    if (typeof FormValidator !== 'undefined') {
        const validator = new FormValidator('dishForm');
        validator.addRealTimeValidation('dishName', validator.validateDishName.bind(validator));
        validator.addRealTimeValidation('dishPrice', validator.validatePrice.bind(validator));
    }
    const previewDiv = document.getElementById('dishImagePreview');
    const previewImg = document.getElementById('dishImagePreviewImg');
    if (previewDiv) previewDiv.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (dishId) {
        const dish = window.db.findById('dishes', dishId);
        if (!dish) return;
        title.textContent = 'Редактировать блюдо';
        document.getElementById('dishId').value = dish.id;
        document.getElementById('dishName').value = dish.name;
        document.getElementById('dishPrice').value = dish.price;
        document.getElementById('dishCategory').value = dish.category_id || '';
        document.getElementById('dishAvailable').checked = dish.available !== false;
        if (dish.image) {
            if (previewDiv) previewDiv.style.display = 'block';
            if (previewImg) previewImg.src = dish.image;
            const hiddenInput = document.getElementById('dishImageData');
            if (!hiddenInput) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.id = 'dishImageData';
                form.appendChild(input);
            }
            document.getElementById('dishImageData').value = dish.image;
        }
    } else {
        title.textContent = 'Добавить блюдо';
        form.reset();
        document.getElementById('dishId').value = '';
        document.getElementById('dishAvailable').checked = true;
        const hiddenInput = document.getElementById('dishImageData');
        if (hiddenInput) hiddenInput.value = '';
    }
}
window.closeDishModal = function() {
    const modal = document.getElementById('dishModal');
    if (modal) modal.style.display = 'none';
};
async function handleDishSubmit(e) {
    e.preventDefault();
    if (!window.db || !window.db.db) {
        showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
        return;
    }
    const validator = new FormValidator('dishForm');
    const isValid = validator.validateForm({
        'dishName': validator.validateDishName.bind(validator),
        'dishPrice': validator.validatePrice.bind(validator),
        'dishCategory': (val) => validator.validateSelect(val, 'Категория')
    });
    if (!isValid) {
        showAlert('Пожалуйста, исправьте ошибки в форме');
        return;
    }
    const dishId = document.getElementById('dishId').value;
    const name = document.getElementById('dishName').value.trim();
    const price = parseFloat(document.getElementById('dishPrice').value);
    const categoryId = parseInt(document.getElementById('dishCategory').value);
    const available = document.getElementById('dishAvailable').checked;
    const imageData = document.getElementById('dishImageData')?.value || '';
    const dishData = {
        name: name,
        price: price,
        category_id: categoryId,
        available: available
    };
    if (imageData) {
        dishData.image = imageData;
    }
    if (dishId) {
        const existingDish = window.db.findById('dishes', parseInt(dishId));
        if (!imageData && existingDish && existingDish.image) {
            dishData.image = existingDish.image;
        }
        await window.db.update('dishes', parseInt(dishId), dishData);
        showAlert('Блюдо обновлено');
    } else {
        dishData.created_at = new Date().toISOString();
        await window.db.insert('dishes', dishData);
        showAlert('Блюдо добавлено');
    }
    closeDishModal();
    await loadDishes();
    if (typeof window.loadMenu === 'function') {
        try {
            window.loadMenu();
        } catch(e) {
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('databaseUpdated'));
    }
}
window.editDish = async function(dishId) {
    await openDishModal(dishId);
};
window.deleteDish = async function(dishId) {
    const confirmed = await showConfirm('Вы уверены, что хотите удалить это блюдо?');
    if (!confirmed) {
        return;
    }
    if (!window.db || !window.db.db) {
        showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
        return;
    }
    const orderItems = window.db.find('order_items', item => item.dish_id === dishId);
    if (orderItems.length > 0) {
        const confirmed = await showConfirm(`Это блюдо используется в ${orderItems.length} заказах. Удалить его из меню (недоступно для заказа)?`);
        if (!confirmed) {
            return;
        }
        await window.db.update('dishes', dishId, { available: false });
        showAlert('Блюдо помечено как недоступное');
    } else {
        await window.db.delete('dishes', dishId);
        showAlert('Блюдо удалено');
    }
    await loadDishes();
};
async function generateReport() {
    if (!window.db || !window.db.db) {
        showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
        return;
    }
    const dateFrom = document.getElementById('reportDateFrom')?.value;
    const dateTo = document.getElementById('reportDateTo')?.value;
    const resultsDiv = document.getElementById('reportResults');
    if (!dateFrom || !dateTo) {
        showAlert('Выберите период для отчета');
        return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
        showAlert('Дата начала не может быть позже даты окончания');
        return;
    }
    const queryParams = parseQuery();
    const userId = queryParams.userId;
    try {
        const report = await window.db.createReport(parseInt(userId) || 1, dateFrom, dateTo);
        if (!resultsDiv) return;
        const averageCheck = report.averageCheck || 0;
        resultsDiv.innerHTML = `
            <div class="report-card">
                <h3>Отчет за период: ${formatDate(dateFrom)} — ${formatDate(dateTo)}</h3>
                <div class="report-stats">
                    <div class="stat-item">
                        <div class="stat-label">Общая выручка</div>
                        <div class="stat-value">${formatMoney(report.totalRevenue)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Количество заказов</div>
                        <div class="stat-value">${report.ordersCount}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Средний чек</div>
                        <div class="stat-value">${formatMoney(averageCheck)}</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        showAlert('Ошибка при генерации отчета. Попробуйте еще раз.');
    }
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
window.onclick = function(event) {
    const dishModal = document.getElementById('dishModal');
    const staffModal = document.getElementById('staffModal');
    if (event.target === dishModal) {
        closeDishModal();
    }
    if (event.target === staffModal) {
        closeStaffModal();
    }
};
async function loadStaff() {
    if (!window.db || !window.db.db) {
        const staffList = document.getElementById('staffList');
        if (staffList) {
            staffList.innerHTML = '<div class="empty-state">Загрузка сотрудников...</div>';
        }
        return;
    }
    const users = window.db.getAll('users');
    const roles = window.db.getAll('roles');
    const staffList = document.getElementById('staffList');
    if (!staffList) return;
    if (users.length === 0) {
        staffList.innerHTML = '<div class="empty-state">Нет сотрудников. Добавьте первого сотрудника.</div>';
        return;
    }
    staffList.innerHTML = users.map(user => {
        const role = roles.find(r => r.id === user.role_id);
        let avatarUrl;
        if (user.avatar) {
            avatarUrl = user.avatar; 
        } else if (user.role_id === 2) {
            avatarUrl = './icons/admin.png'; 
        } else if (user.role_id === 3) {
            avatarUrl = './icons/chef.png'; 
        } else {
            avatarUrl = './icons/logo.png'; 
        }
        return `
            <div class="staff-card" data-staff-id="${user.id}">
                <div class="staff-card-content">
                    <img src="${avatarUrl}" alt="${user.name}" class="staff-avatar" onerror="this.src='./icons/logo.png'">
                    <div class="staff-info">
                        <h3>${user.name}</h3>
                        <p class="staff-email">${user.email}</p>
                        <p class="staff-login">Логин: ${user.login}</p>
                        <span class="badge blue">${role ? role.name : 'Без роли'}</span>
                    </div>
                    <div class="staff-actions">
                        <button class="button blue" onclick="editStaff(${user.id})">Редактировать</button>
                        <button class="button red" onclick="deleteStaff(${user.id})">Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
async function openStaffModal(staffId = null) {
    const modal = document.getElementById('staffModal');
    const form = document.getElementById('staffForm');
    const title = document.getElementById('staffModalTitle');
    if (!modal || !form || !title) {
        return;
    }
    if (!window.dbInitialized) {
        await window.initializeDatabase();
    }
    modal.style.display = 'flex';
    if (typeof FormValidator !== 'undefined') {
        const validator = new FormValidator('staffForm');
        validator.addRealTimeValidation('staffName', validator.validateName.bind(validator));
        validator.addRealTimeValidation('staffEmail', validator.validateEmail.bind(validator));
        validator.addRealTimeValidation('staffLogin', validator.validateLogin.bind(validator));
        validator.addRealTimeValidation('staffPassword', (val) => {
            const staffId = document.getElementById('staffId').value;
            if (!staffId && (!val || val.trim() === '')) {
                return 'Пароль обязателен для нового сотрудника';
            }
            if (val && val.trim() !== '') {
                return validator.validatePassword(val, 'Пароль');
            }
            return null;
        });
    }
    if (staffId) {
        const user = window.db.findById('users', staffId);
        if (!user) return;
        title.textContent = 'Редактировать сотрудника';
        document.getElementById('staffId').value = user.id;
        document.getElementById('staffName').value = user.name;
        document.getElementById('staffEmail').value = user.email;
        document.getElementById('staffLogin').value = user.login;
        document.getElementById('staffPassword').value = user.password || '';
        document.getElementById('staffRole').value = user.role_id || '';
        document.getElementById('staffPassword').required = false;
    } else {
        title.textContent = 'Добавить сотрудника';
        form.reset();
        document.getElementById('staffId').value = '';
        document.getElementById('staffPassword').required = true;
    }
}
window.closeStaffModal = function() {
    const modal = document.getElementById('staffModal');
    if (modal) modal.style.display = 'none';
};
async function handleStaffSubmit(e) {
    e.preventDefault();
    if (!window.db || !window.db.db) {
        showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
        return;
    }
    const validator = new FormValidator('staffForm');
    const staffId = document.getElementById('staffId').value;
    const name = document.getElementById('staffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const login = document.getElementById('staffLogin').value.trim();
    const password = document.getElementById('staffPassword').value;
    const roleId = parseInt(document.getElementById('staffRole').value);
    const validationFields = {
        'staffName': validator.validateName.bind(validator),
        'staffEmail': validator.validateEmail.bind(validator),
        'staffLogin': validator.validateLogin.bind(validator),
        'staffRole': (val) => validator.validateSelect(val, 'Должность')
    };
    if (!staffId || password) {
        validationFields['staffPassword'] = (val) => validator.validatePassword(val, 'Пароль');
    }
    const isValid = validator.validateForm(validationFields);
    if (!isValid) {
        showAlert('Пожалуйста, исправьте ошибки в форме');
        return;
    }
    const existingUserByEmail = window.db.getUserByEmail(email);
    const existingUserByLogin = window.db.getUserByLogin(login);
    if (staffId) {
        if (existingUserByEmail && existingUserByEmail.id !== parseInt(staffId)) {
            showAlert('Пользователь с таким email уже существует');
            return;
        }
        if (existingUserByLogin && existingUserByLogin.id !== parseInt(staffId)) {
            showAlert('Пользователь с таким логином уже существует');
            return;
        }
    } else {
        if (existingUserByEmail) {
            showAlert('Пользователь с таким email уже существует');
            return;
        }
        if (existingUserByLogin) {
            showAlert('Пользователь с таким логином уже существует');
            return;
        }
    }
    const staffData = {
        name: name,
        email: email,
        login: login,
        role_id: roleId
    };
    if (password) {
        staffData.password = password;
    }
    if (staffId) {
        const existingUser = window.db.findById('users', parseInt(staffId));
        if (!password && existingUser && existingUser.password) {
            staffData.password = existingUser.password; 
        }
        await window.db.update('users', parseInt(staffId), staffData);
        showAlert('Сотрудник обновлен');
    } else {
        if (!password) {
            showAlert('Укажите пароль для нового сотрудника');
            return;
        }
        staffData.created_at = new Date().toISOString();
        staffData.avatar = null;
        await window.db.insert('users', staffData);
        showAlert('Сотрудник добавлен');
    }
    closeStaffModal();
    await loadStaff();
}
window.editStaff = async function(staffId) {
    await openStaffModal(staffId);
};
window.deleteStaff = async function(staffId) {
    const confirmed = await showConfirm('Вы уверены, что хотите удалить этого сотрудника?');
    if (!confirmed) {
        return;
    }
    if (!window.db || !window.db.db) {
        showAlert('Ошибка: база данных не инициализирована. Пожалуйста, обновите страницу.');
        return;
    }
    const adminRoleId = window.db.getRoleIdByKey('admin');
    const user = window.db.findById('users', staffId);
    if (user && user.role_id === adminRoleId) {
        const allAdmins = window.db.find('users', u => u.role_id === adminRoleId);
        if (allAdmins.length <= 1) {
            showAlert('Нельзя удалить последнего администратора');
            return;
        }
    }
    const userOrders = window.db.find('orders', order => order.user_id === staffId);
    if (userOrders.length > 0) {
        showAlert(`У этого сотрудника есть ${userOrders.length} заказов. Удаление невозможно.`);
        return;
    }
    await window.db.delete('users', staffId);
    showAlert('Сотрудник удален');
    await loadStaff();
};