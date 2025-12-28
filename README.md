# Система записи клиентов салона красоты "Идеальное тело"

Веб-приложение для управления записями клиентов в салоне красоты с интеграцией Google Sheets.

## Возможности

- 📅 Календарь записей на месяц вперед
- 💆 Управление услугами: Массаж и Лазер
- ⚙️ Настройка процедур с индивидуальным временем для каждой
- 👥 Управление базой клиентов
- ⏰ Настройка времени работы и перерывов
- 📱 Удобный интерфейс с цифровой клавиатурой для ввода номера телефона
- 🔄 Автоматическое перемещение прошедших записей в архив

## Структура проекта

```
лера/
├── index.html          # Основной HTML файл
├── styles.css          # Стили CSS
├── js/
│   ├── app.js          # Главный файл приложения
│   ├── calendar.js     # Логика календаря
│   ├── bookings.js     # Управление записями
│   ├── settings.js     # Управление настройками
│   ├── googleSheets.js # Интеграция с Google Sheets
│   ├── ui.js           # UI компоненты
│   └── utils.js        # Вспомогательные функции
└── README.md           # Документация
```

## Настройка Google Apps Script

### Шаг 1: Создание Google Sheets

1. Создайте новую Google Таблицу
2. Создайте следующие листы:
   - `Записи` - для хранения записей клиентов
   - `Процедуры_Массаж` - список процедур массажа
   - `Процедуры_Лазер` - список процедур лазера
   - `Клиенты` - база клиентов
   - `Настройки` - настройки салона

### Шаг 2: Настройка структуры таблиц

#### Лист "Записи"
Столбцы:
- A: id (текст)
- B: date (дата)
- C: time (время, текст)
- D: serviceType (текст: "massage" или "laser")
- E: procedure (текст)
- F: phone (текст, 4 цифры)
- G: status (текст: "active" или "archived")
- H: createdAt (дата и время)

#### Лист "Процедуры_Массаж"
Столбцы:
- A: id (текст)
- B: name (текст)
- C: duration (число, минуты)

#### Лист "Процедуры_Лазер"
Столбцы:
- A: id (текст)
- B: name (текст)
- C: duration (число, минуты)

#### Лист "Клиенты"
Столбцы:
- A: id (текст)
- B: phone (текст)
- C: name (текст, опционально)

#### Лист "Настройки"
Столбцы:
- A: key (текст)
- B: value (текст/JSON)

Пример данных:
- workStart: "09:00"
- workEnd: "21:00"
- breaks: JSON массив объектов `[{"start": "13:00", "end": "14:00"}]`

### Шаг 3: Создание Apps Script

