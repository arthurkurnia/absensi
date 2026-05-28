const Mahasiswa = require('./mahasiswa');

class Admin {
    static login(username, password) {
        const db = Mahasiswa.getDB();
        if (db.admin[username] && db.admin[username] === password) return { success: true };
        return { success: false };
    }

    static buatAkunDosen(username, nama, password) {
        const db = Mahasiswa.getDB();
        if (db.dosen[username]) return false;
        db.dosen[username] = { nama, password };
        Mahasiswa.saveDB(db);
        return true;
    }
}

module.exports = Admin;
