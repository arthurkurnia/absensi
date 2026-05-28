const Mahasiswa = require('./mahasiswa');

class Dosen {
    static async getAll() {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        return db.dosen || {};
    }

    static async login(username, password) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        const dosen = db.dosen[username];
        if (dosen && dosen.password === password) return { success: true, data: dosen };
        return { success: false };
    }

    static async buatKodeAbsen(matkul, durasiMenit) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        const kode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = Date.now() + (parseInt(durasiMenit) * 60 * 1000);
        db.kodeAktivasi[kode] = { matkul, expiredAt };
        Mahasiswa.saveDB(db);
        return { kode, expiredAt, matkul };
    }

    static async getRekapMatkul(bulanFilter) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        let filtered = db.absensi || [];
        if (bulanFilter) filtered = filtered.filter(a => a.tanggal.startsWith(bulanFilter));

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
