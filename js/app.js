// Главный файл приложения

import { initModals, openModal, closeModal, closeAllModals, initNumberKeypad, updateProcedureButtons, initTabs } from './ui.js';
import { initCalendar, setOpenBookingModalCallback } from './calendar.js';
import { 
    initBookings, 
    createNewBooking, 
    loadBookings,
    setOpenEditModalCallback
} from './bookings.js';
import { 
    loadSettings, 
    getProceduresByType,
    getSettingsData,
    initSettings
} from './settings.js';
import { validatePhone } from './utils.js';

// Глобальное состояние
let currentBookingDate = null;
let currentBookingTime = null;
let currentBookingDuration = null;
let currentEditingBooking = null;

// Инициализация приложения
async function init() {
    // Инициализация UI
    initModals();
    initTabs();
    
    // Инициализация обработчиков
    initBookingModal();
    initEditModal();
    initSettingsModal();
    
    // Загрузка данных
    await loadSettings();
    await loadBookings();
    
    // Инициализация модулей
    initCalendar();
    initBookings();
    initSettings();
    
    // Настройка callback'ов
    setOpenBookingModalCallback(openBookingModalHandler);
    setOpenEditModalCallback(openEditModalHandler);
}

// Переключатель услуг
function initServiceToggle() {
    const serviceButtons = document.querySelectorAll('.service-btn');
    serviceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            serviceButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const serviceType = btn.getAttribute('data-service');
            setServiceType(serviceType);
        });
    });
}

// Модальное окно записи
function initBookingModal() {
    const modal = document.getElementById('bookingModal');
    const closeBtn = document.getElementById('closeBookingModal');
    const cancelBtn = document.getElementById('cancelBooking');
    const confirmBtn = document.getElementById('confirmBooking');
    const phoneInput = document.getElementById('phoneInput');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('bookingModal'));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('bookingModal'));
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmBooking);
    }
    
    // Инициализация цифровой клавиатуры
    initNumberKeypad(
        (value) => {
            // Обновление при вводе
        },
        () => {
            // Очистка
        }
    );
    
    // Обновление списка процедур при изменении типа услуги будет происходить при открытии модального окна
}


// Обработчик открытия модального окна записи
async function openBookingModalHandler(date, time, duration) {
    currentBookingDate = date;
    currentBookingTime = time;
    currentBookingDuration = duration;
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = `Запись на ${date} в ${time}`;
    }
    
    // Загружаем процедуры для обеих категорий
    const massageProcedures = await getProceduresByType('massage');
    const laserProcedures = await getProceduresByType('laser');
    updateProcedureButtons('massageProceduresButtons', massageProcedures);
    updateProcedureButtons('laserProceduresButtons', laserProcedures);
    
    // Сбрасываем выбор процедуры
    document.querySelectorAll('.procedure-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Очищаем поля
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        phoneInput.value = '';
    }
    
    openModal('bookingModal');
}

// Обработчик подтверждения записи
async function handleConfirmBooking() {
    const selectedProcedureBtn = document.querySelector('.procedure-btn.selected');
    const phoneInput = document.getElementById('phoneInput');
    
    if (!selectedProcedureBtn || !phoneInput) {
        alert('Выберите процедуру');
        return;
    }
    
    const procedureId = selectedProcedureBtn.getAttribute('data-procedure-id');
    const phone = phoneInput.value.replace(/\D/g, '');
    
    if (!procedureId) {
        alert('Выберите процедуру');
        return;
    }
    
    if (!validatePhone(phone)) {
        alert('Введите 4 последние цифры номера телефона');
        return;
    }
    
    // Получаем информацию о процедуре из всех процедур
    const allProcedures = await getProceduresByType('all');
    const procedure = allProcedures.find(p => p.id === procedureId);
    
    if (!procedure) {
        alert('Процедура не найдена');
        return;
    }
    
    try {
        // Определяем тип услуги по процедуре
        const massageProcedures = await getProceduresByType('massage');
        const isMassage = massageProcedures.some(p => p.id === procedureId);
        const serviceType = isMassage ? 'massage' : 'laser';
        
        const newBooking = await createNewBooking({
            date: currentBookingDate,
            time: currentBookingTime,
            serviceType: serviceType,
            procedure: procedure.name,
            phone: phone
        });
        
        // Сбрасываем выбранный слот
        selectedSlot = null;
        
        closeModal('bookingModal');
        
        // Показываем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--gradient-primary);
            color: white;
            padding: 12px 24px;
            border-radius: var(--radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = 'Запись создана успешно!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
        
        // Обновляем календарь
        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
    } catch (error) {
        alert(error.message || 'Ошибка при создании записи');
    }
}

// Модальное окно редактирования
function initEditModal() {
    const modal = document.getElementById('editBookingModal');
    const closeBtn = document.getElementById('closeEditModal');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveEdit');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('editBookingModal'));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal('editBookingModal'));
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveEdit);
    }
    
    // Предотвращаем открытие других модальных окон при клике внутри модального окна редактирования
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Если клик был на select или его дочерних элементах, не закрываем модальное окно
            const target = e.target;
            if (target.closest('.procedure-btn') || target.closest('.procedures-selection')) {
                e.stopPropagation();
                return;
            }
            // Если клик был на самом модальном окне (фон), закрываем его
            if (target === modal) {
                closeModal('editBookingModal');
            }
        });
    }
}

