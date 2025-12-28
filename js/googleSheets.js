// Интеграция с Google Apps Script
// URL веб-приложения Apps Script

const scriptUrl = 'https://script.google.com/macros/s/AKfycbzu5qYHQwwq73LklJ_CjLn51CGEmNERTWWTv9rp0H5Z6UzjUnEvmoXmQhIVydWU3sxZ/exec';

export function setScriptUrl(url) {
    // URL установлен по умолчанию, но можно переопределить при необходимости
    console.warn('setScriptUrl: URL уже установлен по умолчанию. Используйте прямой вызов для изменения.');
}

export function getScriptUrl() {
    return scriptUrl;
}

// Базовые функции для работы с Google Sheets через Apps Script
async function callScript(functionName, params = {}, useGet = false) {
    try {
        let response;
        
        if (useGet) {
            // Используем GET для операций чтения (не требует preflight)
            const urlParams = new URLSearchParams({
                action: functionName,
                ...Object.keys(params).reduce((acc, key) => {
                    if (params[key] !== undefined && params[key] !== null) {
                        acc[key] = typeof params[key] === 'object' 
                            ? JSON.stringify(params[key]) 
                            : params[key];
                    }
                    return acc;
                }, {})
            });
            
            response = await fetch(`${scriptUrl}?${urlParams.toString()}`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
        } else {
            // Используем POST для операций записи
            response = await fetch(scriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: functionName,
                    ...params
                })
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Ошибка при выполнении операции');
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка при вызове Google Apps Script:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с записями
export async function getBookings() {
    try {
        // Пытаемся загрузить из кэша сначала
        const { getCachedBookings, cacheBookings } = await import('./cache.js');
        const cached = getCachedBookings();
        if (cached) {
            // Загружаем свежие данные в фоне
            callScript('getBookings', {}, true).then(result => {
                if (result && result.data) {
                    cacheBookings(result.data);
                }
            }).catch(() => {}); // Игнорируем ошибки фоновой загрузки
            return cached;
        }
        
        const result = await callScript('getBookings', {}, true); // Используем GET
        const data = result.data || [];
        cacheBookings(data);
        return data;
    } catch (error) {
        console.error('Ошибка получения записей:', error);
        // Пытаемся вернуть из кэша даже при ошибке
        const { getCachedBookings } = await import('./cache.js');
        const cached = getCachedBookings();
        return cached || [];
    }
}

export async function createBooking(booking) {
    try {
        const result = await callScript('createBooking', booking, true); // Используем GET
        const data = result.data || null;
        if (data) {
            // Обновляем кэш
            const { getCachedBookings, cacheBookings } = await import('./cache.js');
            const cached = getCachedBookings() || [];
            cached.push(data);
            cacheBookings(cached);
        }
        return data;
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        throw error;
    }
}

export async function updateBooking(id, updates) {
    try {
        const result = await callScript('updateBooking', { id, updates }, true); // Используем GET
        const data = result.data || null;
        if (data) {
            // Обновляем кэш
            const { getCachedBookings, cacheBookings } = await import('./cache.js');
            const cached = getCachedBookings() || [];
            const index = cached.findIndex(b => b.id === id);
            if (index !== -1) {
                cached[index] = { ...cached[index], ...updates };
            }
            cacheBookings(cached);
        }
        return data;
    } catch (error) {
        console.error('Ошибка обновления записи:', error);
        throw error;
    }
}

export async function deleteBooking(id) {
    try {
        await callScript('deleteBooking', { id }, true); // Используем GET
        // Обновляем кэш
        const { getCachedBookings, cacheBookings } = await import('./cache.js');
        const cached = getCachedBookings() || [];
        const filtered = cached.filter(b => b.id !== id);
        cacheBookings(filtered);
        return true;
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с процедурами
export async function getProcedures() {
    try {
        // Пытаемся загрузить из кэша сначала
        const { getCachedProcedures, cacheProcedures } = await import('./cache.js');
        const cached = getCachedProcedures();
        if (cached) {
            // Загружаем свежие данные в фоне
            callScript('getProcedures', {}, true).then(result => {
                if (result && result.data) {
                    cacheProcedures(result.data);
                }
            }).catch(() => {}); // Игнорируем ошибки фоновой загрузки
            return cached;
        }
        
        const result = await callScript('getProcedures', {}, true); // Используем GET
        const data = result.data || { massage: [], laser: [] };
        cacheProcedures(data);
        return data;
    } catch (error) {
        console.error('Ошибка получения процедур:', error);
        // Пытаемся вернуть из кэша даже при ошибке
        const { getCachedProcedures } = await import('./cache.js');
        const cached = getCachedProcedures();
        return cached || { massage: [], laser: [] };
    }
}

export async function updateProcedures(procedures) {
    try {
        // Сначала обновляем кэш для мгновенного отклика
        const { cacheProcedures } = await import('./cache.js');
        cacheProcedures(procedures);
        
        await callScript('updateProcedures', { procedures }, true); // Используем GET
        return true;
    } catch (error) {
        console.error('Ошибка обновления процедур:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с клиентами
export async function getClients() {
    try {
        // Пытаемся загрузить из кэша сначала
        const { getCachedClients, cacheClients } = await import('./cache.js');
        const cached = getCachedClients();
        if (cached) {
            // Загружаем свежие данные в фоне
            callScript('getClients', {}, true).then(result => {
                if (result && result.data) {
                    cacheClients(result.data);
                }
            }).catch(() => {}); // Игнорируем ошибки фоновой загрузки
            return cached;
        }
        
        const result = await callScript('getClients', {}, true); // Используем GET
        const data = result.data || [];
        cacheClients(data);
        return data;
    } catch (error) {
        console.error('Ошибка получения клиентов:', error);
        // Пытаемся вернуть из кэша даже при ошибке
        const { getCachedClients } = await import('./cache.js');
        const cached = getCachedClients();
        return cached || [];
    }
}

export async function addClients(phones) {
    try {
        const result = await callScript('addClients', { phones }, true); // Используем GET
        const data = result.data || [];
        if (data.length > 0) {
            // Обновляем кэш
            const { getCachedClients, cacheClients } = await import('./cache.js');
            const cached = getCachedClients() || [];
            cacheClients([...cached, ...data]);
        }
        return data;
    } catch (error) {
        console.error('Ошибка добавления клиентов:', error);
        throw error;
    }
}

export async function deleteClient(id) {
    try {
        await callScript('deleteClient', { id }, true); // Используем GET
        // Обновляем кэш
        const { getCachedClients, cacheClients } = await import('./cache.js');
        const cached = getCachedClients() || [];
        const filtered = cached.filter(c => c.id !== id);
        cacheClients(filtered);
        return true;
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с настройками
export async function getSettings() {
    try {
        // Пытаемся загрузить из кэша сначала
        const { getCachedSettings, cacheSettings } = await import('./cache.js');
        const cached = getCachedSettings();
        if (cached) {
            // Загружаем свежие данные в фоне
            callScript('getSettings', {}, true).then(result => {
                if (result && result.data) {
                    cacheSettings(result.data);
                }
            }).catch(() => {}); // Игнорируем ошибки фоновой загрузки
            return cached;
        }
        
        const result = await callScript('getSettings', {}, true); // Используем GET
        const data = result.data || { workStart: '09:00', workEnd: '21:00', breaks: [] };
        cacheSettings(data);
        return data;
    } catch (error) {
        console.error('Ошибка получения настроек:', error);
        // Пытаемся вернуть из кэша даже при ошибке
        const { getCachedSettings } = await import('./cache.js');
        const cached = getCachedSettings();
        return cached || { workStart: '09:00', workEnd: '21:00', breaks: [] };
    }
}

export async function updateSettings(settings) {
    try {
        // Сначала обновляем кэш для мгновенного отклика
        const { cacheSettings } = await import('./cache.js');
        cacheSettings(settings);
        
        const result = await callScript('updateSettings', { settings }, true); // Используем GET
        return result.data || null;
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        throw error;
    }
}

