const fs = require('fs');
const path = require('path');

// TRIK SAKTI BYPASS READ-ONLY VERCEL VIA /TMP
const isVercel = process.env.VERCEL;
const rootDir = process.cwd();
const dbPath = isVercel ? path.join('/tmp', 'database.json') : path.join(rootDir, 'database.json');

// Sinkronisasi database awal ke folder /tmp serverless
if (isVercel && !fs.existsSync(dbPath)) {
    try {
        const templatePath = path.join(rootDir, 'database.json');
        if (fs.existsSync(templatePath)) {
            fs.writeFileSync(dbPath, fs.readFileSync(templatePath, 'utf8'));
        } else {
            fs.writeFileSync(dbPath, JSON.stringify({ mahasiswa: [], dosen: [], admin: [], absensi: [] }, null, 2));
        }
    } catch (e) {
        console.error("Gagal inisialisasi database di /tmp:", e);
    }
}

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) return { mahasiswa: [], dosen: [], admin: [], absensi: [] };
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return { mahasiswa: [], dosen: [], admin: [], absensi: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

function loginMahasiswa(nim, password) {
    const db = readDatabase();
    const user = db.mahasiswa.find(m => m.nim === nim && m.password === password);
    if (user) {
        if (user.status === 'approved') return { success: true, data: user };
        if (user.status === 'pending') return { success: false, message: 'Akun Anda masih dalam antrean peninjauan Admin.' };
        return { success: false, message: 'Pengajuan akun Anda ditolak oleh Admin.' };
    }
    return { success: false, message: 'NIM atau Password salah.' };
}

function registerMahasiswa(data) {
    const db = readDatabase();
    if (db.mahasiswa.some(m => m.nim === data.nim)) {
        return { success: false, message: 'NIM tersebut sudah terdaftar.' };
    }
    const mhsBaru = {
        id: 'mhs_' + Date.now(),
        nama: data.nama,
        nim: data.nim,
        password: data.password,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    db.mahasiswa.push(mhsBaru);
    if (writeDatabase(db)) return { success: true, message: 'Pendaftaran sukses! Menunggu konfirmasi Admin.' };
    return { success: false, message: 'Gagal menyimpan data ke sistem.' };
}

function catatAbsensi(nim, kodeAbsen) {
    const db = readDatabase();
    const sesi = db.absensi.find(a => a.kodeAbsen === kodeAbsen && a.status === 'active');
    if (!sesi) return { success: false, message: 'Kode absen salah atau waktu habis.' };
    if (sesi.hadir.some(h => h.nim === nim)) return { success: false, message: 'Anda sudah melakukan absensi!' };
    
    const mhs = db.mahasiswa.find(m => m.nim === nim);
    if (!mhs) return { success: false, message: 'Data mahasiswa tidak valid.' };

    sesi.hadir.push({ nim: mhs.nim, nama: mhs.nama, waktuAbsen: new Date().toISOString() });
    if (writeDatabase(db)) return { success: true, message: `Absen kelas ${sesi.matakuliah} berhasil!` };
    return { success: false, message: 'Gagal memproses absensi.' };
}

module.exports = { loginMahasiswa, registerMahasiswa, catatAbsensi };
