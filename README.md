# 🏁 Sports Venue Booking App

Aplikasi ini adalah sistem pemesanan venue olahraga berbasis web yang memungkinkan pengguna untuk melakukan booking secara online dengan mudah, serta membantu admin dalam mengelola venue dan transaksi.

---

## 🚀 Fitur Utama

### 👤 User (Pelanggan)

* Registrasi & Login
* Melihat daftar venue olahraga
* Booking venue
* Membatalkan (cancel) booking
* Pembayaran online menggunakan Midtrans (Snap)
* Melihat riwayat transaksi pribadi
* Memberikan review terhadap venue

### 🛠️ Admin

* CRUD (Create, Read, Update, Delete) data venue
* Upload foto venue (Cloudinary)
* Melihat seluruh riwayat transaksi
* Melakukan booking manual untuk pelanggan walk-in

---

## 🧱 Arsitektur & Teknologi

### Backend

* Node.js
* Express.js

### Frontend

* EJS (Embedded JavaScript Templates)
* Desain modern & responsif

### Database (Polyglot Persistence)

* **PostgreSQL (PSQL)** → Data user
* **MongoDB** → Data field (venue) & review

---

## 🔐 Security Features

Aplikasi ini dilengkapi dengan berbagai fitur keamanan:

* **Input Sanitization & Validation**

  * Mencegah input berbahaya dari user
* **Helmet**

  * Menambahkan HTTP headers untuk keamanan
* **CSRF Protection**

  * Mencegah serangan Cross-Site Request Forgery
* **Rate Limiting**

  * Membatasi jumlah request untuk mencegah abuse
* **Secure File Upload**

  * Validasi file gambar sebelum upload ke Cloudinary

---

## ☁️ Integrasi Pihak Ketiga

* **Cloudinary** → Penyimpanan gambar venue
* **Midtrans (Snap)** → Pembayaran online

---

## ⚙️ Environment Variables

Buat file `.env` di root project dan isi dengan konfigurasi berikut:

```
BASE_URL=http://localhost:3000
SESSION_SECRET=
MIDTRANS_CLIENT_KEY=
MIDTRANS_SERVER_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PG_CONNECTION_STRING=
```

---

## 📦 Instalasi & Setup

1. Clone repository

```
git clone <repository-url>
cd <project-folder>
```

2. Install dependencies

```
npm install
```

3. Setup environment variables (lihat bagian di atas)

4. Jalankan aplikasi

```
npm run dev
```

5. Akses aplikasi

```
http://localhost:3000
```

---

## 📊 Alur Sistem

1. User melakukan registrasi/login
2. User memilih venue dan melakukan booking
3. Sistem membuat transaksi dan redirect ke Midtrans Snap
4. User melakukan pembayaran
5. Status transaksi diperbarui
6. User dapat melihat riwayat transaksi dan memberikan review
7. Admin dapat mengelola venue dan memonitor transaksi

---

## 📝 Catatan

* Pastikan koneksi database PostgreSQL dan MongoDB sudah berjalan
* Gunakan akun Midtrans Sandbox untuk testing pembayaran
* Pastikan konfigurasi Cloudinary sudah benar untuk upload gambar

---

## 📄 Lisensi

Project ini dibuat untuk keperluan pembelajaran dan pengembangan sistem.
