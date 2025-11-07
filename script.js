const ESPTOOL_URLS = [
  'https://espressif.github.io/esptool-js/esptool.js',
  'https://cdn.jsdelivr.net/gh/espressif/esptool-js@master/dist/esptool.js',
  'https://unpkg.com/esptool-js/dist/esptool.js'
];

const $ = id => document.getElementById(id);
const log = txt => {
  const entry = document.createElement('div');
  entry.textContent = txt;
  const consoleEl = $('console');
  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;
};

async function loadEsptool() {
  for (const url of ESPTOOL_URLS) {
    try {
      log('Loading esptool-js from ' + url);
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load ' + url));
        document.head.appendChild(script);
      });

      if (window.esptool || window.EspTool || window.ESPTool) {
        log('esptool-js loaded successfully.');
        return true;
      }
    } catch (error) {
      log(error.message);
    }
  }

  log('Không thể load esptool-js tự động.');
  return false;
}

let port = null;

async function connectSerial() {
  if (!('serial' in navigator)) {
    alert('Trình duyệt không hỗ trợ Web Serial API.');
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: Number($('baud').value) });
    log('✅ Kết nối thành công. Baud: ' + $('baud').value);
    $('btn-flash').disabled = false;
    $('btn-erase').disabled = false;
  } catch (error) {
    log('❌ Lỗi kết nối: ' + error.message);
  }
}

async function flashBinary() {
  const file = $('file').files[0];
  if (!file) {
    alert('Chưa chọn file .bin');
    return;
  }

  if (!port) {
    alert('Chưa kết nối thiết bị');
    return;
  }

  const offsetHex = $('offset').value.trim();
  let offset = 0x0;

  try {
    offset = Number(offsetHex);
    if (Number.isNaN(offset)) {
      offset = parseInt(offsetHex, 16);
    }
  } catch (error) {
    log('⚠️ Không thể phân tích offset, dùng 0x0.');
    offset = 0x0;
  }

  log('Đọc file...');
  const blob = new Uint8Array(await file.arrayBuffer());
  log('File size: ' + blob.length + ' bytes. Offset: 0x' + offset.toString(16));

  if (window.esptool && window.esptool.Flasher) {
    try {
      const flasher = new window.esptool.Flasher({
        port,
        baudRate: Number($('baud').value),
        onLog: message => log(message)
      });
      await flasher.flash([{ offset, bin: blob }]);
      log('✅ Flash hoàn tất.');
      return;
    } catch (error) {
      log('⚠️ Lỗi flash: ' + error.message);
    }
  }

  log('Không tìm thấy esptool-js API hợp lệ.');
}

async function eraseFlash() {
  if (!port) {
    alert('Chưa kết nối');
    return;
  }

  if (window.esptool && window.esptool.Flasher) {
    try {
      const flasher = new window.esptool.Flasher({
        port,
        baudRate: Number($('baud').value),
        onLog: message => log(message)
      });
      await flasher.erase();
      log('✅ Xóa flash thành công.');
    } catch (error) {
      log('❌ Lỗi xóa flash: ' + error.message);
    }
  }
}

$('btn-connect').addEventListener('click', async () => {
  await loadEsptool();
  await connectSerial();
});

$('btn-flash').addEventListener('click', () => flashBinary());

$('btn-erase').addEventListener('click', () => eraseFlash());

$('btn-open-official').addEventListener('click', () => {
  window.open('https://espressif.github.io/esptool-js/', '_blank');
});

log('💡 Sẵn sàng — nhấn Connect để bắt đầu.');

// Tab functionality
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Modal functionality
function initModal() {
  const modal = document.getElementById('flash-modal');
  const flashButtons = document.querySelectorAll('.btn-flash-fw');
  const closeButton = modal.querySelector('.modal-close');

  // Show modal when flash firmware button is clicked
  flashButtons.forEach((button, index) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();

      // Determine which card was clicked and load appropriate firmware
      const firmwarePath = getFirmwarePath(index);
      showFlashModal(firmwarePath, index);
    });
  });

  // Close modal when close button is clicked
  closeButton.addEventListener('click', () => {
    hideFlashModal();
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideFlashModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideFlashModal();
    }
  });

  // Initialize modal tabs
  initModalTabs();
}

