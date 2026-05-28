const fs = require('fs');
const path = require('path');

// COPAS TRIK /TMP YANG SAMA BIAR SINKRON SAMA MAHASISWA
const isVercel = process.env.VERCEL;
const rootDir = process.cwd();
const dbPath = isVercel ? path.join('/tmp', 'database.json') : path.join(rootDir, 'database.json');

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

function loginDosen(nidn, password) {
    const db = readDatabase();
    const ds = db.dosen.find(d => d.nidn === nidn && d.password === password);
    return ds ? { success: true, data: ds } : { success: false, message: 'NIDN atau Password Dosen salah.' };
}

function buatSesiAbsen(nidn, matakuliah, menitAktif) {
    const db = readDatabase();
    const tokenAcak = Math.random().toString(36).substring(2, 7).toUpperCase();
    const sesiBaru = {
        id: 'abs_' + Date.now(),
        dosenNidn: nidn,
        matakuliah: matakuliah,
        kodeAbsen: tokenAcak,
        status: 'active',
        tanggal: new Date().toLocaleDateString('id-ID'),
        hadir: [],
        expiredAt: new Date(Date.now() + menitAktif * 60 * 1000).toISOString()
    };
    db.absensi.push(sesiBaru);
    if (writeDatabase(db)) return { success: true, data: sesiBaru };
    return { success: false, message: 'Gagal membuat sesi absensi.' };
}

module.exports = { loginDosen, buatSesiAbsen };
