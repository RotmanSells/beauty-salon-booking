// Управление модальными окнами и UI компонентами

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
    document.body.style.overflow = '';
}

// Инициализация обработчиков модальных окон
export function initModals() {
    // Закрытие по клику вне модального окна
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Не закрываем модальное окно, если клик был на select, option или других интерактивных элементах
            const target = e.target;
            if (target.closest('select') || 
                target.closest('option') || 
                target.closest('.form-select') ||
                target.closest('.modal-content') && target !== modal) {
                return;
            }
            // Закрываем только если клик был на самом фоне модального окна
            if (target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Управление цифровой клавиатурой
export function initNumberKeypad(onInput, onClear) {
    const keypad = document.getElementById('numberKeypad');
    if (!keypad) return;
    
    const phoneInput = document.getElementById('phoneInput');
    if (!phoneInput) return;
    
    // Обработчики для цифр
    keypad.querySelectorAll('.keypad-btn[data-number]').forEach(btn => {
        btn.addEventListener('click', () => {
            const number = btn.getAttribute('data-number');
            const currentValue = phoneInput.value.replace(/\D/g, '');
            if (currentValue.length < 4) {
                const newValue = currentValue + number;
                phoneInput.value = newValue;
                if (onInput) onInput(newValue);
            }
        });
    });
    
    // Обработчик для очистки
    const clearBtn = document.getElementById('keypadClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            phoneInput.value = '';
            if (onClear) onClear();
        });
    }
    
    // Обработчик для backspace (удаление последней цифры)
    phoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            const currentValue = phoneInput.value.replace(/\D/g, '');
            phoneInput.value = currentValue.slice(0, -1);
            if (onClear && phoneInput.value === '') onClear();
        }
    });
}

// Обновление списка процедур в виде кнопок
export function updateProcedureButtons(containerId, procedures) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (procedures.length === 0) {
        container.innerHTML = '<div class="no-procedures">Нет доступных процедур</div>';
        return;
    }
    
    procedures.forEach(procedure => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'procedure-btn';
        button.setAttribute('data-procedure-id', procedure.id);
        button.innerHTML = `
            <span class="procedure-name">${procedure.name}</span>
        `;
        
        button.addEventListener('click', () => {
            // Снимаем выделение с других кнопок
            document.querySelectorAll('.procedure-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Выделяем текущую кнопку
            button.classList.add('selected');
        });
        
        container.appendChild(button);
    });
}

// Отображение записей на сегодня
export function renderTodayBookings(bookings, onEdit, onCall, onDelete) {
    const container = document.getElementById('bookingsList');
    if (!container) return;
    
    if (bookings.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">Нет записей на сегодня</p>';
        return;
    }
    
    container.innerHTML = bookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <div class="booking-time">${booking.time} - ${booking.procedure}</div>
                <div class="booking-details">
                    ${booking.serviceType === 'massage' ? 'Массаж' : 'Лазер'} | 
                    Телефон: ****${booking.phone}
                </div>
            </div>
            <div class="booking-actions">
                <button class="btn-icon" onclick="window.editBooking('${booking.id}')" title="Редактировать">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon" onclick="window.callClient('${booking.phone}')" title="Позвонить">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </button>
                <button class="btn-icon danger" onclick="window.deleteBooking('${booking.id}')" title="Удалить">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Сохраняем функции в глобальной области для вызова из HTML
    window.editBooking = onEdit;
    window.callClient = onCall;
    window.deleteBooking = onDelete;
}

// Отображение списка клиентов
export function renderClientsList(clients, onDelete) {
    const container = document.getElementById('clientsList');
    if (!container) return;
    
    if (clients.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">Нет клиентов</p>';
        return;
    }
    
    container.innerHTML = clients.map(client => `
        <div class="client-item">
            <span>${client.phone || ''}</span>
            <button class="btn-icon danger" onclick="window.deleteClient('${client.id}')" title="Удалить">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    window.deleteClient = onDelete;
}

// Отображение списка процедур в настройках
export function renderProceduresList(containerId, procedures, onUpdate, onDelete) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Сохраняем данные для доступа в глобальных функциях
    if (!window.proceduresData) {
        window.proceduresData = {};
    }
    window.proceduresData[containerId] = {
        procedures: procedures,
        onUpdate: onUpdate,
        onDelete: onDelete,
        containerId: containerId
    };
    
    container.innerHTML = procedures.map(procedure => `
        <div class="procedure-item">
            <input type="text" value="${procedure.name}" 
                   onchange="window.updateProcedure('${containerId}', '${procedure.id}', 'name', this.value)"
                   placeholder="Название процедуры">
            <button class="btn-icon danger" onclick="window.deleteProcedure('${containerId}', '${procedure.id}')" title="Удалить">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    window.updateProcedure = (containerId, id, field, value) => {
        const data = window.proceduresData[containerId];
        if (!data) return;
        
        const procedure = data.procedures.find(p => p.id === id);
        if (procedure) {
            procedure[field] = field === 'duration' ? value : value;
            data.onUpdate(data.procedures);
        }
    };
    
    window.deleteProcedure = async (containerId, id) => {
        const data = window.proceduresData[containerId];
        if (!data) return;
        
        // Сохраняем оригинальный массив для отката
        const originalProcedures = [...data.procedures];
        const deletedProcedure = originalProcedures.find(p => p.id === id);
        
        // Удаляем локально сразу для мгновенного отклика
        const filtered = data.procedures.filter(p => p.id !== id);
        // Обновляем данные
        data.procedures = filtered;
        // Обновляем UI сразу
        renderProceduresList(containerId, filtered, data.onUpdate, data.onDelete);
        // Сохраняем в фоне
        data.onUpdate(filtered).catch(error => {
            console.error('Ошибка удаления процедуры:', error);
            // Откатываем при ошибке
            data.procedures = originalProcedures;
            renderProceduresList(containerId, originalProcedures, data.onUpdate, data.onDelete);
        });
    };
}

// Отображение перерывов
export function renderBreaksList(breaks, onUpdate, onDelete) {
    const container = document.getElementById('breaksList');
    if (!container) return;
    
    container.innerHTML = breaks.map((breakItem, index) => `
        <div class="form-group break-item-form">
            <label>Перерыв ${index + 1}:</label>
            <div class="time-range">
                <input type="time" class="form-time break-start-${index}" value="${breakItem.start}">
                <span>–</span>
                <input type="time" class="form-time break-end-${index}" value="${breakItem.end}">
            </div>
            <div class="break-actions">
                <button class="btn btn-primary break-save-${index}" onclick="window.saveBreak(${index})">Сохранить</button>
                <button class="btn btn-secondary break-delete-${index}" onclick="window.deleteBreak(${index})">Удалить</button>
            </div>
        </div>
    `).join('');
    
    // Сохранение перерыва
    window.saveBreak = (index) => {
        const startInput = container.querySelector(`.break-start-${index}`);
        const endInput = container.querySelector(`.break-end-${index}`);
        if (startInput && endInput) {
            breaks[index].start = startInput.value;
            breaks[index].end = endInput.value;
            onUpdate(breaks);
        }
    };
    
    window.deleteBreak = (index) => {
        breaks.splice(index, 1);
        onUpdate(breaks);
    };
}

// Управление вкладками
export function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Убираем активный класс у всех кнопок и контента
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс выбранным
            btn.classList.add('active');
            const targetContent = document.getElementById(`tab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

