// Управление настройками

import { 
    parsePhoneNumbers,
    validateTimeRange
} from './utils.js';
import {
    getProcedures,
    updateProcedures,
    getClients,
    addClients,
    deleteClient,
    getSettings,
    updateSettings
} from './googleSheets.js';
import {
    renderProceduresList,
    renderClientsList,
    renderBreaksList
} from './ui.js';

// Функция для перезагрузки клиентов (используется в ui.js при ошибках)
window.reloadClients = async () => {
    const { getClients } = await import('./googleSheets.js');
    clients = await getClients();
    renderClients();
};
// refreshCalendar будет доступен через window

let procedures = { massage: [], laser: [] };
let clients = [];
let settings = { workStart: '10:00', workEnd: '23:00', breaks: [] };

// Инициализация кэша при загрузке модуля
(async () => {
    try {
        const { getCachedProcedures, getCachedClients, getCachedSettings } = await import('./cache.js');
        const cachedProcedures = getCachedProcedures();
        const cachedClients = getCachedClients();
        const cachedSettings = getCachedSettings();
        
        if (cachedProcedures) procedures = cachedProcedures;
        if (cachedClients) clients = cachedClients;
        if (cachedSettings) settings = cachedSettings;
    } catch (error) {
        // Игнорируем ошибки при загрузке кэша
    }
})();

// Загрузка данных
export async function loadSettings() {
    try {
        const [proceduresData, clientsData, settingsData] = await Promise.all([
            getProcedures(),
            getClients(),
            getSettings()
        ]);
        
        // Обновляем данные только если они загружены успешно
        if (proceduresData) {
            procedures = proceduresData;
            // Обновляем кэш
            const { cacheProcedures } = await import('./cache.js');
            cacheProcedures(procedures);
        }
        if (clientsData) {
            clients = clientsData;
            // Обновляем кэш
            const { cacheClients } = await import('./cache.js');
            cacheClients(clients);
        }
        if (settingsData) {
            settings = settingsData;
            // Обновляем кэш
            const { cacheSettings } = await import('./cache.js');
            cacheSettings(settings);
        }
        
        renderAllSettings();
        return { procedures, clients, settings };
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        // Показываем текущие данные даже при ошибке
        renderAllSettings();
        return { procedures, clients, settings };
    }
}

function renderAllSettings() {
    renderProcedures();
    renderClients();
    renderWorktime();
    renderBreaks();
}

// Управление процедурами
function renderProcedures() {
    renderProceduresList(
        'massageProceduresList',
        procedures.massage || [],
        async (updatedProcedures) => {
            procedures.massage = updatedProcedures;
            await updateProcedures(procedures);
            if (window.refreshCalendar) window.refreshCalendar();
        },
        async (id) => {
            procedures.massage = procedures.massage.filter(p => p.id !== id);
            await updateProcedures(procedures);
            if (window.refreshCalendar) window.refreshCalendar();
        }
    );
    
    renderProceduresList(
        'laserProceduresList',
        procedures.laser || [],
        async (updatedProcedures) => {
            procedures.laser = updatedProcedures;
            await updateProcedures(procedures);
            if (window.refreshCalendar) window.refreshCalendar();
        },
        async (id) => {
            procedures.laser = procedures.laser.filter(p => p.id !== id);
            await updateProcedures(procedures);
            if (window.refreshCalendar) window.refreshCalendar();
        }
    );
}

export function getProceduresList() {
    return procedures;
}

export async function getProceduresByType(type) {
    if (!procedures[type] || procedures[type].length === 0) {
        await loadSettings();
    }
    // Если type === 'all', возвращаем все процедуры
    if (type === 'all') {
        return [...(procedures.massage || []), ...(procedures.laser || [])];
    }
    return procedures[type] || [];
}

