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
            fs.writeFileSync(dbPath, JSON.stringify({
                mahasiswa: {}, dosen: {}, admin: { admin: 'admin123' },
                absensi: [], kodeAktivasi: {}
            }, null, 2));
        }
    } catch (e) {
        console.error("Gagal melakukan inisialisasi database di folder /tmp Vercel:", e);
    }
}

// ================= FUNGSI PEMBANTU (HELPER) =================
function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            return { mahasiswa: {}, dosen: {}, admin: {}, absensi: [], kodeAktivasi: {} };
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Gagal membaca database:", error);
        return { mahasiswa: {}, dosen: {}, admin: {}, absensi: [], kodeAktivasi: {} };
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

// ================= CLASS MAHASISWA =================
class Mahasiswa {
    static getDB() {
        return readDatabase();
    }

    static saveDB(data) {
        return writeDatabase(data);
    }

    static login(nim, password) {
        const db = readDatabase();
        const user = db.mahasiswa[nim];
        if (!user) return { success: false, message: 'NIM atau Password yang Anda masukkan salah.' };

        if (user.password !== password) return { success: false, message: 'NIM atau Password yang Anda masukkan salah.' };

        if (user.status === 'approved') {
            return { success: true, data: user };
        } else if (user.status === 'pending') {
            return { success: false, message: 'Akun Anda masih dalam antrean peninjauan Admin.' };
        } else {
            return { success: false, message: `Pengajuan akun Anda ditolak. Alasan: ${user.alasan || '-'}` };
        }
    }

    static daftarBaru(nim, nama, password) {
        const db = readDatabase();
        if (db.mahasiswa[nim]) {
            return { success: false, message: 'NIM tersebut sudah terdaftar di dalam sistem.' };
        }
        db.mahasiswa[nim] = {
            nama,
            password,
            pernahGantiPassword: false,
            status: 'pending',
            alasan: ''
        };
        const saved = writeDatabase(db);
        if (saved) {
            return { success: true, message: 'Pendaftaran berhasil diajukan! Silakan tunggu konfirmasi pihak admin.' };
        }
        return { success: false, message: 'Terjadi masalah pada server saat menyimpan data.' };
    }

    static gantiPassword(nim, newPassword) {
        const db = readDatabase();
        if (db.mahasiswa[nim]) {
            db.mahasiswa[nim].password = newPassword;
            db.mahasiswa[nim].pernahGantiPassword = true;
            writeDatabase(db);
        }
    }

    static inputKodeAbsen(nim, kode, matkul) {
        const db = readDatabase();
        const kodeData = db.kodeAktivasi[kode];

        if (!kodeData) return { success: false, message: 'Kode absensi tidak valid atau tidak ditemukan.' };
        if (Date.now() > kodeData.expiredAt) return { success: false, message: 'Kode absensi sudah kadaluarsa.' };
        if (kodeData.matkul !== matkul) return { success: false, message: 'Kode absensi tidak sesuai dengan mata kuliah yang dipilih.' };

        // Cek apakah mahasiswa sudah absen di sesi ini (nim + matkul + tanggal hari ini)
        const today = new Date().toISOString().split('T')[0];
        const sudahAbsen = db.absensi.some(a => a.nim === nim && a.matkul === matkul && a.tanggal === today);
        if (sudahAbsen) return { success: false, message: 'Anda sudah tercatat hadir pada mata kuliah ini hari ini.' };

        db.absensi.push({ nim, matkul, status: 'Hadir', tanggal: today });
        writeDatabase(db);
        return { success: true, message: `Absensi ${matkul} berhasil dicatat! Selamat belajar!` };
    }

    static getRekapPribadi(nim, bulanFilter) {
        const db = readDatabase();
        let list = db.absensi.filter(a => a.nim === nim);
        if (bulanFilter) {
            list = list.filter(a => a.tanggal.startsWith(bulanFilter));
        }
        list = list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        return {
            list,
            totalHadir: list.length,
            totalTidakHadir: 0
        };
    }
}

module.exports = Mahasiswa;
