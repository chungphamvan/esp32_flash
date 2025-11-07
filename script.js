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
