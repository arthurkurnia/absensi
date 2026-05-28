const fs = require('fs');
const path = require('path');

const JSONBIN_BIN_ID  = '6a18b36d21f9ee59d2971b15';
const JSONBIN_API_KEY = '$2a$10$AsFN0DUSNd5cmhk29eTAZuLDCVYttLszFYGjhkp5Qwbg4KB4RNfuS';

const DEFAULT_DB = {
    mahasiswa: {},
    dosen: {},
    admin: [
        { id: 'admin_01', username: 'admin', password: 'admin123', nama: 'Admin Utama' }
    ],
    absensi: [],
    kodeAktivasi: {}
};

async function readCloudDB() {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        const json = await res.json();
        return json.record || DEFAULT_DB;
    } catch (e) {
        console.error('Gagal baca JSONBin:', e);
        return { ...DEFAULT_DB };
    }
}

async function writeCloudDB(data) {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) {
        console.error('Gagal tulis JSONBin:', e);
        return false;
    }
}

const dbPath = path.join(process.cwd(), 'database.json');

function readLocalDB() {
    try {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(DEFAULT_DB, null, 2));
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return { ...DEFAULT_DB };
    }
}

function writeLocalDB(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

const useCloud = JSONBIN_BIN_ID !== 'ISI_BIN_ID_KAMU_DI_SINI';

let dbCache = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

class Mahasiswa {
    static getDB() {
        if (!useCloud) return readLocalDB();
        return dbCache || { ...DEFAULT_DB };
    }

    static saveDB(data) {
        dbCache = data;
        cacheTime = Date.now();
        if (!useCloud) return writeLocalDB(data);
        writeCloudDB(data).catch(e => console.error('Async write error:', e));
        return true;
    }

    static async refreshCache() {
        if (!useCloud) return;
        if (dbCache && (Date.now() - cacheTime < CACHE_TTL)) return;
        dbCache = await readCloudDB();
        cacheTime = Date.now();
    }

    static async login(nim, password) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        const user = db.mahasiswa[nim];
        if (!user) return { success: false, message: 'NIM atau Password yang Anda masukkan salah.' };
        if (user.password !== password) return { success: false, message: 'NIM atau Password yang Anda masukkan salah.' };
        if (user.status === 'approved') return { success: true, data: user };
        if (user.status === 'pending') return { success: false, message: 'Akun Anda masih dalam antrean peninjauan Admin.' };
        return { success: false, message: `Pengajuan akun Anda ditolak. Alasan: ${user.alasan || '-'}` };
    }

    static async daftarBaru(nim, nama, password) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        if (db.mahasiswa[nim]) return { success: false, message: 'NIM tersebut sudah terdaftar di dalam sistem.' };
        db.mahasiswa[nim] = { nama, password, pernahGantiPassword: false, status: 'pending', alasan: '' };
        Mahasiswa.saveDB(db);
        await writeCloudDB(db);
        return { success: true, message: 'Pendaftaran berhasil diajukan! Silakan tunggu konfirmasi pihak admin.' };
    }

    static async gantiPassword(nim, newPassword) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        if (db.mahasiswa[nim]) {
            db.mahasiswa[nim].password = newPassword;
            db.mahasiswa[nim].pernahGantiPassword = true;
            Mahasiswa.saveDB(db);
            await writeCloudDB(db);
        }
    }

    static async inputKodeAbsen(nim, kode, matkul) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        const kodeData = db.kodeAktivasi[kode];
        if (!kodeData) return { success: false, message: 'Kode absensi tidak valid atau tidak ditemukan.' };
        if (Date.now() > kodeData.expiredAt) return { success: false, message: 'Kode absensi sudah kadaluarsa.' };
        if (kodeData.matkul !== matkul) return { success: false, message: 'Kode absensi tidak sesuai dengan mata kuliah yang dipilih.' };
        const today = new Date().toISOString().split('T')[0];
        const sudahAbsen = db.absensi.some(a => a.nim === nim && a.matkul === matkul && a.tanggal === today);
        if (sudahAbsen) return { success: false, message: 'Anda sudah tercatat hadir pada mata kuliah ini hari ini.' };
        db.absensi.push({ nim, matkul, status: 'Hadir', tanggal: today });
        Mahasiswa.saveDB(db);
        await writeCloudDB(db);
        return { success: true, message: `Absensi ${matkul} berhasil dicatat! Selamat belajar!` };
    }

    static async getRekapPribadi(nim, bulanFilter) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        let list = db.absensi.filter(a => a.nim === nim);
        if (bulanFilter) list = list.filter(a => a.tanggal.startsWith(bulanFilter));
        list = list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        return { list, totalHadir: list.length, totalTidakHadir: 0 };
    }
}

module.exports = Mahasiswa;
