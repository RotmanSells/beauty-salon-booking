// Логика календаря и временных слотов (мобильная версия)

import { 
    formatDate, 
    getDateKey, 
    generateTimeSlots, 
    isTimeBetween,
    timeToMinutes,
    addMinutes,
    isToday
} from './utils.js';

let currentDate = new Date();
let currentServiceType = 'all'; // Используем все процедуры
let bookings = [];
let settings = null;
let procedures = { massage: [], laser: [] };
let selectedSlot = null;
let currentFilter = 'free'; // 'free' или 'busy'
let daysToShow = 30; // Количество дней для отображения (месяц)

// Экспортируем функцию для обновления данных о записях
export function updateBookings(newBookings) {
    bookings = newBookings;
    renderDaysSlots();
}

// Экспортируем для глобального доступа
window.updateCalendarBookings = updateBookings;

export function setServiceType(type) {
    currentServiceType = type;
    selectedSlot = null;
    renderDaysSlots();
}

export function getCurrentDate() {
    return currentDate;
}

export function setCurrentDate(date) {
    currentDate = new Date(date);
    selectedSlot = null;
    renderDaysSlots();
    updateHeaderDate();
}

export async function loadData() {
    try {
        const { getBookings: getBookingsData, getSettings: getSettingsData, getProcedures: getProceduresData } = await import('./googleSheets.js');
        const [bookingsData, settingsData, proceduresData] = await Promise.all([
            getBookingsData(),
            getSettingsData(),
            getProceduresData()
        ]);
        bookings = bookingsData;
        settings = settingsData || { workStart: '09:00', workEnd: '21:00', breaks: [] };
        procedures = proceduresData;
        renderDaysSlots();
        updateHeaderDate();
        
        // Обновляем календарь в других модулях
        if (window.updateCalendarBookings) {
            window.updateCalendarBookings(bookings);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // В случае ошибки используем дефолтные настройки
        if (!settings) {
            settings = { workStart: '09:00', workEnd: '21:00', breaks: [] };
            renderDaysSlots();
        }
    }
}

export function refreshCalendar() {
    // Обновляем календарь с текущими настройками
    renderDaysSlots();
    updateHeaderDate();
}

// Функция для обновления настроек извне
export function updateCalendarSettings(newSettings) {
    settings = newSettings;
    renderDaysSlots();
}

// Экспортируем для глобального доступа
window.updateCalendarSettings = updateCalendarSettings;

export function setFilter(filter) {
    currentFilter = filter;
    renderDaysSlots();
}

// Экспортируем для глобального доступа
window.refreshCalendar = refreshCalendar;

function updateHeaderDate() {
    const headerDate = document.getElementById('headerDate');
    if (!headerDate) return;
    
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    headerDate.textContent = `${month} ${day}`;
}

function renderDaysSlots() {
    const container = document.getElementById('daysContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Используем дефолтные настройки, если еще не загружены
    const workStart = settings?.workStart || '09:00';
    const workEnd = settings?.workEnd || '21:00';
    const breaks = settings?.breaks || [];
    
    // Все процедуры длятся 1 час (60 минут)
    const minDuration = 60;
    
    // Генерируем дни для отображения
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < daysToShow; i++) {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() + i);
        const dateKey = getDateKey(dayDate);
        
        const dayBookings = bookings.filter(b => {
            const bookingDateKey = getDateKey(new Date(b.date));
            return bookingDateKey === dateKey && b.status === 'active';
        });
        
        const slots = generateTimeSlots(workStart, workEnd, minDuration, breaks);
        
        // Фильтруем слоты в зависимости от выбранного фильтра
        let filteredSlots = [];
        if (currentFilter === 'free') {
            filteredSlots = slots.filter(slot => {
                const isBooked = dayBookings.some(b => b.time === slot.start);
                const isBreak = breaks.some(breakItem => 
                    isTimeBetween(slot.start, breakItem.start, breakItem.end)
                );
                return !isBooked && !isBreak;
            });
        } else {
            filteredSlots = slots.filter(slot => {
                const isBooked = dayBookings.some(b => b.time === slot.start);
                return isBooked;
            });
        }
        
        // Показываем день только если есть слоты для отображения
        if (filteredSlots.length === 0) continue;
        
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label';
        if (i === 0) {
            dayLabel.classList.add('today');
            dayLabel.textContent = 'Сегодня';
        } else {
            const day = dayDate.getDate();
            const monthNames = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
            const month = monthNames[dayDate.getMonth()];
            dayLabel.textContent = `${day} ${month}`;
        }
        
        dayHeader.appendChild(dayLabel);
        daySection.appendChild(dayHeader);
        
        const gridElement = document.createElement('div');
        gridElement.className = 'time-slots-grid';
        
        filteredSlots.forEach(slot => {
            const booking = dayBookings.find(b => b.time === slot.start);
            const isBooked = !!booking;
            const isBreak = breaks.some(breakItem => 
                isTimeBetween(slot.start, breakItem.start, breakItem.end)
            );
            const isSelected = selectedSlot && selectedSlot.date === dateKey && selectedSlot.time === slot.start;
            
            const slotElement = document.createElement('div');
            
            if (currentFilter === 'busy' && isBooked) {
                slotElement.className = 'time-slot busy';
            } else if (isBreak) {
                slotElement.className = 'time-slot break';
            } else if (isSelected) {
                slotElement.className = 'time-slot selected';
            } else {
                slotElement.className = 'time-slot available';
            }
            
            const timeSpan = document.createElement('span');
            timeSpan.textContent = slot.start;
            slotElement.appendChild(timeSpan);
            
            // Для занятых слотов добавляем информацию о записи
            if (currentFilter === 'busy' && isBooked && booking) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'slot-booking-info';
                infoDiv.style.cssText = 'font-size: 9px; margin-top: 2px; opacity: 0.9; line-height: 1.2;';
                infoDiv.textContent = `${booking.procedure || ''}`;
                slotElement.appendChild(infoDiv);
                
                const phoneDiv = document.createElement('div');
                phoneDiv.className = 'slot-booking-phone';
                phoneDiv.style.cssText = 'font-size: 8px; margin-top: 1px; opacity: 0.8;';
                phoneDiv.textContent = `****${booking.phone || ''}`;
                slotElement.appendChild(phoneDiv);
                
                // Добавляем обработчик клика для редактирования
                slotElement.style.cursor = 'pointer';
                slotElement.addEventListener('click', () => {
                    if (window.openEditModal && booking) {
                        window.openEditModal(booking);
                    }
                });
            }
            
            // Для свободных слотов - обработчик создания записи
            if (!isBooked && !isBreak && currentFilter === 'free') {
                slotElement.addEventListener('click', () => {
                    // Снимаем выделение с предыдущего слота
                    document.querySelectorAll('.time-slot.selected').forEach(s => {
                        if (s !== slotElement) {
                            s.className = 'time-slot available';
                        }
                    });
                    
                    // Выделяем текущий слот
                    if (isSelected) {
                        selectedSlot = null;
                        slotElement.className = 'time-slot available';
                    } else {
                        selectedSlot = { date: dateKey, time: slot.start, duration: slot.duration };
                        slotElement.className = 'time-slot selected';
                        
                        // Открываем модальное окно записи
                        if (window.openBookingModal) {
                            setTimeout(() => {
                                window.openBookingModal(dateKey, slot.start, slot.duration);
                            }, 100);
                        }
                    }
                });
            }
            
            gridElement.appendChild(slotElement);
        });
        
        daySection.appendChild(gridElement);
        container.appendChild(daySection);
    }
}


// Экспортируем функцию для открытия модального окна записи
export function setOpenBookingModalCallback(callback) {
    window.openBookingModal = callback;
}

// Инициализация календаря (мобильная версия)
export function initCalendar() {
    // Инициализация переключателя свободные/занятые
    const btnFree = document.getElementById('btnFreeSlots');
    const btnBusy = document.getElementById('btnBusySlots');
    
    if (btnFree) {
        btnFree.addEventListener('click', () => {
            document.querySelectorAll('.toggle-slot-btn').forEach(b => b.classList.remove('active'));
            btnFree.classList.add('active');
            setFilter('free');
        });
    }
    
    if (btnBusy) {
        btnBusy.addEventListener('click', () => {
            document.querySelectorAll('.toggle-slot-btn').forEach(b => b.classList.remove('active'));
            btnBusy.classList.add('active');
            setFilter('busy');
        });
    }
    
    // Устанавливаем текущую дату
    currentDate = new Date();
    updateHeaderDate();
    
    // Показываем календарь сразу с дефолтными настройками
    settings = { workStart: '09:00', workEnd: '21:00', breaks: [] };
    renderDaysSlots();
    
    // Загружаем данные в фоне и обновляем календарь после загрузки
    loadData();
}

