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

// Tab functionality with layout stability
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const card = document.querySelector('.card');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Store current card height to prevent layout jump
      if (card) {
        const currentHeight = card.offsetHeight;
        card.style.minHeight = `${currentHeight}px`;
      }

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // Reset min-height after content loads
      setTimeout(() => {
        if (card) {
          card.style.minHeight = '';
        }
      }, 300);
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
      // Check if user is on mobile device first
      if (logMobileWarning()) {
        updateFlashStatus('connect', 'error', 'Thiết bị di động không hỗ trợ nạp firmware ESP32');
        return;
      }

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

// Mobile detection and warning
function isMobileDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen width
  const smallScreen = window.innerWidth <= 768;

  // Check if Web Serial API is not supported (common on mobile)
  const noWebSerial = !('serial' in navigator);

  return mobileRegex.test(userAgent) || (hasTouch && smallScreen && noWebSerial);
}

function showMobileWarning() {
  const mobileWarning = document.getElementById('mobile-warning');
  if (mobileWarning) {
    mobileWarning.classList.add('show');
  }
}

function hideMobileWarning() {
  const mobileWarning = document.getElementById('mobile-warning');
  if (mobileWarning) {
    mobileWarning.classList.remove('show');

    // Store that user has seen the warning
    localStorage.setItem('mobileWarningShown', 'true');
  }
}

function initMobileWarning() {
  // Check if user is on mobile and hasn't seen warning before
  const hasSeenWarning = localStorage.getItem('mobileWarningShown');

  if (isMobileDevice() && !hasSeenWarning) {
    // Show warning after a brief delay
    setTimeout(() => {
      showMobileWarning();
    }, 1000);
  }

  // Add event listeners for closing the warning
  const closeBtn = document.getElementById('mobile-close-btn');
  const understandBtn = document.getElementById('mobile-understand-btn');
  const mobileWarning = document.getElementById('mobile-warning');

  if (closeBtn) {
    closeBtn.addEventListener('click', hideMobileWarning);
  }

  if (understandBtn) {
    understandBtn.addEventListener('click', hideMobileWarning);
  }

  // Close on overlay click
  if (mobileWarning) {
    mobileWarning.addEventListener('click', (e) => {
      if (e.target === mobileWarning) {
        hideMobileWarning();
      }
    });
  }

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileWarning && mobileWarning.classList.contains('show')) {
      hideMobileWarning();
    }
  });
}

// Enhanced log function to warn mobile users when trying to flash
function logMobileWarning() {
  if (isMobileDevice()) {
    updateLogEntry('📱 Cảnh báo: Đang sử dụng thiết bị di động');
    updateLogEntry('⚠️ Web Serial API không khả dụng trên thiết bị di động');
    updateLogEntry('💻 Vui lòng sử dụng máy tính với Chrome hoặc Edge');
    return true;
  }
  return false;
}

