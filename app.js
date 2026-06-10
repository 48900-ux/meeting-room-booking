// ===== CONFIG =====
const API_URL = 'https://script.google.com/macros/s/AKfycbyWTlE94PpDSCasMQKmuQ2MLZQCkkzF_voWtqDofGooHhbHgNFXwGgIlMO3UHkur3xI8g/exec'; // ← ใส่ URL จาก Step 2

// ===== STATE =====
let rooms = [];
let currentRoom = null;
let currentDate = new Date();
let bookings = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadRooms();
  generateTimeOptions();
  renderDateDisplay();
  if (rooms.length > 0) selectRoom(rooms[0]);
});

// ===== ROOMS =====
async function loadRooms() {
  try {
    const res = await fetch(`${API_URL}?action=getRooms`);
    rooms = await res.json();
    renderRoomList();
  } catch(e) {
    console.error(e);
  }
}

function renderRoomList() {
  const el = document.getElementById('roomList');
  el.innerHTML = rooms.map(room => `
    <div class="room-card ${currentRoom?.id == room.id ? 'active' : ''}" onclick="selectRoom(${JSON.stringify(room).replace(/"/g,"'")})">
      <img src="${room.image_url}" alt="${room.name}" onerror="this.src='https://via.placeholder.com/240x130?text=ห้องประชุม'">
      <div class="room-card-body">
        <h4>${room.name}</h4>
        <div class="room-capacity">👥 รองรับ ${room.capacity} คน</div>
        <button class="btn-view" onclick="event.stopPropagation(); openBookingModal(${room.id})">ดูตาราง / จอง</button>
      </div>
    </div>
  `).join('');
}

function selectRoom(room) {
  currentRoom = room;
  document.getElementById('selectedRoomName').textContent = room.name;
  renderRoomList();
  loadSchedule();
  renderRoomInfo();
}

function renderRoomInfo() {
  if (!currentRoom) return;
  document.getElementById('roomInfo').innerHTML = `
    <div class="info-item">👥 รองรับสูงสุด ${currentRoom.capacity} คน</div>
    <div class="info-item">🖥️ อุปกรณ์: ${currentRoom.equipment}</div>
    <div class="info-item">📶 สิ่งอำนวยความสะดวก: Wi-Fi, ปลั๊กไฟ, กระดานไวท์บอร์ด</div>
  `;
}

// ===== SCHEDULE =====
async function loadSchedule() {
  if (!currentRoom) return;
  const dateStr = formatDate(currentDate);
  try {
    const res = await fetch(`${API_URL}?action=getBookings&date=${dateStr}&room_id=${currentRoom.id}`);
    bookings = await res.json();
    renderSchedule();
  } catch(e) {
    console.error(e);
    bookings = [];
    renderSchedule();
  }
}

function renderSchedule() {
  const body = document.getElementById('scheduleBody');
  const hours = [];
  for (let h = 8; h <= 18; h++) hours.push(h);

  body.innerHTML = hours.map(h => {
    const timeStr = `${String(h).padStart(2,'0')}:00`;
    const booking = bookings.find(b => {
      const start = parseInt(b.start_time.split(':')[0]);
      const end = parseInt(b.end_time.split(':')[0]);
      return h >= start && h < end;
    });

    let eventHtml = '';
    if (booking) {
      const statusClass = booking.status === 'confirmed' ? 'confirmed' : 'pending';
      eventHtml = `
        <div class="booking-block ${statusClass}">
          <div>
            <div class="booking-time">${booking.start_time} - ${booking.end_time}</div>
            <div>${booking.title}</div>
          </div>
          <div style="font-size:12px;color:#666">${booking.booker_name}</div>
        </div>`;
    }

    return `
      <div class="time-slot" onclick="${!booking ? `openBookingModal(${currentRoom.id}, '${timeStr}')` : ''}">
        <div class="time-label">${timeStr}</div>
        <div style="flex:1">${eventHtml}</div>
      </div>`;
  }).join('');
}

// ===== DATE =====
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateThai(d) {
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function renderDateDisplay() {
  document.getElementById('currentDateDisplay').textContent = formatDateThai(currentDate);
}

function changeDate(delta) {
  currentDate.setDate(currentDate.getDate() + delta);
  renderDateDisplay();
  loadSchedule();
}

function goToday() {
  currentDate = new Date();
  renderDateDisplay();
  loadSchedule();
}

// ===== BOOKING MODAL =====
function generateTimeOptions() {
  const times = [];
  for (let h = 8; h <= 18; h++) {
    times.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 18) times.push(`${String(h).padStart(2,'0')}:30`);
  }
  const start = document.getElementById('startTime');
  const end = document.getElementById('endTime');
  times.forEach(t => {
    start.innerHTML += `<option value="${t}">${t}</option>`;
    end.innerHTML += `<option value="${t}">${t}</option>`;
  });
  start.value = '09:00';
  end.value = '10:00';
}

