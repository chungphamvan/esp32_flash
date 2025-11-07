let port;
let esploader;
let connected = false;

const connectBtn = document.getElementById('connectBtn');
const flashBtn = document.getElementById('flashBtn');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const firmwareFile = document.getElementById('firmwareFile');

connectBtn.addEventListener('click', async () => {
  try {
    statusEl.textContent = "Đang kết nối với thiết bị...";
    port = await navigator.serial.requestPort({});
    await port.open({ baudRate: 115200 });
    esploader = new esptool.ESPLoader(port);
    await esploader.initialize();
    const chip = await esploader.chipName();
    statusEl.textContent = `✅ Đã kết nối: ${chip}`;
    connected = true;
    flashBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = "❌ Không thể kết nối: " + err;
  }
});

flashBtn.addEventListener('click', async () => {
  if (!connected) return alert("Chưa kết nối ESP32-S3");
  const file = firmwareFile.files[0];
  if (!file) return alert("Chọn file .bin trước!");

  const reader = new FileReader();
  reader.onload = async () => {
    const binary = new Uint8Array(reader.result);
    statusEl.textContent = "⚡ Đang nạp firmware...";
    progressEl.value = 0;

    try {
      await esploader.flashData(binary, (bytesWritten, totalBytes) => {
        progressEl.value = (bytesWritten / totalBytes) * 100;
      });
      statusEl.textContent = "✅ Nạp hoàn tất!";
    } catch (err) {
      statusEl.textContent = "❌ Lỗi khi nạp: " + err;
    }
  };
  reader.readAsArrayBuffer(file);
});