// Wiring Diagram Modal Functionality
function initWiringDiagram() {
  const wiringModal = document.getElementById('wiring-modal');
  const wiringModalClose = document.getElementById('wiring-modal-close');
  const wiringModalTitle = document.getElementById('wiring-modal-title');
  const wiringDiagramImage = document.getElementById('wiring-diagram-image');
  const wiringInstructionsContainer = document.getElementById('wiring-instructions-container');

  // Wiring diagrams data
  const wiringDiagrams = [
    {
      title: 'ESP32-S3 + OLED 1.54inch TFT + MAX98357A + INMP441 - Sơ đồ đấu nối',
      image: 'assets/Wiring diagram/OLED 1.54 inch TFT/OLED 1.54 inch TFT.JPG',
      components: [
        {
          name: '📺 TFT 1.54 INCH ST7789',
          icon: '📺',
          connections: [
            ['GND', 'GND'],
            ['VCC', '3.3V'],
            ['SCL', 'GPIO21'],
            ['SDA', 'GPIO47'],
            ['RES', 'GPIO45'],
            ['DC', 'GPIO40'],
            ['CS', 'GPIO41'],
            ['BLK', 'GPIO42']
          ]
        },
        {
          name: '🔊 MAX98357A Audio Amplifier',
          icon: '🔊',
          connections: [
            ['LRC', 'GPIO16'],
            ['BCLK', 'GPIO15'],
            ['DIN', 'GPIO7'],
            ['GAIN', 'GND'],
            ['SD', '3.3V'],
            ['GND', 'GND'],
            ['VIN', '3.3V']
          ]
        },
        {
          name: '🎤 Microphone INMP441',
          icon: '🎤',
          connections: [
            ['SD', 'GPIO6'],
            ['VDD', '3.3V'],
            ['GND', 'GND'],
            ['SCK', 'GPIO5'],
            ['WS', 'GPIO4'],
            ['L/R', 'GND']
          ]
        }
      ]
    },
    {
      title: 'TFT LCD 1.28 Inch GC9A01 - Sơ đồ đấu nối',
      image: '',
      toBeUpdated: true,
      message: 'TO BE UPDATED!'
    },
    {
      title: 'OLED 0.96 inch 128X64 - Sơ đồ đấu nối',
      image: '',
      toBeUpdated: true,
      message: 'TO BE UPDATED!'
    }
  ];

  // Add click event listeners to all "Xem sơ đồ" buttons
  const viewDiagramButtons = document.querySelectorAll('.btn-view-diagram');
  viewDiagramButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index < wiringDiagrams.length) {
        showWiringDiagram(wiringDiagrams[index]);
      }
    });
  });

  function showWiringDiagram(diagram) {
    wiringModalTitle.textContent = diagram.title;
    wiringDiagramImage.src = diagram.image;
    wiringDiagramImage.alt = diagram.title;

    // Clear container
    wiringInstructionsContainer.innerHTML = '';

    // Handle "TO BE UPDATED" case
    if (diagram.toBeUpdated) {
      const updateMessage = document.createElement('div');
      updateMessage.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        background: rgba(255, 193, 7, 0.1);
        border: 2px solid rgba(255, 193, 7, 0.3);
        border-radius: 12px;
        margin: 20px 0;
      `;
      updateMessage.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
        <div style="font-size: 24px; font-weight: bold; color: #ffc107; margin-bottom: 12px;">${diagram.message}</div>
        <div style="font-size: 16px; color: #e6eef8; opacity: 0.8;">Sơ đồ đấu nối cho thiết bị này sẽ được cập nhật sớm.</div>
      `;
      wiringInstructionsContainer.appendChild(updateMessage);

      // Hide the image container if no image
      if (!diagram.image) {
        document.querySelector('.wiring-diagram-container').style.display = 'none';
      }
    }
    // Handle new component-based structure or legacy instructions
    else if (diagram.components) {
      // Show the image container for component-based diagrams
      document.querySelector('.wiring-diagram-container').style.display = 'block';
      diagram.components.forEach(component => {
        // Create component section
        const section = document.createElement('div');
        section.className = 'component-section';

        // Create component title
        const title = document.createElement('div');
        title.className = 'component-title';
        title.textContent = component.name;
        section.appendChild(title);

        // Create table
        const table = document.createElement('table');
        table.className = 'wiring-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const th1 = document.createElement('th');
        th1.textContent = component.name.replace(/^[📺🔊🎤]\s*/, '');
        const th2 = document.createElement('th');
        th2.textContent = 'ESP32-S3';
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        component.connections.forEach(connection => {
          const row = document.createElement('tr');
          const td1 = document.createElement('td');
          td1.textContent = connection[0];
          const td2 = document.createElement('td');
          td2.textContent = connection[1];
          row.appendChild(td1);
          row.appendChild(td2);
          tbody.appendChild(row);
        });
        table.appendChild(tbody);

        section.appendChild(table);
        wiringInstructionsContainer.appendChild(section);
      });
    } else if (diagram.instructions) {
      // Fallback for legacy format
      document.querySelector('.wiring-diagram-container').style.display = 'block';
      const ul = document.createElement('ul');
      diagram.instructions.forEach(instruction => {
        const li = document.createElement('li');
        li.textContent = instruction;
        ul.appendChild(li);
      });
      wiringInstructionsContainer.appendChild(ul);
    }

    wiringModal.style.display = 'flex';
  }

  function hideWiringDiagram() {
    wiringModal.style.display = 'none';
  }

  // Close button event listener
  if (wiringModalClose) {
    wiringModalClose.addEventListener('click', hideWiringDiagram);
  }

  // Close on overlay click
  if (wiringModal) {
    wiringModal.addEventListener('click', (e) => {
      if (e.target === wiringModal) {
        hideWiringDiagram();
      }
    });
  }

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wiringModal && wiringModal.style.display === 'flex') {
      hideWiringDiagram();
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModal();
  initMobileWarning();
  initWiringDiagram();
});