async function openEditModalHandler(booking) {
    // Закрываем все другие модальные окна перед открытием редактирования
    closeAllModals();
    
    currentEditingBooking = booking;
    
    const phoneDisplay = document.getElementById('editPhoneDisplay');
    const btnCall = document.getElementById('btnCallClient');
    
    if (!phoneDisplay) return;
    
    // Загружаем процедуры для обеих категорий
    const massageProcedures = await getProceduresByType('massage');
    const laserProcedures = await getProceduresByType('laser');
    updateProcedureButtons('editMassageProceduresButtons', massageProcedures);
    updateProcedureButtons('editLaserProceduresButtons', laserProcedures);
    
    // Выделяем выбранную процедуру
    const allProcedures = [...massageProcedures, ...laserProcedures];
    const selectedProcedure = allProcedures.find(p => p.name === booking.procedure);
    if (selectedProcedure) {
        setTimeout(() => {
            const selectedBtn = document.querySelector(`[data-procedure-id="${selectedProcedure.id}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }
        }, 100);
    }
    
    // Отображаем последние 4 цифры
    phoneDisplay.textContent = `****${booking.phone || ''}`;
    
    // Сохраняем booking для кнопки звонка
    if (btnCall) {
        btnCall.onclick = () => {
            handleCallFromEdit(booking.phone);
        };
    }
    
    // Небольшая задержка перед открытием, чтобы убедиться, что другие модальные окна закрыты
    setTimeout(() => {
        openModal('editBookingModal');
    }, 100);
}

async function handleCallFromEdit(phoneLast4) {
    try {
        const { getClients } = await import('./googleSheets.js');
        const clients = await getClients();
        const client = clients.find(c => {
            const clientPhone = c.phone.replace(/\D/g, '');
            const searchPhone = phoneLast4.replace(/\D/g, '');
            return clientPhone.slice(-4) === searchPhone.slice(-4);
        });
        
        if (client && client.phone && client.phone.length > 4) {
            window.location.href = `tel:${client.phone}`;
        } else {
            alert(`Клиент найден, но полный номер не указан. Последние 4 цифры: ${phoneLast4}`);
        }
    } catch (error) {
        console.error('Ошибка при поиске клиента:', error);
        alert('Ошибка при поиске номера телефона');
    }
}

async function handleSaveEdit() {
    if (!currentEditingBooking) return;
    
    const selectedProcedureBtn = document.querySelector('.procedure-btn.selected');
    
    if (!selectedProcedureBtn) {
        alert('Выберите процедуру');
        return;
    }
    
    const procedureId = selectedProcedureBtn.getAttribute('data-procedure-id');
    
    if (!procedureId) {
        alert('Выберите процедуру');
        return;
    }
    
    // Получаем информацию о процедуре из всех процедур
    const allProcedures = await getProceduresByType('all');
    const procedure = allProcedures.find(p => p.id === procedureId);
    
    if (!procedure) {
        alert('Процедура не найдена');
        return;
    }
    
    try {
        // Определяем тип услуги по процедуре
        const massageProcedures = await getProceduresByType('massage');
        const isMassage = massageProcedures.some(p => p.id === procedureId);
        const serviceType = isMassage ? 'massage' : 'laser';
        
        const { editBooking, loadBookings } = await import('./bookings.js');
        await editBooking(currentEditingBooking.id, {
            procedure: procedure.name,
            serviceType: serviceType
        });
        
        // Перезагружаем все записи для синхронизации
        await loadBookings();
        
        // Обновляем календарь
        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
        
        currentEditingBooking = null;
        closeModal('editBookingModal');
        
        // Показываем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--gradient-primary);
            color: white;
            padding: 12px 24px;
            border-radius: var(--radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = 'Запись обновлена успешно!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    } catch (error) {
        alert(error.message || 'Ошибка при обновлении записи');
    }
}

// Модальное окно настроек
function initSettingsModal() {
    const btnSettings = document.getElementById('btnSettings');
    const closeBtn = document.getElementById('closeSettingsModal');
    
    if (btnSettings) {
        btnSettings.addEventListener('click', async () => {
            await loadSettings();
            openModal('settingsModal');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModal('settingsModal');
            if (window.refreshCalendar) window.refreshCalendar();
        });
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);

// Экспортируем функции для глобального использования
window.openBookingModal = openBookingModalHandler;

