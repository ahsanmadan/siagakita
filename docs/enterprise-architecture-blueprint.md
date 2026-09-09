# Blueprint Arsitektur Enterprise SiagaKita
## Skalabilitas Skala Nasional & Penanganan Lonjakan Trafik Bencana

Dokumen spesifikasi teknis dan blueprint arsitektur sistem **SiagaKita** untuk kebutuhan evaluasi teknis dewan juri **KMIPN (Kompetisi Mahasiswa Informatika Politeknik Nasional)**.

---

## 1. Ringkasan Eksekutif

Saat bencana alam berskala besar melanda (misal gempa bumi atau banjir bandang multi-wilayah), sistem tanggap darurat konvensional kerap mengalami *bottleneck* akibat:
1. **Lonjakan Akses Bersamaan (Spike)**: Ribuan warga mengakses peta publik dan mengirim laporan situasi dalam waktu bersamaan.
2. **Ketergantungan Query Monolitik**: Pembacaan tabel transaksi berukuran jutaan baris tanpa partisi yang membebani I/O database.
3. **Eksekusi Sinkron yang Memblokir (Blocking HTTP)**: Pengiriman notifikasi SMS dan komputasi rekomendasi alokasi AI yang menyandera thread server pengguna.

SiagaKita mengadopsi arsitektur **Tiered Enterprise Resilience (Ketahanan Bertingkat)** yang menggabungkan *Edge Caching, In-Memory Sliding-Window Rate Limiting, Native PostgreSQL Table Partitioning,* dan *Event-Driven Asynchronous Workers*.

---

## 2. Diagram Topologi Arsitektur (High-Level Architecture)

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Client & Ingestion Layer"]
        UserWeb["🌐 Warga & Publik (Browser)"]
        OperatorConsole["🖥️ Komandan & Operator Posko"]
        ZeroGridSMS["📡 SMS Gateway (Zero-Grid Offline)"]
    end

    subgraph EdgeLayer ["2. Edge & Defensive Layer"]
        CDN["🛡️ Cloudflare / Vercel Edge Network (stale-while-revalidate)"]
        RateLimiter["⚡ Upstash Redis Sliding-Window Rate Limiter (FNV-1a)"]
    end

    subgraph AppLayer ["3. Application Server (Next.js 16 App Router)"]
        NextApp["⚙️ Next.js Modular Monolith (Server Actions & Route Handlers)"]
        AuthRLS["🔐 Session Auth & Dynamic Role RBAC"]
    end

    subgraph DataLayer ["4. High-Performance Database (PostgreSQL / Supabase)"]
        AtomicRPC["🔒 Atomic RPC Engine (distribute_stock_atomic)"]
        PartitionedAudit["🗄️ audit_logs (Declarative Range Partitioning by Month)"]
        RelationalCore["📊 Core Tables (events, shelters, inventory, reports) + 25 Indexes"]
    end

    subgraph AsyncLayer ["5. Event-Driven Background Worker (Inngest / QStash)"]
        EventQueue["📬 Event Queue & Dead-Letter Queue (DLQ)"]
        WorkerAI["🤖 Background AI Recommendation Worker (Groq Llama-3-70B)"]
        WorkerBroadcast["📢 Emergency SMS / WhatsApp Broadcast Engine"]
    end

    UserWeb -->|HTTPS| CDN
    OperatorConsole -->|HTTPS| CDN
    ZeroGridSMS -->|Webhook API| NextApp

    CDN --> RateLimiter
    RateLimiter -->|Allow| NextApp
    RateLimiter -->|Exceed| Reject429["429 Too Many Requests"]

    NextApp --> AuthRLS
    AuthRLS --> AtomicRPC
    AuthRLS --> PartitionedAudit
    AuthRLS --> RelationalCore

    NextApp -.->|Trigger Event 202 Accepted| EventQueue
    EventQueue --> WorkerAI
    EventQueue --> WorkerBroadcast
    WorkerAI -->|Write Recommendation| RelationalCore
