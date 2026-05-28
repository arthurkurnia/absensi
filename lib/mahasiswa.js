const fs = require('fs');
const path = require('path');

// ================= TRIK DETEKSI AMAN UNTUK VERCEL SERVERLESS =================
const isVercel = process.env.VERCEL;
const rootDir = process.cwd();
const dbPath = isVercel ? path.join('/tmp', 'database.json') : path.join(rootDir, 'database.json');

// Salin struktur database ke folder /tmp jika berjalan di Vercel dan file belum ada
if (isVercel && !fs.existsSync(dbPath)) {
    try {
        const templatePath = path.join(rootDir, 'database.json');
        if (fs.existsSync(templatePath)) {
            fs.writeFileSync(dbPath, fs.readFileSync(templatePath, 'utf8'));
        } else {
            // Skema fallback jika file database.json utama tidak sengaja hilang
            fs.writeFileSync(dbPath, JSON.stringify({ mahasiswa: [], dosen: [], admin: [], absensi: [] }, null, 2));
        }
    } catch (e) {
        console.error("Gagal melakukan inisialisasi database di folder /tmp Vercel:", e);
    }
}

// ================= FUNGSI PEMBANTU (HELPER ACTIONS) =================
function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            return { mahasiswa: [], dosen: [], admin: [], absensi: [] };
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Gagal membaca database:", error);
        return { mahasiswa: [], dosen: [], admin: [], absensi: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error("Gagal menulis ke database:", error);
        return false;
    }
}

// ================= CORE BUSINESS LOGIC MAHASISWA =================

/**
 * Autentikasi Login Mahasiswa
 * @param {string} nim 
 * @param {string} password 
 * @returns {object|null} Data mahasiswa jika sukses, null jika gagal
 */
function loginMahasiswa(nim, password) {
    const db = readDatabase();
    const user = db.mahasiswa.find(m => m.nim === nim && m.password === password);
    
    if (user) {
        // Hanya izinkan masuk jika status akun sudah disetujui (approved) oleh admin
        if (user.status === 'approved') {
            return { success: true, data: user };
        } else if (user.status === 'pending') {
            return { success: false, message: 'Akun Anda masih dalam antrean peninjauan Admin.' };
        } else {
            return { success: false, message: 'Pengajuan akun Anda ditolak oleh Admin.' };
        }
    }
    return { success: false, message: 'NIM atau Password yang Anda masukkan salah.' };
}

/**
 * Pengajuan Registrasi Mahasiswa Baru (Masuk Antrean Admin)
 * @param {object} dataDataMhs { nama, nim, password }
 * @returns {object} Status pendaftaran
 */
function registerMahasiswa(dataDataMhs) {
    const db = readDatabase();
    
    // Validasi apakah NIM sudah pernah didaftarkan sebelumnya
    const isExist = db.mahasiswa.some(m => m.nim === dataDataMhs.nim);
    if (isExist) {
        return { success: false, message: 'NIM tersebut sudah terdaftar di dalam sistem.' };
    }

    // Bentuk objek penampung data mahasiswa baru
    const mahasiswaBaru = {
        id: 'mhs_' + Date.now(),
        nama: dataDataMhs.nama,
        nim: dataDataMhs.nim,
        password: dataDataMhs.password,
        status: 'pending', // Wajib di-approve admin dulu di dashboard admin
        createdAt: new Date().toISOString()
    };

    db.mahasiswa.push(mahasiswaBaru);
    const saved = writeDatabase(db);
    
    if (saved) {
        return { success: true, message: 'Pendaftaran berhasil diajukan! Silakan tunggu konfirmasi pihak admin.' };
    }
    return { success: false, message: 'Terjadi masalah pada server saat menyimpan data.' };
}

/**
 * Proses Pencatatan Kehadiran / Absensi Mahasiswa
 * @param {string} nim 
 * @param {string} kodeAbsen 
 * @returns {object} Status absensi
 */
function catatAbsensi(nim, kodeAbsen) {
    const db = readDatabase();
    
    // Cari session atau jadwal absensi aktif yang dibuat oleh dosen
    const sesiAktif = db.absensi.find(a => a.kodeAbsen === kodeAbsen && a.status === 'active');
    if (!sesiAktif) {
        return { success: false, message: 'Kode absensi salah atau waktu absensi telah berakhir.' };
    }

    // Cek apakah mahasiswa yang bersangkutan sudah melakukan absen di sesi ini
    const sudahAbsen = sesiAktif.hadir.some(h => h.nim === nim);
    if (sudahAbsen) {
        return { success: false, message: 'Anda sudah tercatat melakukan absensi pada sesi kelas ini.' };
    }

    // Ambil data detail profil mahasiswa
    const mhs = db.mahasiswa.find(m => m.nim === nim);
    if (!mhs) {
        return { success: false, message: 'Data Mahasiswa tidak ditemukan di sistem.' };
    }

    // Masukkan data mahasiswa ke array daftar hadir di dalam objek absensi terkait
    sesiAktif.hadir.push({
        nim: mhs.nim,
        nama: mhs.nama,
        waktuAbsen: new Date().toISOString()
    });

    const saved = writeDatabase(db);
    if (saved) {
        return { success: true, message: `Absensi kelas ${sesiAktif.matakuliah} berhasil dicatat!` };
    }
    return { success: false, message: 'Gagal memproses absensi akibat gangguan database.' };
}

/**
 * Mengambil Riwayat Kehadiran Spesifik Milik Satu Mahasiswa
 * @param {string} nim 
 * @returns {array} Daftar kelas yang pernah dihadiri
 */
function dapatkanRiwayatAbsen(nim) {
    const db = readDatabase();
    const riwayat = [];

    db.absensi.forEach(sesi => {
        const dataHadir = sesi.hadir.find(h => h.nim === nim);
        if (dataHadir) {
            riwayat.push({
                matakuliah: sesi.matakuliah,
                dosen: sesi.dosen,
                tanggal: sesi.tanggal,
                waktuAbsen: dataHadir.waktuAbsen
            });
        }
    });

    // Urutkan berdasarkan waktu absen terbaru
    return riwayat.sort((a, b) => new Date(b.waktuAbsen) - new Date(a.waktuAbsen));
}

module.exports = {
    loginMahasiswa,
    registerMahasiswa,
    catatAbsensi,
    dapatkanRiwayatAbsen
};