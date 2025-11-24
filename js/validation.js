const ValidationRules = {
    email: {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: 'Введите корректный email адрес'
    },
    password: {
        minLength: 6,
        message: 'Пароль должен содержать минимум 6 символов'
    },
    name: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[а-яА-ЯёЁa-zA-Z\s-]+$/,
        message: 'Имя должно содержать минимум 2 символа и только буквы'
    },
    login: {
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_]+$/,
        message: 'Логин должен содержать от 3 до 30 символов (латиница, цифры, подчеркивание)'
    },
    price: {
        min: 0.01,
        max: 1000000,
        message: 'Цена должна быть положительным числом'
    },
    dishName: {
        minLength: 2,
        maxLength: 100,
        message: 'Название блюда должно содержать от 2 до 100 символов'
    },
    tableNumber: {
        min: 1,
        max: 1000,
        message: 'Укажите корректный номер стола (от 1 до 1000)'
    }
};
class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.errors = {};
    }
    validateEmail(value) {
        if (!value || value.trim() === '') {
            return 'Email обязателен для заполнения';
        }
        if (!ValidationRules.email.pattern.test(value)) {
            return ValidationRules.email.message;
        }
        return null;
    }
    validatePassword(value, fieldName = 'Пароль') {
        if (!value || value.trim() === '') {
            return `${fieldName} обязателен для заполнения`;
        }
        if (value.length < ValidationRules.password.minLength) {
            return ValidationRules.password.message;
        }
        return null;
    }
    validatePasswordConfirm(password, confirmPassword) {
        if (!confirmPassword || confirmPassword.trim() === '') {
            return 'Подтвердите пароль';
        }
        if (password !== confirmPassword) {
            return 'Пароли не совпадают';
        }
        return null;
    }
    validateName(value) {
        if (!value || value.trim() === '') {
            return 'Имя обязательно для заполнения';
        }
        const trimmed = value.trim();
        if (trimmed.length < ValidationRules.name.minLength) {
            return ValidationRules.name.message;
        }
        if (trimmed.length > ValidationRules.name.maxLength) {
            return `Имя не должно превышать ${ValidationRules.name.maxLength} символов`;
        }
        if (!ValidationRules.name.pattern.test(trimmed)) {
            return 'Имя должно содержать только буквы, пробелы и дефисы';
        }
        return null;
    }
    validateLogin(value) {
        if (!value || value.trim() === '') {
            return 'Логин обязателен для заполнения';
        }
        const trimmed = value.trim();
        if (trimmed.length < ValidationRules.login.minLength || trimmed.length > ValidationRules.login.maxLength) {
            return ValidationRules.login.message;
        }
        if (!ValidationRules.login.pattern.test(trimmed)) {
            return ValidationRules.login.message;
        }
        return null;
    }
    validatePrice(value) {
        if (!value || value === '') {
            return 'Цена обязательна для заполнения';
        }
        const price = parseFloat(value);
        if (isNaN(price)) {
            return 'Введите корректное число';
        }
        if (price < ValidationRules.price.min) {
            return ValidationRules.price.message;
        }
        if (price > ValidationRules.price.max) {
            return `Цена не должна превышать ${ValidationRules.price.max.toLocaleString('ru-RU')} ₽`;
        }
        return null;
    }
    validateDishName(value) {
        if (!value || value.trim() === '') {
            return 'Название блюда обязательно для заполнения';
        }
        const trimmed = value.trim();
        if (trimmed.length < ValidationRules.dishName.minLength || trimmed.length > ValidationRules.dishName.maxLength) {
            return ValidationRules.dishName.message;
        }
        return null;
    }
    validateSelect(value, fieldName = 'Поле') {
        if (!value || value === '') {
            return `${fieldName} обязательно для заполнения`;
        }
        return null;
    }
    validateTableNumber(value) {
        if (!value || value === '') {
            return 'Номер стола обязателен для заполнения';
        }
        const number = parseInt(value);
        if (isNaN(number)) {
            return 'Введите корректный номер';
        }
        if (number < ValidationRules.tableNumber.min || number > ValidationRules.tableNumber.max) {
            return ValidationRules.tableNumber.message;
        }
        return null;
    }
    showFieldError(inputId, errorMessage) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.classList.add('input-error');
        const existingError = input.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        if (errorMessage) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = errorMessage;
            input.parentElement.appendChild(errorDiv);
        }
    }
    clearFieldError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.classList.remove('input-error');
        const errorMessage = input.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
    validateForm(fields) {
        let isValid = true;
        this.errors = {};
        for (const [fieldId, validator] of Object.entries(fields)) {
            const input = document.getElementById(fieldId);
            if (!input) continue;
            const value = input.value;
            const error = validator(value);
            if (error) {
                this.errors[fieldId] = error;
                this.showFieldError(fieldId, error);
                isValid = false;
            } else {
                this.clearFieldError(fieldId);
            }
        }
        return isValid;
    }
    addRealTimeValidation(inputId, validator) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('blur', () => {
            const error = validator(input.value);
            if (error) {
                this.showFieldError(inputId, error);
            } else {
                this.clearFieldError(inputId);
            }
        });
        input.addEventListener('input', () => {
            if (input.classList.contains('input-error')) {
                const error = validator(input.value);
                if (!error) {
                    this.clearFieldError(inputId);
                }
            }
        });
    }
}
window.isValidEmail = function(email) {
    return ValidationRules.email.pattern.test(email);
};
window.isValidPassword = function(password) {
    return password && password.length >= ValidationRules.password.minLength;
};
if (typeof window !== 'undefined') {
    window.FormValidator = FormValidator;
    window.ValidationRules = ValidationRules;
}