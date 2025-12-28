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
        const result = await callScript('getBookings', {}, true); // Используем GET
        return result.data || [];
    } catch (error) {
        console.error('Ошибка получения записей:', error);
        return [];
    }
}

export async function createBooking(booking) {
    try {
        const result = await callScript('createBooking', booking);
        return result.data || null;
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        throw error;
    }
}

export async function updateBooking(id, updates) {
    try {
        const result = await callScript('updateBooking', { id, updates });
        return result.data || null;
    } catch (error) {
        console.error('Ошибка обновления записи:', error);
        throw error;
    }
}

export async function deleteBooking(id) {
    try {
        await callScript('deleteBooking', { id });
        return true;
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с процедурами
export async function getProcedures() {
    try {
        const result = await callScript('getProcedures', {}, true); // Используем GET
        return result.data || { massage: [], laser: [] };
    } catch (error) {
        console.error('Ошибка получения процедур:', error);
        return { massage: [], laser: [] };
    }
}

export async function updateProcedures(procedures) {
    try {
        await callScript('updateProcedures', { procedures });
        return true;
    } catch (error) {
        console.error('Ошибка обновления процедур:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с клиентами
export async function getClients() {
    try {
        const result = await callScript('getClients', {}, true); // Используем GET
        return result.data || [];
    } catch (error) {
        console.error('Ошибка получения клиентов:', error);
        return [];
    }
}

export async function addClients(phones) {
    try {
        const result = await callScript('addClients', { phones });
        return result.data || [];
    } catch (error) {
        console.error('Ошибка добавления клиентов:', error);
        throw error;
    }
}

export async function deleteClient(id) {
    try {
        await callScript('deleteClient', { id });
        return true;
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        throw error;
    }
}

// Экспортируемые функции для работы с настройками
export async function getSettings() {
    try {
        const result = await callScript('getSettings', {}, true); // Используем GET
        return result.data || { workStart: '09:00', workEnd: '21:00', breaks: [] };
    } catch (error) {
        console.error('Ошибка получения настроек:', error);
        return { workStart: '09:00', workEnd: '21:00', breaks: [] };
    }
}

export async function updateSettings(settings) {
    try {
        const result = await callScript('updateSettings', { settings });
        return result.data || null;
    } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        throw error;
    }
}