// Modal tab functionality
function initModalTabs() {
  const modalTabButtons = document.querySelectorAll('.modal-tab-btn');
  const modalTabContents = document.querySelectorAll('.modal-tab-content');

  modalTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-modal-tab');

      // Remove active class from all modal tabs and contents
      modalTabButtons.forEach(btn => btn.classList.remove('active'));
      modalTabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Get firmware path based on card index
function getFirmwarePath(cardIndex) {
  const firmwarePaths = [
    'firmware/xiaozhi_esp32_ST7789_240x240/xiaozhi_esp32_ST7789_240x240.bin', // First card
    'firmware/xiaozhi_lcd_GC9A1_240x240/xiaozhi_lcd_GC9A1_240x240.bin',     // Second card
    'firmware/xiaozhi_0.96led_128x64/xiaozhi 0.96oled-wifi v2.bin'          // Third card
  ];

  return firmwarePaths[cardIndex] || firmwarePaths[0];
}

function showFlashModal(firmwarePath, cardIndex) {
  const modal = document.getElementById('flash-modal');
  modal.classList.add('show');

  // Update log with firmware information
  updateLogEntry('💡 Khởi tạo quá trình nạp firmware...');
  updateLogEntry(`📁 Đọc file firmware: ${firmwarePath.split('/').pop()}`);

  // Simulate loading firmware file
  setTimeout(() => {
    simulateFlashProcess(firmwarePath, cardIndex);
  }, 500);
}

function hideFlashModal() {
  const modal = document.getElementById('flash-modal');
  modal.classList.remove('show');

  // Reset modal state
  resetModalState();
}

function simulateFlashProcess(firmwarePath, cardIndex) {
  // This simulates the firmware flashing process with status updates
  // In a real implementation, this would handle the actual ESP32 flashing

  // Update log with file size check
  updateLogEntry('🔍 Kích thước file: Đang kiểm tra...');

  setTimeout(() => {
    updateLogEntry('📏 Kích thước file: 1.2MB (1,228,800 bytes)');
    updateLogEntry('🔌 Đang tìm kiếm cổng serial...');

    // Simulate attempting to connect to device
    updateFlashStatus('connect', 'error', 'Lỗi: Failed to execute \'requestPort\' on \'Serial\': No port selected by the user.');
    updateLogEntry('❌ Lỗi: Không tìm thấy thiết bị ESP32');
    updateLogEntry('💡 Hướng dẫn: Vui lòng kết nối ESP32 và chọn cổng COM phù hợp.');
  }, 1000);
}

function updateLogEntry(message) {
  const logConsole = document.querySelector('.log-console');
  if (logConsole) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';

    // Add appropriate class based on message content
    if (message.includes('❌') || message.includes('Lỗi')) {
      logEntry.classList.add('error');
    } else if (message.includes('✅') || message.includes('thành công')) {
      logEntry.classList.add('success');
    } else if (message.includes('⚠️') || message.includes('Cảnh báo')) {
      logEntry.classList.add('warning');
    }

    logEntry.textContent = message;
    logConsole.appendChild(logEntry);

    // Scroll to bottom
    logConsole.scrollTop = logConsole.scrollHeight;
  }
}

function updateFlashStatus(step, status, message) {
  const statusItems = {
    'connect': 0,
    'flash': 1,
    'complete': 2
  };

  const statusElements = document.querySelectorAll('.status-item');
  const statusIndex = statusItems[step];

  if (statusIndex !== undefined && statusElements[statusIndex]) {
    const statusItem = statusElements[statusIndex];
    const statusIcon = statusItem.querySelector('.status-icon');
    const statusMessage = statusItem.querySelector('.status-message');

    // Remove all status classes
    statusItem.classList.remove('pending', 'error', 'success');

    // Add new status class
    statusItem.classList.add(status);

    // Update icon
    if (status === 'error') {
      statusIcon.textContent = '✗';
    } else if (status === 'success') {
      statusIcon.textContent = '✓';
    } else {
      statusIcon.textContent = '⏳';
    }

    // Update message
    statusMessage.textContent = message;
  }
}

function resetModalState() {
  const statusItems = document.querySelectorAll('.status-item');
  const progressFill = document.querySelector('.progress-fill');
  const logConsole = document.querySelector('.log-console');

  // Reset all status items to pending
  statusItems.forEach((item, index) => {
    item.classList.remove('error', 'success');
    item.classList.add('pending');

    const statusIcon = item.querySelector('.status-icon');
    const statusMessage = item.querySelector('.status-message');

    statusIcon.textContent = '⏳';

    if (index === 0) {
      statusMessage.textContent = 'Chờ kết nối...';
    } else if (index === 1) {
      statusMessage.textContent = 'Chờ kết nối...';
    } else {
      statusMessage.textContent = 'Chờ...';
    }
  });

  // Reset progress bar
  if (progressFill) {
    progressFill.style.width = '0%';
  }

  // Reset log console
  if (logConsole) {
    logConsole.innerHTML = `
      <div class="log-entry">💡 Khởi tạo quá trình nạp firmware...</div>
      <div class="log-entry">📁 Đọc file firmware: xiaozhi_esp32_ST7789_240x240.bin</div>
      <div class="log-entry">🔍 Kích thước file: Đang kiểm tra...</div>
      <div class="log-entry">🔌 Đang tìm kiếm cổng serial...</div>
      <div class="log-entry error">❌ Lỗi: Không tìm thấy thiết bị ESP32</div>
    `;
  }

  // Reset modal tabs to status tab
  const modalTabButtons = document.querySelectorAll('.modal-tab-btn');
  const modalTabContents = document.querySelectorAll('.modal-tab-content');

  modalTabButtons.forEach(btn => btn.classList.remove('active'));
  modalTabContents.forEach(content => content.classList.remove('active'));

  // Activate status tab
  const statusTabBtn = document.querySelector('[data-modal-tab="status"]');
  const statusTabContent = document.getElementById('status-tab');

  if (statusTabBtn) statusTabBtn.classList.add('active');
  if (statusTabContent) statusTabContent.classList.add('active');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModal();
});