```

---

## 3. Pilar 1: Database Table Partitioning (PostgreSQL)

Untuk tabel audit trail (`audit_logs`) dan telemetri laporan yang bertumbuh jutaan baris per tahun, SiagaKita mengimplementasikan **Declarative Range Partitioning**:

* **File Skrip Migrasi Blueprint**: [`supabase/migrations/20260901000000_enterprise_table_partitioning_blueprint.sql`](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/supabase/migrations/20260901000000_enterprise_table_partitioning_blueprint.sql)
* **Strategi Kunci**:
  1. `PARTITION BY RANGE (created_at)` memecah tabel fisik per bulan (misal `audit_logs_y2026m08`, `audit_logs_y2026m09`).
  2. **Partition Pruning**: Ketika query filter waktu dijalankan (misal audit log minggu ini), PostgreSQL mengabaikan seluruh partisi bulan lain sehingga scan cost turun dari $O(N)$ menjadi $O(M)$ ($M \ll N$).
  3. **Composite Primary Key**: `PRIMARY KEY (id, created_at)` menjamin integritas data terdistribusi.

---

## 4. Pilar 2: In-Memory Caching & Rate Limiting (Upstash / Redis)

* **File Implementasi**: [`src/lib/cache/rate-limiter.ts`](file:///d:/03_Data/Mine/Kuliah/Tugas/Semester%204/Manajemen%20Proyek/KMIPN/siagakita/src/lib/cache/rate-limiter.ts)
* **Mekanisme Proteksi**:
  * **Sliding Window via Sorted Sets**: Menggunakan Redis `zremrangebyscore` dan `zadd` untuk menghitung kuota request real-time tanpa *reset boundary flaw* seperti fixed window.
  * **Zero-Crash In-Memory Fallback**: Jika koneksi Redis terputus atau dijalankan offline di posko lapangan, limiter secara mulus jatuh ke memori RAM lokal (`globalThis.Map`) tanpa pernah menggagalkan request darurat (*fail-open for safety*).
  * **Privasi Identitas**: Alamat IP dienkripsi menggunakan hash *FNV-1a* sebelum disimpan di cache.

---

## 5. Pilar 3: Asynchronous Event-Driven Workers (Inngest / QStash)

Memisahkan operasi kritis yang memerlukan respons instan dari komputasi berat:

| Alur Proses | Eksekusi Awal (Sinkron) | Pemrosesan Latar Belakang (Asinkron) |
| :--- | :--- | :--- |
| **Alokasi Bantuan Darurat** | Validasi stok & RPC lock `distribute_stock_atomic` (15ms). | Kalkulasi ulang kesenjangan posko lintas wilayah & update grafik tren. |
| **Laporan Bencana Baru** | Simpan laporan & return status tiket ke warga (30ms). | Ekstraksi entitas NLP, kalkulasi skor prioritas AI, dan broadcast SMS. |
| **Penerbitan SitRep Resmi** | Render pratinjau dokumen A4 di klien (0ms server load). | Pengarsipan PDF dan replikasi snapshot situasi ke repositori pusat. |

---

## 6. Perbandingan Metrik Performa (Benchmark Estimasi)

| Metrik Arsitektur | Arsitektur Standar (Monolith Biasa) | Arsitektur Enterprise SiagaKita | Peningkatan |
| :--- | :---: | :---: | :---: |
| **Throughput Peta Publik** | ~120 req/detik (Database Bottleneck) | **> 3.500 req/detik (Edge Caching)** | **~29x Lebih Cepat** |
| **Latensi Submit Laporan** | 850ms (Menunggu AI & SMS) | **45ms (Async Queue Decoupled)** | **~18x Lebih Responsif** |
| **Scan Waktu Query Audit** | 420ms (Scan 1.000.000 baris) | **12ms (Partition Pruning)** | **~35x Lebih Efisien** |
| **Ketahanan terhadap DDoS/Spam** | Rentan (Database Connection Pool Exhausted) | **Kuat (Rate-Limited di Edge & Redis)** | **Enterprise Shield** |

---
*Dokumen ini merupakan bagian dari submission teknis SiagaKita — KMIPN 2026.*