function openBookingModal(roomId, prefillTime) {
  currentRoom = rooms.find(r => r.id == roomId) || currentRoom;
  document.getElementById('modalTitle').textContent = `จอง${currentRoom?.name || 'ห้องประชุม'}`;
  document.getElementById('bookDate').value = formatDate(currentDate);
  if (prefillTime) {
    document.getElementById('startTime').value = prefillTime;
  }
  validateDate();
  document.getElementById('bookingModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('bookingModal').style.display = 'none';
}

function validateDate() {
  const val = document.getElementById('bookDate').value;
  const el = document.getElementById('dateError');
  if (!val) return;

  const selected = new Date(val);
  selected.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = (selected - today) / (1000*60*60*24);

  if (diff < 0) { el.textContent = '❌ ไม่สามารถจองวันที่ผ่านมาแล้ว'; return false; }
  if (diff > 2) { el.textContent = '❌ จองล่วงหน้าได้ไม่เกิน 2 วัน'; return false; }
  el.textContent = '';
  return true;
}

async function submitBooking() {
  if (!validateDate()) return;

  const data = {
    action: 'addBooking',
    date: document.getElementById('bookDate').value,
    start_time: document.getElementById('startTime').value,
    end_time: document.getElementById('endTime').value,
    room_id: currentRoom.id,
    title: document.getElementById('bookTitle').value.trim(),
    booker_name: document.getElementById('bookerName').value.trim(),
    student_id: document.getElementById('studentId').value.trim(),
    department: document.getElementById('department').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    note: document.getElementById('note').value.trim(),
  };

  // Validate
  if (!data.title || !data.booker_name || !data.student_id || !data.department || !data.phone) {
    showToast('❌ กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }
  if (!/^\d{10}$/.test(data.student_id)) {
    showToast('❌ เลขบัตรนิสิตต้องเป็นตัวเลข 10 หลัก');
    return;
  }
  if (data.start_time >= data.end_time) {
    showToast('❌ เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('✅ จองสำเร็จ!');
      closeModal();
      loadSchedule();
    } else {
      showToast(`❌ ${result.message}`);
    }
  } catch(e) {
    showToast('❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}

// ===== MY BOOKINGS =====
function showTab(tab) {
  if (tab === 'mybookings') {
    const sid = prompt('กรุณากรอกเลขบัตรนิสิตของคุณ:');
    if (sid) loadMyBookings(sid);
  }
}

async function loadMyBookings(studentId) {
  try {
    const res = await fetch(`${API_URL}?action=getMyBookings&student_id=${studentId}`);
    const data = await res.json();
    renderMyBookings(data, studentId);
    document.getElementById('myBookingsSection').style.display = 'block';
  } catch(e) {
    showToast('❌ ไม่สามารถโหลดข้อมูลได้');
  }
}

function renderMyBookings(bookings, studentId) {
  const el = document.getElementById('myBookingsList');
  if (!bookings.length) { el.innerHTML = '<p style="font-size:13px;color:#999">ไม่มีการจอง</p>'; return; }

  el.innerHTML = bookings.map(b => {
    const room = rooms.find(r => r.id == b.room_id);
    return `
      <div class="booking-item">
        <div class="booking-item-header">
          ${b.title}
          <span class="badge ${b.status}">${b.status === 'confirmed' ? 'ยืนยันแล้ว' : b.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'รออนุมัติ'}</span>
        </div>
        <div>${b.date} | ${b.start_time} - ${b.end_time}</div>
        <div>${room?.name || 'ห้องประชุม'}</div>
        ${b.status !== 'cancelled' ? `<button class="btn-cancel-booking" onclick="cancelBooking('${b.id}','${studentId}')">ยกเลิกการจอง</button>` : ''}
      </div>`;
  }).join('');
}

async function cancelBooking(id, studentId) {
  if (!confirm('ยืนยันการยกเลิกการจอง?')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancelBooking', id, student_id: studentId })
    });
    const result = await res.json();
    showToast(result.success ? '✅ ยกเลิกสำเร็จ' : `❌ ${result.message}`);
    if (result.success) loadMyBookings(studentId);
  } catch(e) {
    showToast('❌ เกิดข้อผิดพลาด');
  }
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showLoginModal() {
  showTab('mybookings');
}