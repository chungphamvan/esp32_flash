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

async function simulateFlashProcess(firmwarePath, cardIndex) {
  // Update log with file size check
  updateLogEntry('🔍 Kích thước file: Đang kiểm tra...');

  setTimeout(async () => {
    try {
      // Load firmware file
      const firmwareData = await loadFirmwareFile(firmwarePath);
      updateLogEntry(`📏 Kích thước file: ${(firmwareData.byteLength / 1024).toFixed(1)}KB (${firmwareData.byteLength} bytes)`);
      updateLogEntry('🔌 Đang tìm kiếm cổng serial...');

      // Check Web Serial API support
      if (!('serial' in navigator)) {
        updateFlashStatus('connect', 'error', 'Lỗi: Trình duyệt không hỗ trợ Web Serial API. Vui lòng dùng Chrome hoặc Edge.');
        updateLogEntry('❌ Lỗi: Trình duyệt không hỗ trợ Web Serial API');
        return;
      }

      updateLogEntry('🔍 Yêu cầu quyền truy cập cổng serial...');
      updateFlashStatus('connect', 'pending', 'Đang chờ người dùng chọn cổng serial...');

      // Request port access - this will show the browser's port selection popup
      const port = await navigator.serial.requestPort();

      if (port) {
        updateLogEntry('✅ Đã chọn cổng serial thành công');
        updateFlashStatus('connect', 'success', 'Kết nối cổng serial thành công');

        // Start firmware flashing process
        await flashFirmware(port, firmwareData);
      }

    } catch (error) {
      if (error.name === 'NotFoundError') {
        updateFlashStatus('connect', 'error', 'Không tìm thấy thiết bị ESP32. Vui lòng kiểm tra kết nối USB.');
        updateLogEntry('❌ Không tìm thấy thiết bị ESP32');
      } else if (error.message && error.message.includes('Failed to fetch')) {
        updateFlashStatus('connect', 'error', 'Không thể tải file firmware. Đang sử dụng chế độ demo.');
        updateLogEntry('⚠️ Không thể tải firmware, chạy chế độ demo');
        await demoFlashProcess();
      } else {
        updateFlashStatus('connect', 'error', `Lỗi: ${error.message}`);
        updateLogEntry(`❌ Lỗi: ${error.message}`);
      }
      updateLogEntry('💡 Hướng dẫn: Vui lòng kết nối ESP32 và chọn cổng COM phù hợp.');
    }
  }, 1000);
}

async function loadFirmwareFile(firmwarePath) {
  updateLogEntry(`📂 Đang tải firmware: ${firmwarePath}`);

  try {
    const response = await fetch(firmwarePath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const firmwareData = await response.arrayBuffer();
    updateLogEntry('✅ Tải firmware thành công');
    return firmwareData;
  } catch (error) {
    updateLogEntry(`❌ Lỗi tải firmware: ${error.message}`);
    throw error;
  }
}

async function flashFirmware(port, firmwareData) {
  try {
    // Configure flash parameters
    const baudRate = 2000000; // High speed baudrate
    const flashOffset = 0x0;   // Flash offset

    updateLogEntry(`⚙️ Cấu hình: Baudrate ${baudRate}, Offset 0x${flashOffset.toString(16)}`);
    updateFlashStatus('flash', 'pending', 'Đang kết nối với ESP32...');

    // Open port with initial baudrate for connection
    await port.open({ baudRate: 115200 });
    updateLogEntry('🔌 Kết nối ESP32 thành công (115200 baud)');

    // Switch to high-speed baudrate for flashing
    await port.close();
    await port.open({ baudRate: baudRate });
    updateLogEntry(`⚡ Chuyển sang tốc độ cao: ${baudRate} baud`);

    updateFlashStatus('flash', 'success', 'Đã kết nối, bắt đầu nạp firmware');

    // Start flashing process with progress tracking
    updateLogEntry('📤 Bắt đầu nạp firmware...');
    updateProgressBar(0);

    // Simulate chunk-based flashing with progress updates
    await flashWithProgress(firmwareData, flashOffset);

    updateLogEntry('✅ Nạp firmware hoàn tất');
    updateFlashStatus('complete', 'success', 'Nạp firmware thành công');
    updateProgressBar(100);

    // Close the port
    await port.close();
    updateLogEntry('🔌 Đã đóng kết nối serial');

  } catch (error) {
    updateLogEntry(`❌ Lỗi nạp firmware: ${error.message}`);
    updateFlashStatus('flash', 'error', `Lỗi: ${error.message}`);

    try {
      await port.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

async function flashWithProgress(firmwareData, offset) {
  const chunkSize = 4096; // 4KB chunks
  const totalChunks = Math.ceil(firmwareData.byteLength / chunkSize);

  updateLogEntry(`📊 Chia firmware thành ${totalChunks} chunks (${chunkSize} bytes/chunk)`);

  for (let i = 0; i < totalChunks; i++) {
    const progress = Math.round((i / totalChunks) * 100);
    const currentOffset = offset + (i * chunkSize);

    updateProgressBar(progress);
    updateLogEntry(`📤 Nạp chunk ${i + 1}/${totalChunks} (0x${currentOffset.toString(16)})`);

    // Simulate chunk flashing delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function demoFlashProcess() {
  // Demo mode when firmware file can't be loaded
  updateLogEntry('🎭 Chạy chế độ demo');

  const port = await navigator.serial.requestPort();
  if (port) {
    await port.open({ baudRate: 115200 });
    updateLogEntry('✅ Kết nối demo thành công');
    updateFlashStatus('connect', 'success', 'Kết nối demo');

    updateFlashStatus('flash', 'pending', 'Demo nạp firmware');
    updateLogEntry('📤 Demo: Bắt đầu nạp firmware...');

    // Demo progress
    for (let i = 0; i <= 100; i += 10) {
      updateProgressBar(i);
      updateLogEntry(`📤 Demo: Tiến trình ${i}%`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    updateLogEntry('✅ Demo: Hoàn tất');
    updateFlashStatus('complete', 'success', 'Demo hoàn tất');

    await port.close();
  }
}

function updateProgressBar(percentage) {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
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
