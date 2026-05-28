const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 3000;

const Mahasiswa = require('./lib/mahasiswa');
const Dosen = require('./lib/dosen');
const Admin = require('./lib/admin');

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const COOKIE_OPTIONS = {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true
};

const OPSI_MATKUL = `
    <option value="Kalkulus">Kalkulus</option>
    <option value="Algoritma Pemrograman">Algoritma Pemrograman</option>
    <option value="Basis Data">Basis Data</option>
    <option value="Sistem Operasi">Sistem Operasi</option>
    <option value="Jaringan Komputer">Jaringan Komputer</option>
    <option value="Keamanan Siber">Keamanan Siber</option>
    <option value="Machine Learning">Machine Learning</option>
    <option value="Web Development">Web Development</option>
`;

function renderHTML(title, content) {
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Indahnya Absenku</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body class="bg-gradient-to-tr from-slate-100 via-blue-50 to-indigo-50 font-sans min-h-screen flex flex-col justify-between">
        <div class="max-w-4xl mx-auto p-4 w-full flex-grow flex items-center justify-center">
            <div class="w-full">${content}</div>
        </div>
        <footer class="text-center py-5 text-xs text-gray-400 border-t border-slate-200/60 bg-white/70 backdrop-blur-md w-full tracking-wide">
            <p>Created by <span class="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Kelompok 7</span></p>
        </footer>
    </body>
    </html>`;
}

// ================= ROUTE UTAMA (DOMAIN ASLI) =================
app.get('/', (req, res) => {
    // 1. Cek dulu apakah ada cookie login mahasiswa yang aktif
    if (req.cookies.userSessionMhs) {
        return res.redirect(`/mahasiswa/dashboard/${req.cookies.userSessionMhs}`);
    }
    // 2. Cek apakah ada cookie login dosen yang aktif
    if (req.cookies.userSessionDosen) {
        return res.redirect('/guru/dashboard');
    }
    // 3. Cek apakah ada cookie login admin yang aktif
    if (req.cookies.userSessionAdmin) {
        return res.redirect('/admin/dashboard');
    }
    
    // 4. KALO GAK ADA COOKIE SAMA SEKALI, LANGSUNG LEMPAR KE /mahasiswa
    res.redirect('/mahasiswa');
});

// ================= ROUTE MAHASISWA =================
app.get('/mahasiswa', (req, res) => {
    if (req.cookies.userSessionMhs) return res.redirect(`/mahasiswa/dashboard/${req.cookies.userSessionMhs}`);
    const error = req.query.err ? `<div class="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded-r-xl mb-4 text-sm font-medium shadow-sm">${req.query.err}</div>` : '';
    const msg = req.query.msg ? `<div class="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-3 rounded-r-xl mb-4 text-sm font-medium shadow-sm">${req.query.msg}</div>` : '';
    
    const content = `
    <div class="max-w-md mx-auto mt-10">
        
        <!-- ================= MENU LOGIN MAHASISWA ================= -->
        <div id="loginPage" class="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/60">
            <div class="text-center mb-6">
                <div class="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl mb-2 text-xl">👤</div>
                <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Login Mahasiswa</h2>
                <p class="text-xs text-gray-400 mt-1">Silakan masuk dengan akun Mahasiswa</p>
            </div>
            
            ${error} ${msg}
            
            <form action="/mahasiswa/login" method="POST" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">NIM Mahasiswa</label>
                    <input type="text" name="nim" required class="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition font-medium">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                    <input type="password" name="password" required class="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition font-medium">
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-blue-500/10 active:scale-[0.99]">Masuk ke Sistem</button>
            </form>
            
            <!-- TOMBOL UNTUK PINDAH KE DAFTAR (HILANGIN LOGIN) -->
            <div class="mt-6 pt-4 border-t border-slate-100 text-center">
                <button onclick="pindahKeDaftar()" class="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                    Belum punya akun? Daftar Akun Baru di Sini →
                </button>
            </div>
        </div>

        <!-- ================= MENU DAFTAR AKUN (DEFAULT TERSEMBUNYI) ================= -->
        <div id="registerPage" class="hidden bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/60">
            <div class="text-center mb-6">
                <div class="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-2 text-xl">📝</div>
                <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Daftar Akun Baru</h2>
                <p class="text-xs text-gray-400 mt-1">Isi data untuk pengajuan akun ke admin</p>
            </div>
            
            <form action="/mahasiswa/daftar" method="POST" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                    <input type="text" name="nama" required class="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition font-medium">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">NIM</label>
                    <input type="text" name="nim" required class="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition font-medium">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input type="password" name="password" required class="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition font-medium">
                </div>
                <div class="flex items-start gap-2 pt-1">
                    <input type="checkbox" required id="agree" class="mt-1">
                    <label for="agree" class="text-xs text-gray-500 font-medium">Saya menyatakan data yang saya isi sudah benar dan asli.</label>
                </div>
                <!-- PAS DIKLIK DIA SUBMIT FORM DAN OTOMATIS REDIRECT BALIK KE LOGIN VIA BACKEND -->
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition shadow-md">Kirim Pengajuan</button>
            </form>
            
            <div class="mt-4 text-center">
                <button onclick="pindahKeLogin()" class="text-xs text-gray-400 font-semibold hover:text-gray-600 cursor-pointer">
                    ← Kembali ke Menu Login
                </button>
            </div>
        </div>

    </div>

    <!-- JAVASCRIPT COPAS DI SINI BUAT HANDLE PERPINDAHAN PAGE TOTAL -->
    <script>
        function pindahKeDaftar() {
            // Hilangin halaman login total
            document.getElementById('loginPage').classList.add('hidden');
            // Munculin halaman daftar akun baru
            document.getElementById('registerPage').classList.remove('hidden');
        }

        function pindahKeLogin() {
            // Hilangin halaman daftar total
            document.getElementById('registerPage').classList.add('hidden');
            // Munculin halaman login kembali
            document.getElementById('loginPage').classList.remove('hidden');
        }
    </script>
    `;
    res.send(renderHTML('Login Mahasiswa', content));
});

app.post('/mahasiswa/login', (req, res) => {
    const { nim, password } = req.body;
    const result = Mahasiswa.login(nim, password);
    if (!result.success) return res.redirect(`/mahasiswa?err=${encodeURIComponent(result.message)}`);
    
    res.cookie('userSessionMhs', nim, COOKIE_OPTIONS);
    res.redirect(`/mahasiswa/dashboard/${nim}`);
});

app.post('/mahasiswa/daftar', (req, res) => {
    const { nim, nama, password } = req.body;
    const result = Mahasiswa.daftarBaru(nim, nama, password);
    if (!result.success) return res.redirect(`/mahasiswa?err=${encodeURIComponent(result.message)}`);
    res.redirect(`/mahasiswa?msg=${encodeURIComponent(result.message)}`);
});

app.get('/mahasiswa/dashboard/:nim', (req, res) => {
    const { nim } = req.params;
    const db = Mahasiswa.getDB();
    const dataMhs = db.mahasiswa[nim];
    if (!dataMhs || dataMhs.status !== 'approved') return res.redirect('/mahasiswa');

    const error = req.query.err ? `<div class="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded-r-xl mb-4 text-sm font-medium">${req.query.err}</div>` : '';
    const msg = req.query.msg ? `<div class="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-3 rounded-r-xl mb-4 text-sm font-medium">${req.query.msg}</div>` : '';

    const alertGantiPassword = !dataMhs.pernahGantiPassword 
        ? `<div class="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-r-xl mb-6 text-sm shadow-sm">
            🔒 <b class="font-bold">Keamanan Akun:</b> Anda masih menggunakan password bawaan. Yuk ganti dulu di form bawah!
           </div>` 
        : '';

    const bulanFilter = req.query.bulan || '';
    const rekap = Mahasiswa.getRekapPribadi(nim, bulanFilter);

    const content = `
    <div class="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 mt-6 max-w-2xl mx-auto">
        ${alertGantiPassword}
        ${error} ${msg}
        <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-xl font-extrabold text-slate-800">👋 Halo, ${dataMhs.nama}</h2>
                <p class="text-xs text-slate-400 mt-0.5 font-medium">NIM: ${nim}</p>
            </div>
            <a href="/mahasiswa/logout" class="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-xl font-bold transition">Log Out</a>
        </div>

        <div class="bg-gradient-to-br from-cyan-50 to-blue-50 border border-blue-100 p-5 rounded-2xl mb-6 shadow-sm">
            <h3 class="font-bold text-sm text-blue-900 mb-3 flex items-center gap-1.5">📥 Isi Kode Absensi Kuliah</h3>
            <form action="/mahasiswa/absen-masuk/${nim}" method="POST" class="space-y-3">
                <div class="grid sm:grid-cols-2 gap-3">
                    <select name="matkul" required class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-400 text-sm text-slate-700">
                        <option value="">-- Pilih Mata Kuliah --</option>
                        ${OPSI_MATKUL}
                    </select>
                    <input type="text" name="kode" placeholder="6-Digit Kode" required class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest">
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm">Kirim Absen</button>
            </form>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center"><span class="text-3xl font-black text-emerald-600">${rekap.totalHadir}</span><p class="text-xs text-emerald-600 font-bold mt-1">Total Hadir</p></div>
            <div class="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center"><span class="text-3xl font-black text-rose-600">${rekap.totalTeacher || rekap.totalTidakHadir}</span><p class="text-xs text-rose-600 font-bold mt-1">Mangkir/Sakit</p></div>
        </div>

        <div class="flex justify-between items-center mb-4">
            <h3 class="font-extrabold text-slate-700 text-sm uppercase tracking-wider">📋 Riwayat Kehadiran</h3>
            <form method="GET" class="flex gap-2 align-center">
                <input type="month" name="bulan" value="${bulanFilter}" class="p-1.5 border border-slate-200 rounded-xl text-xs bg-white">
                <button type="submit" class="bg-slate-700 text-white px-3 py-1.5 text-xs rounded-xl font-bold">Filter</button>
            </form>
        </div>

        <div class="overflow-hidden border border-slate-100 rounded-xl shadow-sm bg-white">
            <table class="w-full text-left text-sm border-collapse">
                <thead><tr class="bg-slate-50 text-slate-500 font-bold text-xs"><th class="p-3">Tanggal</th><th class="p-3">Mata Kuliah</th><th class="p-3">Status</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                    ${rekap.list.map(r => `<tr><td class="p-3 text-gray-500 font-medium text-xs">${r.tanggal}</td><td class="p-3 font-semibold text-slate-700">${r.matkul}</td><td class="p-3"><span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700">✓ ${r.status}</span></td></tr>`).join('')}
                </tbody>
            </table>
        </div>

        <div class="mt-8 pt-6 border-t border-slate-100">
            <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">🔐 Ubah Sandi Akun</h3>
            <form action="/mahasiswa/ganti-password/${nim}" method="POST" class="flex gap-2">
                <input type="password" name="new_password" placeholder="Ketik Password Baru" required class="p-2 px-3 text-sm border border-slate-200 rounded-xl bg-slate-50 w-full max-w-xs">
                <button type="submit" class="bg-slate-800 text-white px-4 py-2 text-sm rounded-xl font-bold">Update</button>
            </form>
        </div>
    </div>`;
    res.send(renderHTML('Dashboard Mahasiswa', content));
});

app.post('/mahasiswa/absen-masuk/:nim', (req, res) => {
    const { nim } = req.params;
    const { kode, matkul } = req.body;
    const resAbsen = Mahasiswa.inputKodeAbsen(nim, kode, matkul);
    if (!resAbsen.success) return res.redirect(`/mahasiswa/dashboard/${nim}?err=${encodeURIComponent(resAbsen.message)}`);
    res.redirect(`/mahasiswa/dashboard/${nim}?msg=${encodeURIComponent(resAbsen.message)}`);
});

app.post('/mahasiswa/ganti-password/:nim', (req, res) => {
    const { nim } = req.params;
    Mahasiswa.gantiPassword(nim, req.body.new_password);
    res.redirect(`/mahasiswa/dashboard/${nim}?msg=Password%20kamu%20berhasil%20diupdate!`);
});

app.get('/mahasiswa/logout', (req, res) => {
    res.clearCookie('userSessionMhs');
    res.redirect('/mahasiswa');
});

// ================= ROUTE DOSEN =================
app.get('/guru', (req, res) => {
    if (req.cookies.userSessionDosen) return res.redirect('/guru/dashboard');
    const error = req.query.err ? `<div class="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded-r-xl mb-4 text-sm font-medium">${req.query.err}</div>` : '';
    const content = `
    <div class="max-w-md mx-auto bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/60">
        <h2 class="text-2xl font-bold text-center mb-6 text-slate-800">👨‍🏫 Login Dosen</h2>
        ${error}
        <form action="/guru/login" method="POST" class="space-y-4">
            <input type="text" name="username" placeholder="Username" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <input type="password" name="password" placeholder="Password" required class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <button type="submit" class="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold">Masuk</button>
        </form>
    </div>`;
    res.send(renderHTML('Login Dosen', content));
});

app.post('/guru/login', (req, res) => {
    const { username, password } = req.body;
    const result = Dosen.login(username, password);
    if (!result.success) return res.redirect('/guru?err=Kredensial%20Dosen%20Salah!');
    res.cookie('userSessionDosen', username, COOKIE_OPTIONS);
    res.redirect('/guru/dashboard');
});

app.get('/guru/dashboard', (req, res) => {
    if (!req.cookies.userSessionDosen) return res.redirect('/guru');
    const tokenBuat = req.query.tokenBuat ? JSON.parse(decodeURIComponent(req.query.tokenBuat)) : null;
    const bulanFilter = req.query.bulan || '';
    const dataRekap = Dosen.getRekapMatkul(bulanFilter);

    const tokenAlert = tokenBuat ? `<div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 text-sm">✨ Token dibuat! Matkul: <b>${tokenBuat.matkul}</b> | Kode: <span class="text-xl font-black text-indigo-700 bg-white border border-slate-200 px-3 py-0.5 rounded-xl font-mono">${tokenBuat.kode}</span></div>` : '';

    let matkulHtml = '';
    for (const [matkul, siswaList] of Object.entries(dataRekap.matkulGroup)) {
        matkulHtml += `
        <div class="mb-5 p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
            <h4 class="font-bold text-indigo-800 text-sm flex items-center justify-between"><span>📚 ${matkul}</span> <span class="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">${siswaList.length} Mhs</span></h4>
            <div class="mt-4 space-y-2">
                ${siswaList.map(s => `<div class="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs font-medium"><div><b>${s.nama}</b> <span class="text-gray-400">(${s.nim})</span></div><div class="flex items-center gap-3"><span class="text-gray-400">${s.tanggal}</span><span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">✓ ${s.status}</span></div></div>`).join('')}
            </div>
        </div>`;
    }

    const content = `
    <div class="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 mt-6">
        <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 class="text-xl font-black text-slate-800">Indahnya Absenku <span class="text-xs font-medium text-gray-400">Panel Dosen</span></h2>
            <a href="/guru/logout" class="text-xs bg-rose-50 text-rose-600 px-3 py-2 rounded-xl font-bold">Log Out</a>
        </div>
        ${tokenAlert}
        <div class="bg-slate-50/80 border border-slate-200/60 p-5 rounded-2xl mb-6 shadow-sm">
            <form action="/guru/buat-token" method="POST" class="grid sm:grid-cols-3 gap-3">
                <select name="matkul" required class="p-2.5 text-sm border border-slate-200 bg-white rounded-xl font-semibold"><option value="">-- Pilih Mata Kuliah --</option>${OPSI_MATKUL}</select>
                <select name="durasi" class="p-2.5 text-sm border border-slate-200 bg-white rounded-xl font-medium"><option value="5">5 Menit</option><option value="15">15 Menit</option><option value="30">30 Menit</option></select>
                <button type="submit" class="bg-emerald-600 text-white font-bold rounded-xl py-2.5">Buat Token</button>
            </form>
        </div>
        ${matkulHtml || '<p class="text-gray-400 text-center py-8">Belum ada rekap absen.</p>'}
    </div>`;
    res.send(renderHTML('Dashboard Dosen', content));
});

app.post('/guru/buat-token', (req, res) => {
    const { matkul, durasi } = req.body;
    const tokenObj = Dosen.buatKodeAbsen(matkul, durasi);
    res.redirect(`/guru/dashboard?tokenBuat=${encodeURIComponent(JSON.stringify(tokenObj))}`);
});

app.get('/guru/logout', (req, res) => { res.clearCookie('userSessionDosen'); res.redirect('/guru'); });
app.get('/guru/export-pdf', (req, res) => {
    const { bulan } = req.query;
    const rekap = Dosen.getRekapMatkul(bulan);
    res.send(`<html><body><h2>LAPORAN ABSENSI</h2><pre>${JSON.stringify(rekap.matkulGroup, null, 2)}</pre><script>window.print();</script></body></html>`);
});

// ================= ROUTE ADMIN + EDIT DAFTAR APPROVAL =================
app.get('/admin', (req, res) => {
    if (req.cookies.userSessionAdmin) return res.redirect('/admin/dashboard');
    const content = `
    <div class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl">
        <h2 class="text-xl font-bold text-center mb-6">🔐 Login Admin</h2>
        <form action="/admin/login" method="POST" class="space-y-4">
            <input type="text" name="username" placeholder="Username" required class="w-full p-2.5 border rounded-xl">
            <input type="password" name="password" placeholder="Password" required class="w-full p-2.5 border rounded-xl">
            <button type="submit" class="w-full bg-slate-800 text-white py-2.5 rounded-xl">Masuk</button>
        </form>
    </div>`;
    res.send(renderHTML('Login Admin', content));
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (Admin.login(username, password).success) {
        res.cookie('userSessionAdmin', username, COOKIE_OPTIONS);
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/admin');
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.cookies.userSessionAdmin) return res.redirect('/admin');
    const listDosen = Dosen.getAll();
    const db = Mahasiswa.getDB();
    
    // Ambil list pengajuan mahasiswa dengan status pending (SESUAI REQUEST)
    const pengajuanMhs = Object.entries(db.mahasiswa).filter(([nim, data]) => data.status === 'pending');

    let pengajuanHtml = '';
    pengajuanMhs.forEach(([nim, data]) => {
        pengajuanHtml += `
        <div class="p-4 border border-amber-200 rounded-xl bg-amber-50/50 mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
            <div>
                <p class="font-bold text-slate-800">${data.nama}</p>
                <p class="text-xs text-slate-500">NIM: ${nim}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <form action="/admin/approve/${nim}" method="POST" class="inline">
                    <button type="submit" class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold">Setujui</button>
                </form>
                <form action="/admin/reject/${nim}" method="POST" class="flex gap-1 items-center">
                    <select name="alasan" required class="p-1 text-xs border rounded-lg bg-white">
                        <option value="Akun Terdouble">Akun Terdouble</option>
                        <option value="NIM Salah">NIM Salah</option>
                        <option value="Nama Salah">Nama Salah</option>
                    </select>
                    <button type="submit" class="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold">Tolak</button>
                </form>
            </div>
        </div>`;
    });

    const content = `
    <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 mt-6">
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h2 class="text-xl font-black text-slate-800">🛠️ Panel Admin Control</h2>
            <a href="/admin/logout" class="text-xs bg-rose-50 text-rose-600 px-3 py-2 rounded-xl font-bold">Log Out</a>
        </div>
        
        <div class="mb-8 border border-slate-100 p-5 rounded-2xl bg-white shadow-sm">
            <h3 class="font-bold text-sm text-amber-600 uppercase tracking-wider mb-4">📥 Pengajuan Akun Mahasiswa Baru (${pengajuanMhs.length})</h3>
            ${pengajuanHtml || '<p class="text-gray-400 text-center py-4 text-xs font-medium">Tidak ada pengajuan akun baru saat ini.</p>'}
        </div>

        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-slate-50 p-5 rounded-2xl border">
                <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-4">➕ Daftarkan Akun Dosen</h3>
                <form action="/admin/add-dosen" method="POST" class="space-y-3">
                    <input type="text" name="username" placeholder="Username" required class="w-full p-2.5 border rounded-xl text-sm">
                    <input type="text" name="nama" placeholder="Nama Lengkap" required class="w-full p-2.5 border rounded-xl text-sm">
                    <input type="password" name="password" placeholder="Password" required class="w-full p-2.5 border rounded-xl text-sm">
                    <button type="submit" class="w-full bg-emerald-600 text-white text-sm py-2.5 rounded-xl font-bold">Simpan</button>
                </form>
            </div>
            <div class="border p-5 rounded-2xl bg-white">
                <h3 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-4">📋 Daftar Pengajar</h3>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${Object.entries(listDosen).map(([user, val]) => `<div class="bg-slate-50 p-2.5 rounded-xl text-xs font-semibold">👤 ${val.nama}</div>`).join('')}
                </div>
            </div>
        </div>
    </div>`;
    res.send(renderHTML('Dashboard Admin', content));
});

// ACTION APPROVE & REJECT MAHASISWA
app.post('/admin/approve/:nim', (req, res) => {
    const { nim } = req.params;
    const db = Mahasiswa.getDB();
    if (db.mahasiswa[nim]) {
        db.mahasiswa[nim].status = 'approved';
        Mahasiswa.saveDB(db);
    }
    res.redirect('/admin/dashboard');
});

app.post('/admin/reject/:nim', (req, res) => {
    const { nim } = req.params;
    const { alasan } = req.body;
    const db = Mahasiswa.getDB();
    if (db.mahasiswa[nim]) {
        db.mahasiswa[nim].status = 'ditolak';
        db.mahasiswa[nim].alasan = alasan;
        Mahasiswa.saveDB(db);
    }
    res.redirect('/admin/dashboard');
});

app.post('/admin/add-dosen', (req, res) => {
    const { username, nama, password } = req.body;
    Admin.buatAkunDosen(username, nama, password);
    res.redirect('/admin/dashboard');
});

app.get('/admin/logout', (req, res) => { res.clearCookie('userSessionAdmin'); res.redirect('/admin'); });

// ================= HANDLE LINK NGASAL / TROLL (404 NOT FOUND) =================
// CATATAN: Middleware ini WAJIB ditaruh di paling bawah setelah semua route selesai didefinisikan!
app.use((req, res) => {
    const content = `
    <div class="text-center mt-16 max-w-md mx-auto bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/60">
        <div class="inline-flex p-4 bg-rose-50 text-rose-500 rounded-full mb-4 text-3xl font-black font-mono">
            404
        </div>
        <h2 class="text-xl font-black text-slate-800 tracking-tight">Halaman Gak Ketemu!</h2>
        <p class="text-sm text-gray-400 mt-2 font-medium">URL <code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded font-mono font-bold text-xs">${req.originalUrl}</code> kagak ada di sistem kita woy.</p>
        
        <!-- SENDERAN/TROLL BALIK BUAT SI IQBAL -->
        <div class="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 italic">
            "IQBAL GANTENG 123 😜"
        </div>
        
        <a href="/" class="block mt-6 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
            ← Balik ke Menu Login
        </a>
    </div>`;
    
    // Set status code 404 biar secara teknis beneran NOT FOUND
    res.status(404).send(renderHTML('404 Not Found', content));
});

app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });
