// Управление записями

import { 
    getDateKey, 
    isToday, 
    isPast, 
    validatePhone,
    sortBy
} from './utils.js';
import { 
    getBookings, 
    createBooking, 
    updateBooking, 
    deleteBooking,
    getClients
} from './googleSheets.js';

let bookings = [];
let clients = [];

// Загрузка из кэша при инициализации
(async () => {
    try {
        const { getCachedBookings, getCachedClients } = await import('./cache.js');
        const cachedBookings = getCachedBookings();
        const cachedClients = getCachedClients();
        
        if (cachedBookings) bookings = cachedBookings;
        if (cachedClients) clients = cachedClients;
        
        // Обновляем календарь сразу, если есть кэш
        if (cachedBookings && window.updateCalendarBookings) {
            window.updateCalendarBookings(bookings);
        }
    } catch (error) {
        // Игнорируем ошибки при загрузке кэша
    }
})();

export async function loadBookings() {
    try {
        bookings = await getBookings();
        clients = await getClients();
        // Кэш уже обновлен в googleSheets.js
        updateTodayBookings();
        return bookings;
    } catch (error) {
        console.error('Ошибка загрузки записей:', error);
        // Пытаемся загрузить из кэша
        try {
            const { getCachedBookings, getCachedClients } = await import('./cache.js');
            const cachedBookings = getCachedBookings();
            const cachedClients = getCachedClients();
            if (cachedBookings) bookings = cachedBookings;
            if (cachedClients) clients = cachedClients;
            updateTodayBookings();
        } catch (e) {
            // Игнорируем ошибки кэша
        }
        return bookings;
    }
}

export function getBookingsList() {
    return bookings;
}

export function getTodayBookings() {
    const today = new Date();
    const todayKey = getDateKey(today);
    
    return bookings
        .filter(booking => {
            const bookingDateKey = getDateKey(new Date(booking.date));
            return bookingDateKey === todayKey && booking.status === 'active';
        })
        .filter(booking => !isPast(booking.date, booking.time))
        .sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
}

function updateTodayBookings() {
    // Панель записей на сегодня удалена, записи видны в разделе "Занятые"
    // Оставляем функцию для совместимости, но ничего не рендерим
}

// Автоматическое перемещение в архив
export function archivePastBookings() {
    const now = new Date();
    let updated = false;
    
    bookings.forEach(booking => {
        if (booking.status === 'active' && isPast(booking.date, booking.time)) {
            booking.status = 'archived';
            updated = true;
        }
    });
    
    if (updated) {
        updateTodayBookings();
    }
}

// Проверка доступности времени
export function isTimeAvailable(date, time, serviceType, procedure, excludeBookingId = null) {
    const dateKey = getDateKey(new Date(date));
    
    // Проверяем, не занято ли это время другой записью
    const conflictingBooking = bookings.find(booking => {
        if (excludeBookingId && booking.id === excludeBookingId) return false;
        const bookingDateKey = getDateKey(new Date(booking.date));
        return bookingDateKey === dateKey && 
               booking.time === time && 
               booking.status === 'active';
    });
    
    return !conflictingBooking;
}

// Создание записи
export async function createNewBooking(bookingData) {
    const { date, time, serviceType, procedure, phone } = bookingData;
    
    // Валидация
    if (!validatePhone(phone)) {
        throw new Error('Номер телефона должен содержать 4 цифры');
    }
    
    if (!isTimeAvailable(date, time, serviceType, procedure)) {
        throw new Error('Это время уже занято');
    }
    
    try {
        const newBooking = await createBooking({
            date,
            time,
            serviceType,
            procedure,
            phone
        });
        
        bookings.push(newBooking);
        updateTodayBookings();
        
        // Обновляем календарь с новыми данными о записях
        if (window.updateCalendarBookings) {
            window.updateCalendarBookings(bookings);
        }
        
        return newBooking;
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        throw error;
    }
}

// Редактирование записи
export async function editBooking(bookingId, updates) {
    try {
        const updatedBooking = await updateBooking(bookingId, updates);
        
        if (!updatedBooking) {
            throw new Error('Не удалось обновить запись');
        }
        
        // Обновляем локальный массив bookings
        const index = bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
            // Сохраняем все поля существующей записи и обновляем только измененные
            bookings[index] = { ...bookings[index], ...updates };
        } else {
            // Если запись не найдена локально, добавляем её
            bookings.push(updatedBooking);
        }
        
        // Обновляем отображение
        updateTodayBookings();
        
        // Обновляем календарь с копией массива для гарантии обновления
        if (window.updateCalendarBookings) {
            window.updateCalendarBookings([...bookings]);
        }
        
        return updatedBooking;
    } catch (error) {
        console.error('Ошибка редактирования записи:', error);
        throw error;
    }
}

// Удаление записи
export async function handleDeleteBooking(bookingId) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }
    
    try {
        await deleteBooking(bookingId);
        bookings = bookings.filter(b => b.id !== bookingId);
        updateTodayBookings();
        if (window.updateCalendarBookings) {
            window.updateCalendarBookings(bookings);
        }
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
    }
}

// Обработчик редактирования
export function handleEditBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Открываем модальное окно редактирования
    if (window.openEditModal) {
        window.openEditModal(booking);
    }
}

// Функция для открытия модального окна редактирования по объекту записи
export function openEditModalByBooking(booking) {
    if (window.openEditModal) {
        window.openEditModal(booking);
    }
}

// Экспортируем для глобального доступа
window.openEditModal = openEditModalByBooking;

// Поиск клиента по номеру телефона
export function findClientByPhone(phone) {
    return clients.find(client => {
        const clientPhone = client.phone.replace(/\D/g, '');
        const searchPhone = phone.replace(/\D/g, '');
        return clientPhone.slice(-4) === searchPhone.slice(-4);
    });
}

// Обработчик звонка клиенту
export function handleCallClient(phone) {
    const client = findClientByPhone(phone);
    
    if (client && client.phone && client.phone.length > 4) {
        // Если есть полный номер, открываем ссылку для звонка
        const phoneLink = `tel:${client.phone}`;
        window.location.href = phoneLink;
    }
}

// Инициализация
export function initBookings() {
    loadBookings();
    
    // Автоматическое обновление каждую минуту
    setInterval(() => {
        archivePastBookings();
    }, 60000);
    
    // Обновление при загрузке страницы
    archivePastBookings();
}

// Экспортируем функции для использования в других модулях
export function setOpenEditModalCallback(callback) {
    window.openEditModal = callback;
}

