const Mahasiswa = require('./mahasiswa');

class Admin {
    static async login(username, password) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        const admin = db.admin.find(a => a.username === username && a.password === password);
        return admin ? { success: true } : { success: false };
    }

    static async buatAkunDosen(username, nama, password) {
        await Mahasiswa.refreshCache();
        const db = Mahasiswa.getDB();
        if (db.dosen[username]) return false;
        db.dosen[username] = { nama, password };
        Mahasiswa.saveDB(db);
        const { writeCloudDB } = require('./mahasiswa');
        return true;
    }
}

module.exports = Admin;
