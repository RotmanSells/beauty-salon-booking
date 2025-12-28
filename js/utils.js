// Утилиты для работы с датами и временем
export function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

export function formatTime(time) {
    if (typeof time === 'string') {
        return time;
    }
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

export function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

export function timeToMinutes(timeString) {
    const { totalMinutes } = parseTime(timeString);
    return totalMinutes;
}

export function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function addMinutes(timeString, minutes) {
    const { totalMinutes } = parseTime(timeString);
    const newTotal = totalMinutes + minutes;
    return minutesToTime(newTotal);
}

export function isTimeBetween(time, start, end) {
    const timeMins = timeToMinutes(time);
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    return timeMins >= startMins && timeMins < endMins;
}

export function getDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getDateTimeKey(date, time) {
    return `${getDateKey(date)}T${time}`;
}

export function isToday(date) {
    const today = new Date();
    return getDateKey(date) === getDateKey(today);
}

export function isPast(date, time) {
    const now = new Date();
    const bookingDate = new Date(`${getDateKey(date)}T${time}`);
    return bookingDate < now;
}

// Валидация данных
export function validatePhone(phone) {
    return /^\d{4}$/.test(phone);
}

export function validateTimeRange(start, end) {
    return timeToMinutes(start) < timeToMinutes(end);
}

// Утилиты для работы с массивами
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

export function sortBy(array, key) {
    return [...array].sort((a, b) => {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
    });
}

// Генерация временных слотов
export function generateTimeSlots(startTime, endTime, duration, breaks = []) {
    const slots = [];
    let currentTime = startTime;
    
    while (timeToMinutes(currentTime) + duration <= timeToMinutes(endTime)) {
        const slotEnd = addMinutes(currentTime, duration);
        
        // Проверяем, не попадает ли слот в перерыв
        const isInBreak = breaks.some(breakItem => {
            const breakStart = breakItem.start;
            const breakEnd = breakItem.end;
            return (isTimeBetween(currentTime, breakStart, breakEnd) ||
                   isTimeBetween(slotEnd, breakStart, breakEnd) ||
                   (timeToMinutes(currentTime) <= timeToMinutes(breakStart) &&
                    timeToMinutes(slotEnd) >= timeToMinutes(breakEnd)));
        });
        
        if (!isInBreak) {
            slots.push({
                start: currentTime,
                end: slotEnd,
                duration: duration
            });
        }
        
        // Переходим к следующему слоту (с шагом в длительность процедуры)
        currentTime = slotEnd;
    }
    
    return slots;
}

// Парсинг номеров телефонов
export function parsePhoneNumbers(input) {
    return input
        .split(/[,\s]+/)
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0)
        .map(phone => {
            // Извлекаем все цифры из номера (полный номер)
            const digits = phone.replace(/\D/g, '');
            return digits;
        })
        .filter(phone => phone.length >= 4); // Минимум 4 цифры для валидного номера
}

// Форматирование номера для отображения
export function formatPhoneDisplay(phone) {
    if (phone.length === 4) {
        return `****${phone}`;
    }
    return phone;
}

