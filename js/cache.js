// Система кэширования данных в localStorage

const CACHE_KEYS = {
    PROCEDURES: 'salon_procedures',
    CLIENTS: 'salon_clients',
    SETTINGS: 'salon_settings',
    BOOKINGS: 'salon_bookings',
    CACHE_TIMESTAMP: 'salon_cache_timestamp'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут в миллисекундах

// Проверка, не устарел ли кэш
function isCacheValid(timestamp) {
    if (!timestamp) return false;
    const now = Date.now();
    return (now - timestamp) < CACHE_DURATION;
}

// Сохранение данных в кэш
export function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, JSON.stringify({
            [key]: Date.now()
        }));
    } catch (error) {
        console.warn('Ошибка сохранения в кэш:', error);
    }
}

// Загрузка данных из кэша
export function loadFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const timestampData = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
        
        if (timestampData) {
            const timestamps = JSON.parse(timestampData);
            if (isCacheValid(timestamps[key])) {
                return data;
            }
        }
        
        return data; // Возвращаем даже устаревший кэш как fallback
    } catch (error) {
        console.warn('Ошибка загрузки из кэша:', error);
        return null;
    }
}

// Сохранение процедур
export function cacheProcedures(procedures) {
    saveToCache(CACHE_KEYS.PROCEDURES, procedures);
}

// Загрузка процедур из кэша
export function getCachedProcedures() {
    return loadFromCache(CACHE_KEYS.PROCEDURES);
}

// Сохранение клиентов
export function cacheClients(clients) {
    saveToCache(CACHE_KEYS.CLIENTS, clients);
}

// Загрузка клиентов из кэша
export function getCachedClients() {
    return loadFromCache(CACHE_KEYS.CLIENTS);
}

// Сохранение настроек
export function cacheSettings(settings) {
    saveToCache(CACHE_KEYS.SETTINGS, settings);
}

// Загрузка настроек из кэша
export function getCachedSettings() {
    return loadFromCache(CACHE_KEYS.SETTINGS);
}

// Сохранение записей
export function cacheBookings(bookings) {
    saveToCache(CACHE_KEYS.BOOKINGS, bookings);
}

// Загрузка записей из кэша
export function getCachedBookings() {
    return loadFromCache(CACHE_KEYS.BOOKINGS);
}

// Очистка всего кэша
export function clearCache() {
    try {
        Object.values(CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.warn('Ошибка очистки кэша:', error);
    }
}

// Очистка конкретного ключа
export function clearCacheKey(key) {
    try {
        localStorage.removeItem(key);
        const timestampData = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
        if (timestampData) {
            const timestamps = JSON.parse(timestampData);
            delete timestamps[key];
            localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, JSON.stringify(timestamps));
        }
    } catch (error) {
        console.warn('Ошибка очистки ключа кэша:', error);
    }
}

