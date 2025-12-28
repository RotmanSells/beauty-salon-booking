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
// refreshCalendar будет доступен через window

let procedures = { massage: [], laser: [] };
let clients = [];
let settings = { workStart: '10:00', workEnd: '23:00', breaks: [] };

// Загрузка данных
export async function loadSettings() {
    try {
        [procedures, clients, settings] = await Promise.all([
            getProcedures(),
            getClients(),
            getSettings()
        ]);
        
        renderAllSettings();
        return { procedures, clients, settings };
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
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
        duration: duration || 30
    };
    
    procedures[type].push(newProcedure);
    await updateProcedures(procedures);
    renderProcedures();
    if (window.refreshCalendar) window.refreshCalendar();
    
    return newProcedure;
}

// Управление клиентами
function renderClients() {
    renderClientsList(
        clients,
        async (clientId) => {
            await deleteClient(clientId);
            clients = await getClients();
            renderClients();
        }
    );
}

// Добавление клиентов
export async function addClientsFromInput(input) {
    const phones = parsePhoneNumbers(input);
    
    if (phones.length === 0) {
        alert('Не найдено ни одного номера телефона');
        return;
    }
    
    try {
        const newClients = await addClients(phones);
        clients = await getClients();
        renderClients();
        
        alert(`Добавлено клиентов: ${newClients.length}`);
    } catch (error) {
        console.error('Ошибка добавления клиентов:', error);
        alert('Ошибка при добавлении клиентов');
    }
}

// Управление временем работы
function renderWorktime() {
    const startInput = document.getElementById('workStartTime');
    const endInput = document.getElementById('workEndTime');
    
    if (startInput && endInput) {
        startInput.value = settings.workStart || '09:00';
        endInput.value = settings.workEnd || '21:00';
    }
}

export async function saveWorktime(start, end) {
    if (!validateTimeRange(start, end)) {
        alert('Время начала должно быть раньше времени окончания');
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
        notification.textContent = 'Время работы сохранено';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения времени работы:', error);
        alert('Ошибка при сохранении времени работы');
        return false;
    }
}

// Управление перерывами
function renderBreaks() {
    renderBreaksList(
        settings.breaks || [],
        async (updatedBreaks) => {
        settings.breaks = updatedBreaks;
        await updateSettings(settings);
        
        // Обновляем настройки в calendar.js
        if (window.updateCalendarSettings) {
            window.updateCalendarSettings(settings);
        }
        
        // Обновляем календарь
        if (window.refreshCalendar) {
            window.refreshCalendar();
        }
        },
        async (index) => {
            settings.breaks.splice(index, 1);
            await updateSettings(settings);
            
            // Обновляем настройки в calendar.js
            if (window.updateCalendarSettings) {
                window.updateCalendarSettings(settings);
            }
            
            // Обновляем календарь
            if (window.refreshCalendar) {
                window.refreshCalendar();
            }
        }
    );
}

export async function addBreak(start, end) {
    if (!validateTimeRange(start, end)) {
        alert('Время начала должно быть раньше времени окончания');
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
        alert('Ошибка при добавлении перерыва');
        return false;
    }
}

export function getSettingsData() {
    return settings;
}

// Инициализация обработчиков настроек
export function initSettings() {
    // Добавление процедур массажа
    const addMassageBtn = document.getElementById('addMassageProcedure');
    if (addMassageBtn) {
        addMassageBtn.addEventListener('click', () => {
            addProcedure('massage', 'Новая процедура', 60);
        });
    }
    
    // Добавление процедур лазера
    const addLaserBtn = document.getElementById('addLaserProcedure');
    if (addLaserBtn) {
        addLaserBtn.addEventListener('click', () => {
            addProcedure('laser', 'Новая процедура', 60);
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
    
    // Сохранение времени работы
    const saveWorktimeBtn = document.getElementById('saveWorktime');
    if (saveWorktimeBtn) {
        saveWorktimeBtn.addEventListener('click', () => {
            const startInput = document.getElementById('workStartTime');
            const endInput = document.getElementById('workEndTime');
            if (startInput && endInput) {
                saveWorktime(startInput.value, endInput.value);
            }
        });
    }
    
    // Добавление перерыва
    const addBreakBtn = document.getElementById('addBreak');
    if (addBreakBtn) {
        addBreakBtn.addEventListener('click', () => {
            const start = prompt('Время начала перерыва (например, 13:00):');
            const end = prompt('Время окончания перерыва (например, 14:00):');
            if (start && end) {
                addBreak(start, end);
            }
        });
    }
}

