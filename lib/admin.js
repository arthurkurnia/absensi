const Mahasiswa = require('./mahasiswa');

class Admin {
    static login(username, password) {
        const db = Mahasiswa.getDB();
        // FIX: db.admin adalah ARRAY of objects, bukan object/dictionary
        // Sebelumnya: db.admin[username] → selalu undefined karena array
        // Sebelumnya: db.admin[username] === password → compare object vs string (SALAH)
        const admin = db.admin.find(a => a.username === username && a.password === password);
        return admin ? { success: true } : { success: false };
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
