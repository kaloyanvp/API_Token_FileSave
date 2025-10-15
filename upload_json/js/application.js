// DOM elements
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const tokenInput = document.getElementById('tokenInput');
const toggleTokenBtn = document.getElementById('toggleTokenVisibility');
const uploadSection = document.getElementById('uploadSection');
const previewSection = document.getElementById('previewSection');
const validationStatus = document.getElementById('validationStatus');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const jsonPreview = document.getElementById('jsonPreview');
const validationAlert = document.getElementById('validationAlert');
const sendBtn = document.getElementById('sendBtn');
const resultAlert = document.getElementById('resultAlert');
let apiKey = "";

// API endpoint - променете според вашите нужди 
    const API_ENDPOINT = 'http://localhost:3000/users/save';

// Текущи данни
let currentJsonData = null;

// Toggle token visibility
toggleTokenBtn.addEventListener('click', function () {
    const type = tokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
    tokenInput.setAttribute('type', type);
    this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
});

// Token validation on input
tokenInput.addEventListener('input', validateToken);

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);

});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('dragover');
}

function unhighlight() {
    dropArea.classList.remove('dragover');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

fileInput.addEventListener('change', function () {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/json') {
        showAlert('Моля, изберете JSON файл!', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            currentJsonData = JSON.parse(e.target.result);
            displayPreview(currentJsonData);
            validateToken(); // Проверяваме токена отново при нов файл
        } catch (error) {
            showAlert('Невалиден JSON формат!', 'danger');
            console.error('JSON parse error:', error);
        }
    };
    reader.onerror = function () {
        showAlert('Грешка при четене на файла!', 'danger');
    };
    reader.readAsText(file);
}

function displayPreview(jsonData) {
    jsonPreview.textContent = JSON.stringify(jsonData, null, 2);
    uploadSection.classList.add('hidden');
    previewSection.classList.remove('hidden');
}

function validateToken() {
    const token = tokenInput.value.trim();

    if (!token) {
        validationStatus.classList.add('hidden');
        sendBtn.disabled = true;
        return;
    }

    validationStatus.classList.remove('hidden');

    // Симулация на валидация на токена
    // В реална ситуация това може да бъде JWT валидация или проверка срещу API
    setTimeout(() => {
        // Проста валидация - допълнете според вашите изисквания
        const isValid = token.length >= 10 &&
            /[A-Z]/.test(token) &&
            /[a-z]/.test(token) &&
            /[0-9]/.test(token);

        if (isValid) {
            validationAlert.className = 'alert alert-success';
            validationAlert.innerHTML = '<i class="fas fa-check-circle me-2"></i>Токенът е валиден!';
            sendBtn.disabled = !currentJsonData; // Активираме бутона само ако има JSON данни
            apiKey = token;
        } else {
            validationAlert.className = 'alert alert-danger';
            validationAlert.innerHTML = '<i class="fas fa-times-circle me-2"></i>Невалиден токен! Токенът трябва да съдържа поне 10 символа, главни и малки букви и цифри.';
            sendBtn.disabled = true;
        }
    }, 1000);
}

// Send to API
sendBtn.addEventListener('click', sendToAPI);

function sendToAPI() {
  if (!currentJsonData || !tokenInput.value.trim()) {
    showResultAlert('Липсват данни или токен!', 'warning');
    return;
  }

  // Показване на loading спинер
  previewSection.classList.add('hidden');
  validationStatus.classList.add('hidden');
  loadingSpinner.classList.remove('hidden');

  const requestData = {
    data: currentJsonData,
    timestamp: new Date().toISOString()
  };

  fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestData)
  })
    .then(async response => {
      loadingSpinner.classList.add('hidden');

      // обработваме специално статусите 401 и 403
      if (response.status === 401 || response.status === 403) {
        //showResultAlert('Невалиден токен! Моля, въведете нов.', 'danger');
        validationAlert.className = 'alert alert-danger';
        validationAlert.innerHTML = '<i class="fas fa-times-circle me-2"></i>Невалиден токен! Опитайте отново.';
        validationStatus.classList.remove('hidden');
        tokenInput.value = '';
        sendBtn.disabled = true;
        previewSection.classList.remove('hidden');
        return null; // спираме обработката тук
      }

      if (!response.ok) {
        const text = await response.text();
        showResultAlert(`Сървърна грешка: ${response.status} ${text}`, 'danger');
        previewSection.classList.remove('hidden');
        return null;
      }

      return response.json();
    })
    .then(data => {
      if (!data) return; // вече е обработено като грешка
      showResultAlert('✅ Данните са изпратени успешно!', 'success');
      console.log('API Response:', data);
    })
    .catch(error => {
      loadingSpinner.classList.add('hidden');
      showResultAlert(`⚠️ Грешка при изпращане: ${error.message}`, 'danger');
      console.error('API Error:', error);
      previewSection.classList.remove('hidden');
    });
}


function showResultAlert(message, type) {
    resultsSection.classList.remove('hidden');
    resultAlert.className = `alert alert-${type}`;
    resultAlert.innerHTML = `
                <i class="fas ${getAlertIcon(type)} me-2"></i>
                ${message}
            `;
}

function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-times-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
    document.querySelector('.card-body').insertBefore(alertDiv, document.querySelector('.mb-4'));

    // Автоматично затваряне след 5 секунди
    setTimeout(() => {
        if (alertDiv.isConnected) {
            alertDiv.remove();
        }
    }, 5000);
}

function resetForm() {
    // Ресет на всички полета и състояния
    fileInput.value = '';
    tokenInput.value = '';
    currentJsonData = null;

    // Скриване на секции
    previewSection.classList.add('hidden');
    validationStatus.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    resultsSection.classList.add('hidden');

    // Показване на upload секцията
    uploadSection.classList.remove('hidden');

    // Ресет на бутони
    sendBtn.disabled = true;
}


// Изпращане на данните към API
// async function sendDataToAPI() {
//     let currentProcess = {
//     isProcessing: false,
//     isPaused: false,
//     isStopped: false,
//     successCount: 0,
//     failedCount: 0,
//     processedCount: 0
// };
//     const statusText = document.getElementById('statusText');
//     const progressFill = document.getElementById('progressFill');
//     //const useBatch = document.getElementById('useBatch').checked;
//     if (!currentJsonData || !tokenInput.value.trim()) {
//         showResultAlert('Липсват данни или токен!', 'warning');
//         return;
//     }

//     // Показване на loading спинер
//     previewSection.classList.add('hidden');
//     validationStatus.classList.add('hidden');
//     loadingSpinner.classList.remove('hidden');
//     const useBatch = true;
//     const simulateMode = false;
//     //const apiKey = document.getElementById('apiKey').value;

//     // console.log(currentJsonData);
//     const totalRows = currentJsonData.length;
//     const batchSize = useBatch ? 100 : 1;

//     for (let i = 0; i < totalRows && !currentProcess.isStopped; i += batchSize) {
//         // Проверка за пауза
//         while (currentProcess.isPaused && !currentProcess.isStopped) {
//             await new Promise(resolve => setTimeout(resolve, 100));
//         }

//         if (currentProcess.isStopped) break;

//         const batch = useBatch ? currentJsonData.slice(i, i + batchSize) : [currentJsonData[i]];

//         try {
//             // Реално изпращане към API
//             const response = await sendBatchToAPI(batch, API_ENDPOINT);

//              let data = {};
//             try {
//                 data = await response.json();
//             } catch (err) {
//                 data = {};
//             }
            
//             if (response.ok) {
//                 currentProcess.successCount += batch.length;
//                 document.getElementById('apiResponse').textContent = `Успешно изпратени ${batch.length} записа\nСтатус: ${response.status}`;
//                 showResultAlert('📤 Изпращането на всички данни приключи!', 'success');
//             } else {
//                 currentProcess.failedCount += batch.length;
//                 //document.getElementById('apiResponse').textContent = `Грешка при изпращане: ${response.status} ${response.statusText}`;
//                 const message = data.message || response.statusText || 'Неизвестна грешка';
//                 document.getElementById('apiResponse').textContent =
//                     ` Грешка при изпращане: ${response.status} ${message}`;
//                     showResultAlert(' Възникна грешка при изпращането на данни!', 'danger');
//             }

//             currentProcess.processedCount = i + batch.length;

//             // Ъпдейт на прогреса
//             const progress = Math.floor((currentProcess.processedCount / totalRows) * 100);
//             progressFill.style.width = progress + '%';
//             progressFill.textContent = progress + '%';

//             // Ъпдейт на статистиката
//             // updateStats(); 

//             // Малка забавяне за по-добра визуализация
//             if (!simulateMode) {
//                 await new Promise(resolve => setTimeout(resolve, 200));
//             }

//         } catch (error) {
//             currentProcess.failedCount += batch.length;
//             currentProcess.processedCount = i + batch.length;
//             document.getElementById('apiResponse').textContent = `Грешка: ${error.message}`;
//             // updateStats();
//         }
//     }
//     currentProcess.isProcessing = false;
//     loadingSpinner.classList.add('hidden');
    
//     // statusText.textContent = currentProcess.isStopped ?   'Процесът е спрян' : 'Изпращането завърши!';
//     // statusText.className = currentProcess.isStopped ? 'error' : 'success';

// }

// // Изпращане на batch към API
// async function sendBatchToAPI(batch, endpoint) {
//     const headers = {
//         'Content-Type': 'application/json'
//     };

//     if (apiKey) {
//         // console.log(apiKey);
//         headers['Authorization'] = `Bearer ${apiKey}`;
//     }
//     const result = fetch(endpoint, {
//         method: 'POST',
//         headers: headers,
//         body: JSON.stringify({
//             data: batch
//         })
//     });
//     return result;
// }