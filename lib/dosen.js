const fs = require('fs');
const path = require('path');
const Mahasiswa = require('mahasiswa');
const dbPath = path.join(process.env.VERCEL ? '/tmp' : __dirname, '../database.json');

class Dosen {
    // === TAMBAHIN FUNCTION INI BIAR ADMIN BISA AMBIL DATA DOSEN ===
    static getAll() {
        const db = Mahasiswa.getDB();
        return db.dosen || {};
    }

    static login(username, password) {
        const db = Mahasiswa.getDB();
        const dosen = db.dosen[username];
        if (dosen && dosen.password === password) return { success: true, data: dosen };
        return { success: false };
    }

    static buatKodeAbsen(matkul, durasiMenit) {
        const db = Mahasiswa.getDB();
        // Generate random angka 6 digit
        const kode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = Date.now() + (parseInt(durasiMenit) * 60 * 1000);

        db.kodeAktivasi[kode] = { matkul, expiredAt };
        Mahasiswa.saveDB(db);
        return { kode, expiredAt, matkul };
    }

    static getRekapMatkul(bulanFilter) {
        const db = Mahasiswa.getDB();
        let filtered = db.absensi || [];
        if (bulanFilter) {
            filtered = db.absensi.filter(a => a.tanggal.startsWith(bulanFilter));
        }

        const matkulGroup = {};
        filtered.forEach(item => {
            if (!matkulGroup[item.matkul]) matkulGroup[item.matkul] = [];
            const infoMhs = db.mahasiswa[item.nim] || { nama: 'Tanpa Nama' };
            matkulGroup[item.matkul].push({
                nama: infoMhs.nama,
                nim: item.nim,
                status: item.status,
                tanggal: item.tanggal
            });
        });

        return {
            matkulGroup,
            totalAbsensi: filtered.length,
            totalSiswa: Object.keys(db.mahasiswa || {}).length,
            totalMatkul: Object.keys(matkulGroup).length
        };
    }
}

module.exports = Dosen;