const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// PEMANGGILAN MODUL LOKAL (SUDAH FIX REQ STACK VERCEL)
const mahasiswa = require('./lib/mahasiswa');
const dosen = require('./lib/dosen');

const app = express();

// Middleware dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('rahasia_absen_iqbal_2026'));

// Set view engine jika lo pake ejs/html template murni
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // Sesuaikan dengan template engine lo (ejs/pug/html)
app.use(express.static(path.join(__dirname, 'public')));

// ================= ROUTING SYSTEM =================

// Halaman Utama (Redirect ke Login)
app.get('/', (req, res) => {
    res.redirect('/mahasiswa/login');
});

// Jalur Mahasiswa
app.get('/mahasiswa/login', (req, res) => {
    res.render('mahasiswa/login', { message: null }); // Sesuaikan nama file view lo
});

app.post('/mahasiswa/login', (req, res) => {
    const { nim, password } = req.body;
    const result = mahasiswa.loginMahasiswa(nim, password);
    if (result.success) {
        res.cookie('user_session', result.data.nim, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        return res.redirect('/mahasiswa/dashboard');
    }
    res.render('mahasiswa/login', { message: result.message });
});

app.get('/mahasiswa/register', (req, res) => {
    res.render('mahasiswa/register', { message: null });
});

app.post('/mahasiswa/register', (req, res) => {
    const result = mahasiswa.registerMahasiswa(req.body);
    res.render('mahasiswa/register', { message: result.message, success: result.success });
});

// Jalur Dosen
app.get('/dosen/login', (req, res) => {
    res.render('dosen/login', { message: null });
});

// ================= JEBAKAN BATMAN / TROLL PAGE 404 =================
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; margin-top: 15%; font-family: sans-serif; color: #333;">
            <h1 style="font-size: 50px;">404 - Halaman Ga Ada Cuk!</h1>
            <p style="font-size: 20px; color: #666;">Mau nyari apa lo hah? 🤔</p>
            <h2 style="color: #ff4757; background: #ffeacc; display: inline-block; padding: 10px 20px; border-radius: 8px;">
                IQBAL GANTENG 123 ngetroll gitu wkwk 😜
            </h2>
        </div>
    `);
});

// Handler Serverless Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server nyala lokal di port ${PORT}`));
}

module.exports = app;