// Добавление процедуры
export async function addProcedure(type, name, duration) {
    if (!procedures[type]) {
        procedures[type] = [];
    }
    
    const newProcedure = {
        id: Date.now().toString() + Math.random(),
        name: name || 'Новая процедура',
        duration: duration || 60
    };
    
    // Добавляем локально сразу для мгновенного отображения
    procedures[type].push(newProcedure);
    renderProcedures();
    
    // Сохраняем в фоне
        updateProcedures(procedures).catch(error => {
            console.error('Ошибка сохранения процедуры:', error);
            // Откатываем изменение при ошибке
            procedures[type] = procedures[type].filter(p => p.id !== newProcedure.id);
            renderProcedures();
        });
    
    if (window.refreshCalendar) window.refreshCalendar();
    
    return newProcedure;
}

// Управление клиентами
function renderClients() {
    renderClientsList(
        clients,
        async (updatedClients) => {
            // Обновляем локально сразу
            clients = updatedClients;
            renderClients();
        },
        async (clientId) => {
            // Удаление обрабатывается в ui.js мгновенно
            // Сохраняем в фоне
            await deleteClient(clientId);
            // Обновляем список после удаления
            clients = await getClients();
            renderClients();
        }
    );
}

// Добавление клиентов
export async function addClientsFromInput(input) {
    const phones = parsePhoneNumbers(input);
    
    if (phones.length === 0) {
        return;
    }
    
    // Создаем новых клиентов локально сразу для мгновенного отображения
    const newClients = phones.map(phone => ({
        id: Date.now().toString() + Math.random() + '_' + phone,
        phone: phone,
        name: ''
    }));
    
    // Добавляем локально сразу
    clients = [...clients, ...newClients];
    renderClients();
    
    // Сохраняем в фоне
    try {
        await addClients(phones);
        // Обновляем список после успешного сохранения
        clients = await getClients();
        renderClients();
    } catch (error) {
        console.error('Ошибка добавления клиентов:', error);
        // Откатываем при ошибке
        clients = clients.filter(c => !newClients.some(nc => nc.id === c.id));
        renderClients();
    }
}

// Управление временем работы
function renderWorktime() {
    const startInput = document.getElementById('workStartTime');
    const endInput = document.getElementById('workEndTime');
    
    if (startInput && endInput) {
        startInput.value = settings.workStart || '09:00';
        endInput.value = settings.workEnd || '21:00';
        
        // Удаляем старые обработчики если есть
        const newStartInput = startInput.cloneNode(true);
        const newEndInput = endInput.cloneNode(true);
        startInput.parentNode.replaceChild(newStartInput, startInput);
        endInput.parentNode.replaceChild(newEndInput, endInput);
        
        // Добавляем обработчики автосохранения
        newStartInput.addEventListener('change', () => {
            autoSaveWorktime();
        });
        newEndInput.addEventListener('change', () => {
            autoSaveWorktime();
        });
    }
}

// Автоматическое сохранение времени работы
let worktimeSaveTimeout = null;
function autoSaveWorktime() {
    const startInput = document.getElementById('workStartTime');
    const endInput = document.getElementById('workEndTime');
    
    if (!startInput || !endInput) return;
    
    const start = startInput.value;
    const end = endInput.value;
    
    if (!validateTimeRange(start, end)) {
        return;
    }
    
    // Обновляем локально сразу
    settings.workStart = start;
    settings.workEnd = end;
    
    // Обновляем календарь сразу
    if (window.updateCalendarSettings) {
        window.updateCalendarSettings(settings);
    }
    if (window.refreshCalendar) {
        window.refreshCalendar();
    }
    
    // Сохраняем в фоне с небольшой задержкой (debounce)
    clearTimeout(worktimeSaveTimeout);
    worktimeSaveTimeout = setTimeout(async () => {
        try {
            await updateSettings(settings);
        } catch (error) {
            console.error('Ошибка сохранения времени работы:', error);
        }
    }, 500);
}

export async function saveWorktime(start, end) {
    if (!validateTimeRange(start, end)) {
        return false;
    }
    
    settings.workStart = start;
    settings.workEnd = end;
    
    try {
        await updateSettings(settings);
        
        // Обновляем настройки в calendar.js
        if (window.updateCalendarSettings) {
            window.updateCalendarSettings(settings);
        }
        
        // Обновляем календарь
        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения времени работы:', error);
        return false;
    }
}