1. В Google Таблице выберите `Расширения` → `Apps Script`
2. Вставьте следующий код:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    switch(action) {
      case 'getBookings':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: getBookingsData(ss)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'createBooking':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: createBookingData(ss, data)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'updateBooking':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: updateBookingData(ss, data)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'deleteBooking':
        deleteBookingData(ss, data.id);
        return ContentService.createTextOutput(JSON.stringify({
          success: true
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'getProcedures':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: getProceduresData(ss)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'updateProcedures':
        updateProceduresData(ss, data.procedures);
        return ContentService.createTextOutput(JSON.stringify({
          success: true
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'getClients':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: getClientsData(ss)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'addClients':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: addClientsData(ss, data.phones)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'deleteClient':
        deleteClientData(ss, data.id);
        return ContentService.createTextOutput(JSON.stringify({
          success: true
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'getSettings':
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: getSettingsData(ss)
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'updateSettings':
        updateSettingsData(ss, data.settings);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: data.settings
        })).setMimeType(ContentService.MimeType.JSON);
        
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unknown action'
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Функции для работы с данными
function getBookingsData(ss) {
  const sheet = ss.getSheetByName('Записи');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function createBookingData(ss, data) {
  const sheet = ss.getSheetByName('Записи');
  const id = Date.now().toString();
  const row = [
    id,
    data.date,
    data.time,
    data.serviceType,
    data.procedure,
    data.phone,
    'active',
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return {
    id: id,
    date: data.date,
    time: data.time,
    serviceType: data.serviceType,
    procedure: data.procedure,
    phone: data.phone,
    status: 'active',
    createdAt: row[7]
  };
}

function updateBookingData(ss, data) {
  const sheet = ss.getSheetByName('Записи');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === data.id) {
      Object.keys(data.updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(i + 1, col + 1).setValue(data.updates[key]);
        }
      });
      break;
    }
  }
  return data.updates;
}

function deleteBookingData(ss, id) {
  const sheet = ss.getSheetByName('Записи');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function getProceduresData(ss) {
  const massageSheet = ss.getSheetByName('Процедуры_Массаж');
  const laserSheet = ss.getSheetByName('Процедуры_Лазер');
  
  return {
    massage: getProceduresFromSheet(massageSheet),
    laser: getProceduresFromSheet(laserSheet)
  };
}

function getProceduresFromSheet(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function updateProceduresData(ss, procedures) {
  updateProceduresSheet(ss, 'Процедуры_Массаж', procedures.massage);
  updateProceduresSheet(ss, 'Процедуры_Лазер', procedures.laser);
}

function updateProceduresSheet(ss, sheetName, procedures) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['id', 'name', 'duration']);
  }
  sheet.clear();
  sheet.appendRow(['id', 'name', 'duration']);
  procedures.forEach(p => {
    sheet.appendRow([p.id, p.name, p.duration]);
  });
}

function getClientsData(ss) {
  const sheet = ss.getSheetByName('Клиенты');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function addClientsData(ss, phones) {
  const sheet = ss.getSheetByName('Клиенты');
  if (!sheet) {
    sheet = ss.insertSheet('Клиенты');
    sheet.appendRow(['id', 'phone', 'name']);
  }
  
  const newClients = phones.map(phone => ({
    id: Date.now().toString() + Math.random(),
    phone: phone,
    name: ''
  }));
  
  newClients.forEach(client => {
    sheet.appendRow([client.id, client.phone, client.name]);
  });
  
  return newClients;
}

function deleteClientData(ss, id) {
  const sheet = ss.getSheetByName('Клиенты');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function getSettingsData(ss) {
  const sheet = ss.getSheetByName('Настройки');
  if (!sheet) {
    return { workStart: '09:00', workEnd: '21:00', breaks: [] };
  }
  
  const data = sheet.getDataRange().getValues();
  const settings = {};
  
  data.forEach(row => {
    const key = row[0];
    const value = row[1];
    if (key === 'breaks') {
      settings[key] = JSON.parse(value || '[]');
    } else {
      settings[key] = value;
    }
  });
  
  return {
    workStart: settings.workStart || '09:00',
    workEnd: settings.workEnd || '21:00',
    breaks: settings.breaks || []
  };
}

function updateSettingsData(ss, settings) {
  let sheet = ss.getSheetByName('Настройки');
  if (!sheet) {
    sheet = ss.insertSheet('Настройки');
    sheet.appendRow(['key', 'value']);
  }
  
  sheet.clear();
  sheet.appendRow(['key', 'value']);
  
  Object.keys(settings).forEach(key => {
    const value = key === 'breaks' ? JSON.stringify(settings[key]) : settings[key];
    sheet.appendRow([key, value]);
  });
}
```

3. Сохраните скрипт (Ctrl+S или Cmd+S)
4. Нажмите `Развернуть` → `Новое развертывание`
5. Выберите тип: `Веб-приложение`
6. Настройки:
   - Описание: "Beauty Salon Booking System"
   - Выполнять от имени: "Меня"
   - У кого есть доступ: "Все"
7. Нажмите `Развернуть`
8. Скопируйте URL веб-приложения

### Шаг 4: Настройка URL в приложении

URL Google Apps Script уже настроен в файле `js/googleSheets.js`. 

Если вам нужно изменить URL, откройте файл `js/googleSheets.js` и обновите константу `scriptUrl`:

```javascript
const scriptUrl = 'ВАШ_НОВЫЙ_URL_ВЕБ_ПРИЛОЖЕНИЯ';
```

**Важно:** Приложение полностью работает через Google Sheets. Локальное сохранение данных отключено.

## Использование

1. Откройте `index.html` в браузере
2. Настройте процедуры, время работы и перерывы в настройках
3. Выберите тип услуги (Массаж или Лазер)
4. Кликните на свободный временной слот в календаре
5. Выберите процедуру и введите последние 4 цифры номера телефона
6. Нажмите "Добавить"

## Особенности

- Временные слоты генерируются автоматически на основе длительности процедур
- Прошедшие записи автоматически перемещаются в архив
- Поиск клиентов по последним 4 цифрам номера телефона
- Возможность массового добавления клиентов
- Настройка перерывов автоматически закрывает временные слоты

## Технологии

- HTML5
- CSS3 (современный дизайн 2027 года)
- JavaScript ES2025 (модульная архитектура)
- Google Apps Script для работы с Google Sheets

## Лицензия

Проект создан для внутреннего использования салона красоты "Идеальное тело".