// Управление перерывами
function renderBreaks() {
    renderBreaksList(
        settings.breaks || [],
        async (updatedBreaks) => {
            // Обновляем локально сразу
            settings.breaks = updatedBreaks;
            renderBreaks();
            
            // Сохраняем в фоне
            updateSettings(settings).then(() => {
                // Обновляем настройки в calendar.js
                if (window.updateCalendarSettings) {
                    window.updateCalendarSettings(settings);
                }
                
                // Обновляем календарь
                if (window.refreshCalendar) {
                    window.refreshCalendar();
                }
            }).catch(error => {
                console.error('Ошибка сохранения перерыва:', error);
                // Перезагружаем настройки при ошибке
                loadSettings();
            });
        },
        async (index) => {
            // Удаляем локально сразу для мгновенного отклика
            settings.breaks.splice(index, 1);
            renderBreaks();
            
            // Сохраняем в фоне
            updateSettings(settings).then(() => {
                // Обновляем настройки в calendar.js
                if (window.updateCalendarSettings) {
                    window.updateCalendarSettings(settings);
                }
                
                // Обновляем календарь
                if (window.refreshCalendar) {
                    window.refreshCalendar();
                }
            }).catch(error => {
                console.error('Ошибка удаления перерыва:', error);
                // Перезагружаем настройки при ошибке
                loadSettings();
            });
        },
        async (start, end) => {
            // Добавление нового перерыва
            if (!validateTimeRange(start, end)) {
                return false;
            }
            
            // Добавляем локально сразу
            if (!settings.breaks) {
                settings.breaks = [];
            }
            settings.breaks.push({ start, end });
            renderBreaks();
            
            // Сохраняем в фоне
            try {
                await updateSettings(settings);
                
                // Обновляем настройки в calendar.js
                if (window.updateCalendarSettings) {
                    window.updateCalendarSettings(settings);
                }
                
                // Обновляем календарь
                if (window.refreshCalendar) {
                    window.refreshCalendar();
                }
                
                return true;
            } catch (error) {
                console.error('Ошибка добавления перерыва:', error);
                // Откатываем при ошибке
                settings.breaks.pop();
                renderBreaks();
                return false;
            }
        }
    );
}

export async function addBreak(start, end) {
    if (!validateTimeRange(start, end)) {
        return false;
    }
    
    if (!settings.breaks) {
        settings.breaks = [];
    }
    
    settings.breaks.push({ start, end });
    
    try {
        await updateSettings(settings);
        renderBreaks();
        
        // Обновляем настройки в calendar.js
        if (window.updateCalendarSettings) {
            window.updateCalendarSettings(settings);
        }
        
        // Обновляем календарь
        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка добавления перерыва:', error);
        return false;
    }
}

export function getSettingsData() {
    return settings;
}

// Экспортируем для глобального доступа
window.getSettingsData = getSettingsData;

// Функция для немедленного рендеринга настроек
export function renderSettingsImmediately() {
    renderAllSettings();
}

// Экспортируем для глобального доступа
window.renderSettingsImmediately = renderSettingsImmediately;

// Инициализация обработчиков настроек
export function initSettings() {
    // Добавление процедур массажа
    const addMassageBtn = document.getElementById('addMassageProcedure');
    if (addMassageBtn) {
        addMassageBtn.addEventListener('click', async () => {
            await addProcedure('massage', 'Новая процедура', 60);
        });
    }
    
    // Добавление процедур лазера
    const addLaserBtn = document.getElementById('addLaserProcedure');
    if (addLaserBtn) {
        addLaserBtn.addEventListener('click', async () => {
            await addProcedure('laser', 'Новая процедура', 60);
        });
    }
    
    // Добавление клиентов
    const addClientsBtn = document.getElementById('addClients');
    if (addClientsBtn) {
        addClientsBtn.addEventListener('click', () => {
            const input = document.getElementById('clientsInput');
            if (input && input.value.trim()) {
                addClientsFromInput(input.value);
                input.value = '';
            }
        });
    }
    
    // Кнопки времени работы и перерывов теперь обрабатываются через автосохранение
}

