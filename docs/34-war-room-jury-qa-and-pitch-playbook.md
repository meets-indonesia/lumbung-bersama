# Lumbung Bersama War Room: Jury Q&A and Pitch Playbook

Date: 2026-07-10
Team/table prefix: `anak_sarengklek_`
Theme: Tema 2 - Optimalisasi Potensi Desa Melalui Koperasi
Status: presentation and defense playbook

## 1. Core Positioning

Lumbung Bersama is an operating layer for cooperatives to turn village potential into verified economic action.

The product is not a generic marketplace, not a checkout app, not a credit-scoring app, and not a claim of live production SIMKOPDES integration.

Important hackathon update:

The provided database schema is a limited representation of the running SIMKOPDES system. It is not intended to be the primary or canonical reference. The schema and sample data are exploration material for understanding patterns, identifying problems, and generating innovation ideas.

Implication for the pitch:

1. Say "berdasarkan sample eksplorasi yang merepresentasikan sebagian pola SIMKOPDES".
2. Do not say "kami memakai skema final SIMKOPDES".
3. Use the database as early evidence and product-discovery input, not as a production integration contract.
4. Keep all SIMKOPDES language as readiness/mapping, not live integration.

The strongest one-liner:

> Lumbung Bersama membantu koperasi desa mengubah data potensi desa menjadi rekomendasi usaha yang bisa diaudit: komoditas prioritas, kesiapan koperasi, buyer potensial, stok/readiness, dan laporan aksi untuk pengurus.

The MVP flow:

`Peta Potensi Desa -> Rekomendasi Komoditas/Produk -> Buyer Matching Lite -> Stok/Readiness -> Laporan Aksi`

What judges should remember:

1. The system starts from the village and cooperative data graph.
2. Every recommendation includes evidence and source labels.
3. AI/rules help prioritize, but final decisions stay with cooperative humans.
4. Buyer matching is an approved outreach workflow, not a fake marketplace checkout.
5. The result is an action report that a cooperative can use in a meeting.

## 2. Demo Promise

Say:

1. "Kami menunjukkan MVP yang membaca data wilayah, komoditas, koperasi, produk, stok, transaksi, dan kemitraan."
2. "Dari data itu, sistem membuat peta peluang dan rekomendasi yang dapat diverifikasi."
3. "Setiap angka diberi label sumber data agar tidak mencampur data demo, shared DB, dan data operasional."
4. "WA digunakan sebagai intake/verifikasi dan follow-up draft, bukan klaim live delivery kecuali environment sudah dikonfigurasi."
5. "Output akhirnya adalah laporan aksi, bukan sekadar dashboard cantik."

Do not say:

1. "Kami sudah punya marketplace end-to-end."
2. "AI otomatis menentukan keputusan koperasi."
3. "Kami sudah terintegrasi resmi dengan SIMKOPDES produksi."
4. "Data nasional sudah lengkap dan verified sampai semua desa."
5. "WhatsApp sudah pasti terkirim live."
6. "Pembiayaan otomatis disetujui."

## 3. Why This Idea Is Strong

### 3.1 Directly Answers The Challenge

Problem statement:

> Bagaimana teknologi dapat membantu mengidentifikasi, mengembangkan, dan mengoptimalkan potensi ekonomi desa melalui koperasi?

Lumbung Bersama answers it through five connected stages:

1. Identify: map village commodities and cooperative coverage.
2. Develop: recommend product/value-add actions.
3. Optimize: rank opportunities by readiness, stock, transaction, and partnership signals.
4. Connect: match cooperatives to buyer archetypes or actual buyer requirements when available.
5. Govern: produce a human-reviewed action report for cooperative decision-making.

### 3.2 It Uses The Supplied Database Instead Of Ignoring It

The supplied metadata and schema already support the MVP:

1. Village potential: `referensi_wilayah`, `referensi_profil_desa`, `referensi_komoditas_desa`, `referensi_koperasi_wilayah`.
2. Cooperative readiness: `profil_koperasi`, `anggota_koperasi`, `pengurus_koperasi`, `karyawan_koperasi`, `gerai_koperasi`, `aset_koperasi`, `dokumen_koperasi`, `modal_koperasi`, `rat_koperasi`.
3. Product and stock: `produk_koperasi`, `inventaris_produk`, `barang_masuk_produk`, `barang_keluar_produk`, `transaksi_penjualan`.
4. Market and enablement: `pengajuan_kemitraan`, `pengajuan_pembiayaan`, `pengajuan_rekening_bank`, `akun_bank_koperasi`, `simpanan_anggota`.

This means the pitch is not abstract. It is grounded in an available data graph.

But be precise:

> Database hackathon dipakai sebagai bahan eksplorasi awal. Kami tidak memperlakukannya sebagai referensi utama SIMKOPDES, melainkan sebagai sample pola data untuk merancang inovasi yang bisa divalidasi lebih lanjut.

### 3.3 It Is Realistic For A Hackathon

The MVP avoids the expensive parts of a full marketplace:

1. No payment settlement.
2. No legal contract automation.
3. No final logistics optimization.
4. No automatic credit decisioning.
5. No live government-system integration claim.

Instead, it shows high-value decision support:

1. What opportunity should a cooperative prioritize?
2. Why that opportunity?
3. Which data supports it?
4. What is missing?
5. What action should the operator or pengurus do next?

## 4. Data Evidence Map

Use this table when judges ask "data apa yang mendukung?"

| Product question | Database evidence | MVP output |
|---|---|---|
| Potensi ekonomi apa yang belum optimal? | `referensi_komoditas_desa`, `produk_koperasi`, `inventaris_produk`, `transaksi_penjualan` | Opportunity score and gap: high potential but low product/stock/sales conversion |
| Bagaimana mencocokkan potensi dengan pasar? | `produk_koperasi`, `inventaris_produk`, `transaksi_penjualan`, `pengajuan_kemitraan` | Buyer Matching Lite and readiness clusters |
| Bagaimana mempertemukan koperasi dengan buyer/offtaker? | `profil_koperasi`, `referensi_koperasi_wilayah`, `produk_koperasi`, `inventaris_produk`, `pengajuan_kemitraan` | Approved outreach pipeline, not marketplace checkout |
| Bagaimana meningkatkan nilai tambah? | `referensi_komoditas_desa`, `aset_koperasi`, `gerai_koperasi`, `pengajuan_pembiayaan`, `modal_koperasi` | Product/value-add recommendation and readiness gaps |
| Bagaimana memastikan data bisa dipercaya? | `dokumen_koperasi`, `rat_koperasi`, source labels, operator verification | Evidence label, confidence, human approval state |
| Bagaimana memonitor supply chain? | `barang_masuk_produk`, `barang_keluar_produk`, `inventaris_produk`, `transaksi_penjualan` | Stock/readiness and supply gap view |

External data expansion is documented in `docs/37-external-data-source-map.md`. Use it when judges ask why the solution remains defensible even though the hackathon database is only exploratory.

### 4.1 Live Shared DB Read-Only Evidence

Read-only aggregate check on 2026-07-10 confirmed the shared PostgreSQL database is reachable with SSL and the MVP tables have data:

| Table | Aggregate row count |
|---|---:|
| `referensi_wilayah` | `1026` |
| `referensi_komoditas_desa` | `8191` |
| `profil_koperasi` | `1026` |
| `produk_koperasi` | `13974` |
| `inventaris_produk` | `13974` |
| `transaksi_penjualan` | `1000` |
| `pengajuan_kemitraan` | `3254` |

Defense note:

> Kami memakai data ini sebagai evidence layer read-only. Demo endpoint hanya mengeluarkan agregat dan guardrail, bukan data pribadi atau dokumen.

SIMKOPDES caveat:

> Karena skema ini dinyatakan terbatas dan bukan referensi utama, angka agregat di atas kami gunakan untuk eksplorasi pola dan demo inovasi, bukan sebagai klaim statistik resmi SIMKOPDES.

## 5. Score Formula For Defense

Use this formula only as an explainable MVP model, not as a final government standard.

Opportunity score:

`30% Potensi Komoditas + 20% Kesiapan Koperasi + 20% Produk/Stok + 15% Sinyal Pasar + 10% Sinyal Kemitraan + 5% Kelengkapan Data`

Meaning:

1. Potensi komoditas: value, volume, area, or commodity rows from `referensi_komoditas_desa`.
2. Kesiapan koperasi: cooperative profile and area linkage from `profil_koperasi` and `referensi_koperasi_wilayah`.
3. Produk/stok: product and inventory evidence from `produk_koperasi` and `inventaris_produk`.
4. Sinyal pasar: transaction evidence from `transaksi_penjualan`.
5. Sinyal kemitraan: request/partnership signal from `pengajuan_kemitraan`.
6. Kelengkapan data: whether key fields are present and source-labeled.

Buyer match score:

`25% Product Fit + 20% Stock Readiness + 15% Supply Consistency + 15% Location/Logistics + 10% Quality/Readiness Proxy + 10% Transaction/Partnership Signal + 5% Governance Readiness`

Defensive explanation:

> Skor ini bukan keputusan otomatis. Ini ranking awal untuk menghemat waktu pengurus. Sistem menunjukkan komponen skor, data sumber, dan rekomendasi tindakan. Keputusan outreach tetap perlu persetujuan manusia.

## 6. Juri Persona Strategy

### 6.1 Shinta Dhanuwardoyo - Startup, Angel Investor, Mentor

Likely lens:

1. Is this a real product wedge?
2. Who pays?
3. What is defensible?
4. Can it scale beyond one demo?

Answer angle:

> Wedge kami bukan marketplace langsung. Wedge kami adalah operating layer yang membantu koperasi memilih peluang paling siap dieksekusi. Nilainya muncul sebelum transaksi: koperasi tahu komoditas mana, buyer mana, stok mana, dan gap mana yang harus ditutup. Dari sana monetisasi bisa B2B SaaS untuk koperasi/federasi, implementation service, dan buyer/offtaker workflow.

Strong points:

1. Starts with decision support, not cold-start marketplace liquidity.
2. Uses cooperative data and source-labeled trust as defensibility.
3. Can expand module by module after pilot.
4. Buyer matching can become CRM and procurement network later.

Trap to avoid:

Do not claim marketplace liquidity on day one.

### 6.2 Rama Mamuaya - Startup Dev and VC

Likely lens:

1. MVP clarity.
2. Adoption path.
3. GTM and retention.
4. Why now?

Answer angle:

> MVP kami fokus pada satu high-frequency workflow: koperasi perlu melihat peluang, mengecek readiness, dan menyiapkan tindak lanjut. Mereka tidak perlu mengganti sistem lama dulu. Mereka bisa mulai dari peta, WA/operator verification, buyer shortlist, dan laporan aksi.

Strong points:

1. Adoption starts from existing cooperative workflow.
2. Retention comes from monthly/weekly action reports.
3. Expansion path: buyer CRM, stock ledger, financing readiness.
4. Integration is env-gated and incremental.

Trap to avoid:

Do not present every module as equally finished.

### 6.3 Adir Ginting - Google Cloud, Enterprise/Public Sector

Likely lens:

1. Cloud architecture.
2. Security.
3. Cost discipline.
4. Readiness for public-sector constraints.

Answer angle:

> Kami desain cloud-nya hemat dan governable: Cloud Run untuk scale-to-zero API, Secret Manager untuk credential, Cloud Logging untuk audit, Cloud Scheduler/Run Jobs untuk import data berkala, dan budget alert untuk menjaga kredit. Shared DB diperlakukan read-only untuk evidence, sedangkan turunan tim memakai prefix `anak_sarengklek_`.

Strong points:

1. No secrets in code or UI.
2. Authenticated endpoints for shared DB aggregates.
3. Aggregate-only response, no PII.
4. No always-on GPU.
5. Timeout and rate-limit wrappers for external sources.

Trap to avoid:

Do not paste shared DB or Google account passwords in slides, docs, or demo.

### 6.4 Prof. Dr. Eko Kuswardono - AI Expert and Academic

Likely lens:

1. Is AI explainable?
2. What is the model?
3. How do you prevent hallucination?
4. How do you evaluate outputs?

Answer angle:

> AI di MVP kami bukan autonomous decision-maker. Ia berperan sebagai recommendation assistant. Inputnya source-labeled Postgres/metadata, outputnya berisi alasan, komponen skor, evidence, confidence, dan next action. Operator/pengurus tetap approve sebelum aksi.

Strong points:

1. Rules/Postgres baseline first.
2. Provider AI only when configured.
3. Human-in-the-loop.
4. Guardrail: no PII exposure and no unsupported claims.
5. Evaluation: compare recommendations with verified stock, transactions, and partnership outcomes.

Trap to avoid:

Do not say "AI tahu semua potensi desa" or "AI otomatis memilih buyer terbaik."

### 6.5 Rahmatina Awaliah K - PEBS UI

Likely lens:

1. Economic impact.
2. Cooperative governance.
3. Inclusiveness.
4. Local value creation.

Answer angle:

> Dampak utamanya adalah memperkuat koperasi sebagai aggregator ekonomi desa. Sistem membantu menemukan komoditas yang belum naik kelas, melihat gap produk/stok, menyarankan nilai tambah, dan membuat laporan yang bisa dibawa ke rapat pengurus.

Strong points:

1. Koperasi remains decision center.
2. Village potential becomes action, not just map.
3. Supports value-add and local jobs.
4. Keeps financing as readiness, not automatic loan.

Trap to avoid:

Do not turn the cooperative into a passive seller inside someone else's marketplace.

### 6.6 Riza Azmi - Kemenkop Digitalization

Likely lens:

1. Fit with cooperative policy.
2. SIMKOPDES readiness.
3. Data governance.
4. Practical use for koperasi/pendamping.

Answer angle:

> Lumbung Bersama tidak menggantikan SIMKOPDES. MVP kami menjadi lapisan operasional yang menyiapkan data, evidence, dan action report. Integrasi SIMKOPDES diposisikan sebagai readiness/mapping target, bukan klaim produksi.

Strong points:

1. Table prefix follows hackathon rule: `anak_sarengklek_`.
2. Shared DB access is read-only for audit evidence.
3. No PII in demo endpoints.
4. Laporan aksi helps pendamping and pengurus.
5. Human approval aligns with cooperative governance.

Trap to avoid:

Do not claim official production integration with Kemenkop unless proven.

## 7. Five-Minute Demo Run Of Show

### Minute 0:00-0:40 - Problem and Product

Say:

> Banyak desa punya potensi komoditas, tetapi koperasi sering belum punya cara cepat untuk melihat mana yang paling siap dikembangkan, buyer mana yang cocok, dan gap stok apa yang harus ditutup.

Show:

1. Landing or dashboard title.
2. MVP flow.
3. Source labels.

### Minute 0:40-1:40 - Peta Potensi Desa

Say:

> Kami mulai dari peta karena masalahnya spasial dan sektoral. Potensi desa harus dilihat bersama wilayah, koperasi, dan komoditasnya.

Show:

1. `/peta-unggulan`.
2. Search wilayah.
3. Layer or source indicator.
4. Detail panel with commodity/readiness.

### Minute 1:40-2:30 - Opportunity Recommendation

Say:

> Sistem tidak hanya menampilkan data. Ia mengubah data menjadi prioritas: apa komoditas yang perlu dikejar, kenapa, bukti apa, dan apa risiko datanya.

Show:

1. Recommendation card.
2. Component score.
3. Evidence/source.
4. Next action.

### Minute 2:30-3:30 - Buyer Matching Lite

Say:

> Tahap berikutnya bukan langsung checkout. Koperasi perlu melihat buyer archetype atau buyer requirement yang cocok, lalu pengurus menyetujui outreach.

Show:

1. Buyer matching pipeline.
2. Match reason.
3. Stock/readiness.
4. Human approval.

### Minute 3:30-4:20 - WA/Operator Verification and Stock

Say:

> Karena data lapangan sering berubah, WA dan operator dipakai untuk verifikasi dan follow-up. Live delivery tetap env-gated.

Show:

1. WA intake or operator queue.
2. Stock/readiness.
3. Draft follow-up.

### Minute 4:20-5:00 - Laporan Aksi

Say:

> Output akhirnya adalah laporan aksi untuk rapat koperasi: top opportunities, bukti, pending verification, buyer action, stock risk, dan keputusan berikutnya.

Show:

1. `/laporan`.
2. Report sections.
3. Lock/export state.

## 8. Three-Minute Pitch Script

> Indonesia punya potensi ekonomi desa yang besar, tetapi di lapangan data potensi, koperasi, produk, stok, dan buyer sering terpisah. Akibatnya koperasi sulit menentukan komoditas mana yang paling siap dikembangkan dan siapa buyer yang tepat.
>
> Lumbung Bersama menjawab itu dengan operating layer koperasi. Flow MVP kami adalah Peta Potensi Desa, Rekomendasi Komoditas atau Produk, Buyer Matching Lite, Stok/Readiness, dan Laporan Aksi.
>
> Sistem membaca data wilayah, komoditas desa, koperasi, produk, inventaris, transaksi, dan pengajuan kemitraan. Dari sana kami menghasilkan opportunity score yang explainable: ada komponen potensi komoditas, kesiapan koperasi, produk/stok, sinyal pasar, kemitraan, dan kelengkapan data.
>
> Kami sengaja tidak memulai dari marketplace penuh. Koperasi perlu trust layer lebih dulu: bukti data, gap readiness, approval pengurus, dan action report. Buyer matching kami juga tidak mengklaim checkout. Ia memberi shortlist atau archetype buyer yang cocok dan menghasilkan outreach yang perlu disetujui manusia.
>
> Untuk hackathon, shared database dipakai sebagai evidence layer read-only, endpoint kami aggregate-only dan tidak mengekspos PII. Integrasi seperti WhatsApp, AI provider, dan SIMKOPDES kami gate dengan environment dan label sumber agar klaim tetap aman.
>
> Dampaknya: potensi desa yang tadinya hanya tersimpan sebagai data bisa berubah menjadi rencana bisnis koperasi yang jelas, bisa diaudit, dan bisa ditindaklanjuti oleh pengurus, pendamping, dan buyer.

## 9. Ninety-Second Pitch

> Lumbung Bersama adalah dashboard kerja koperasi untuk mengubah potensi desa menjadi aksi ekonomi yang terukur. Kami mulai dari peta potensi desa, lalu sistem merekomendasikan komoditas atau produk prioritas berdasarkan data wilayah, koperasi, produk, stok, transaksi, dan kemitraan. Setelah itu koperasi mendapat buyer matching lite, bukan marketplace checkout, tetapi shortlist dan alasan match yang perlu disetujui pengurus. Output akhirnya adalah laporan aksi untuk rapat koperasi.
>
> Kekuatan kami ada pada trust layer. Setiap rekomendasi memiliki sumber data, komponen skor, confidence, dan status human approval. Shared DB hackathon kami gunakan secara read-only dan aggregate-only, tanpa menampilkan PII. WhatsApp dan AI juga tidak kami overclaim: WA adalah intake/verifikasi, AI adalah assistant yang explainable, keputusan tetap oleh koperasi.
>
> Dengan MVP ini, koperasi bisa melihat potensi mana yang belum optimal, produk apa yang perlu dinaikkan nilainya, buyer mana yang paling cocok, dan gap stok apa yang perlu ditutup.

## 10. Thirty-Second Pitch

> Lumbung Bersama membantu koperasi desa mengubah data potensi desa menjadi rekomendasi usaha yang bisa diaudit. Flow-nya: peta potensi, rekomendasi komoditas, buyer matching lite, stok/readiness, lalu laporan aksi. Kami tidak menjual klaim marketplace penuh. Kami membangun trust layer agar pengurus tahu potensi mana yang paling siap, buyer mana yang cocok, dan bukti data apa yang mendukung keputusan.

## 11. Quick Answer Bank

### Q1. Ini marketplace?

Answer:

> Bukan marketplace penuh. Ini operating layer dan trust layer untuk koperasi. Buyer matching ada, tetapi tahapnya approval dan outreach, bukan checkout/payment.

### Q2. Apa AI-nya?

Answer:

> AI/rules membantu membuat rekomendasi explainable dari data koperasi dan potensi desa. Outputnya berisi evidence, score breakdown, dan next action. Keputusan tetap manusia.

### Q3. Apa bedanya dengan dashboard BI?

Answer:

> BI biasanya berhenti di visualisasi. Lumbung Bersama mengubah data menjadi workflow: rekomendasi, buyer match, stock readiness, follow-up, dan laporan aksi.

### Q4. Apa data pendukung dari database?

Answer:

> Ada wilayah, profil desa, komoditas desa, mapping koperasi-wilayah, profil koperasi, produk, inventaris, barang masuk/keluar, transaksi, kemitraan, pembiayaan, modal, dokumen, dan RAT.

### Q5. Bagaimana tahu potensi belum optimal?

Answer:

> Kami cari gap antara potensi komoditas dan bukti konversi: produk, stok, transaksi, dan kemitraan. Potensi tinggi tetapi produk/stok/transaksi rendah menjadi kandidat underutilized.

### Q6. Bagaimana cocokkan buyer?

Answer:

> Dari product fit, stock readiness, supply consistency, lokasi, transaksi/kemitraan, dan readiness governance. Untuk MVP, bila buyer table belum lengkap, kami gunakan buyer archetype yang transparan, bukan nama buyer palsu.

### Q7. Bagaimana menjaga PII?

Answer:

> Endpoint demo hanya aggregate-only dan tidak menampilkan NIK, nomor HP, email, alamat detail, file KTP, atau data anggota/pelanggan. Secrets hanya di environment/Secret Manager.

### Q8. Apakah sudah terhubung WhatsApp?

Answer:

> Sistem memiliki route dan gating untuk WA intake. Untuk demo, kami sebut sebagai draft/intake kecuali token produksi benar-benar configured dan smoke-tested.

### Q9. Apakah sudah SIMKOPDES?

Answer:

> Belum klaim integrasi produksi. Database hackathon juga sudah dijelaskan sebagai representasi terbatas, bukan referensi utama. Kami menggunakannya untuk eksplorasi pola dan menyiapkan mapping/readiness agar integrasi resmi bisa dilakukan bila akses dan standar diberikan.

### Q10. Apakah cloud-nya mahal?

Answer:

> Tidak harus. MVP bisa jalan di Cloud Run scale-to-zero, Secret Manager, Cloud Logging, Cloud Scheduler/Jobs, dan budget alert. Tidak perlu GPU always-on.

### Q11. Apa monetisasinya?

Answer:

> B2B SaaS/managed platform untuk koperasi, federasi, pendamping, atau program digitalisasi, plus buyer/offtaker workflow dan implementation service. Tahap awal fokus value, bukan transaksi penuh.

### Q12. Bagaimana validasi dampak?

Answer:

> Ukur jumlah peluang yang diverifikasi, rekomendasi yang disetujui, buyer outreach, peningkatan stok siap jual, transaksi/kemitraan lanjutan, dan laporan aksi yang dipakai pengurus.

### Q13. Apa risiko terbesar?

Answer:

> Kualitas dan kelengkapan data lapangan. Karena itu kami desain source label, data quality endpoint, human verification, dan tidak mengklaim data lebih kuat dari buktinya.

### Q14. Kalau datanya kosong?

Answer:

> Dashboard tetap menunjukkan gap: source mana kosong, field mana perlu verifikasi, dan aksi operator apa yang perlu dilakukan. MVP tidak memalsukan angka.

### Q15. Bagaimana koperasi kecil bisa pakai?

Answer:

> Mulai dari dashboard sederhana, WA/operator intake, dan laporan aksi. Tidak perlu integrasi besar di awal.

### Q16. Apa yang sudah dibuat?

Answer:

> App sudah memiliki auth/session, dashboard, Peta Unggulan, WA intake/gating, Agent Center rules/Postgres, report surface, shared DB read-only helper, dan endpoint aggregate MVP summary.

### Q17. Apa yang belum ready?

Answer:

> Buyer CRM penuh, stock ledger detail, live WA production verification, SIMKOPDES production integration, and complete DB-backed authenticated QA need follow-up after safe runtime/env is available.

### Q18. Kenapa tidak langsung bikin marketplace?

Answer:

> Marketplace butuh supply, demand, quality, trust, payment, and logistics. Koperasi butuh trust and readiness layer dulu agar supply yang masuk marketplace memang siap.

### Q19. Apakah rekomendasi bisa bias?

Answer:

> Bisa jika data bias. Itu sebabnya model kami explainable, source-labeled, and human-reviewed. Skor adalah prioritas awal, bukan kebenaran final.

### Q20. Bagaimana scale nasional?

Answer:

> Scale dimulai dari common schema and source labels. Per wilayah bisa tambah connector resmi, operator verification, and cached boundary/data import. We avoid claiming all villages are verified before evidence exists.

## 12. Counter Scenarios

### Scenario A: Judge says "Ini terlalu banyak fitur."

Answer:

> Kami setuju kalau semuanya dianggap produk penuh. Karena itu MVP kami hanya satu flow: peta -> rekomendasi -> buyer matching lite -> stok/readiness -> laporan aksi. Modul lain hanya supporting surface.

### Scenario B: Judge says "Mana AI-nya kalau masih rules?"

Answer:

> Rules/Postgres baseline justru guardrail. AI layer dapat menulis explanation, rekomendasi, and next action from verified inputs. For public-sector/cooperative contexts, explainability and human approval are more important than black-box automation.

### Scenario C: Judge says "Data desa sering tidak akurat."

Answer:

> Betul. Produk kami didesain untuk itu. Kami tidak hanya menampilkan data, tetapi menunjukkan source, completeness, verification status, and follow-up action.

### Scenario D: Judge says "Buyer matching tanpa buyer real tidak valid."

Answer:

> Untuk MVP, buyer archetype adalah readiness proxy agar tidak membuat nama buyer palsu. Jika buyer table tersedia, logic yang sama dapat diganti dengan buyer requirements real: komoditas, volume, lokasi, kualitas, harga, and schedule.

### Scenario E: Judge says "Ini bisa diganti Excel."

Answer:

> Excel bisa menyimpan data, tetapi tidak otomatis memberi workflow: map drilldown, source labels, score components, approval trail, WA intake, buyer pipeline, stock readiness, and action report.

### Scenario F: Judge says "Koperasi belum digital mature."

Answer:

> Karena itu UX kami tidak mulai dari ERP kompleks. Mulainya dari peta, queue verifikasi, and laporan aksi. Operator atau pendamping bisa menjadi bridge.

### Scenario G: Judge says "Apa dampak untuk petani/UMKM?"

Answer:

> Mereka mendapat jalur yang lebih jelas dari potensi menuju koperasi, produk, buyer, and action. Koperasi menjadi aggregator, sehingga nilai tambah tidak langsung diambil platform luar.

### Scenario H: Judge says "Bagaimana security?"

Answer:

> Auth menggunakan session HttpOnly, password hash PBKDF2, role checks for operational mutations, CSRF same-origin gate, env-gated secrets, and aggregate-only shared DB endpoint. Next step is DB-backed automated security tests.

### Scenario I: Judge says "Apakah data anggota aman?"

Answer:

> Data anggota/pengurus/pelanggan tidak ditampilkan di endpoint demo. We use aggregates and cooperative-level signals only. PII remains outside the public demo and should be governed by role-based access.

### Scenario M: Judge says "Kalau skema database bukan referensi utama, kenapa analisis kalian valid?"

Answer:

> Justru karena skema ini dinyatakan sebagai bahan eksplorasi, kami tidak menggunakannya untuk klaim produksi. Kami menggunakannya untuk membaca pola masalah: wilayah, komoditas, koperasi, produk, stok, transaksi, dan kemitraan ternyata perlu dihubungkan. Solusi kami adalah inovasi workflow yang bisa divalidasi ulang saat referensi resmi atau akses produksi tersedia.

### Scenario J: Judge says "Kenapa perlu Google Cloud?"

Answer:

> Cloud Run gives cheap scale-to-zero APIs, Secret Manager protects credentials, Cloud Logging supports audit, and scheduled jobs can refresh source data. This fits limited hackathon credits.

### Scenario K: Judge says "Apa yang akan kalian deploy dalam 24 jam?"

Answer:

> Prioritas: endpoint aggregate for data quality/opportunity/buyer matching, dashboard panels that consume them, login/health gating, and one clean demo flow ending in laporan aksi.

### Scenario L: Judge says "Apa KPI pilot?"

Answer:

> Verified opportunities, approved recommendations, buyer outreach count, stock readiness improvements, pending data quality flags reduced, and reports used in cooperative meetings.

## 13. Red-Line Claim List

Never claim these unless proven live:

1. Live WhatsApp delivery succeeded.
2. Production SIMKOPDES integration.
3. Full national verified desa coverage.
4. Autonomous AI decisions.
5. Automatic loan approval.
6. Payment settlement.
7. Real named buyer/offtaker commitments.
8. Personal data display is safe without role gating.
9. Shared DB writes are available.
10. Google Cloud budget cannot overrun.

Safe alternatives:

1. "Env-gated and ready to configure."
2. "Read-only evidence layer."
3. "Source-labeled baseline."
4. "Human-reviewed recommendation."
5. "Buyer matching lite/archetype until buyer requirements are loaded."
6. "Readiness/mapping toward integration."

## 14. Final Battle Card

Main message:

> Lumbung Bersama turns village potential data into cooperative action.

Product category:

> Cooperative operating layer and trust layer.

MVP:

> Peta Potensi Desa, Opportunity Recommendation, Buyer Matching Lite, Stock/Readiness, Laporan Aksi.

Differentiator:

> Source-labeled, explainable, human-reviewed workflow, not just map/marketplace/BI.

Database proof:

> Uses wilayah, desa, komoditas, koperasi, produk, stok, transaksi, kemitraan, pembiayaan, dokumen, and RAT tables.

AI stance:

> Explainable assistant. Not autonomous decision-maker.

Cloud stance:

> Cheap, secure, auditable: Cloud Run, Secret Manager, Cloud Logging, Scheduler/Jobs, budget alert.

Security stance:

> Authenticated, env-gated, aggregate-only shared DB, no PII in demo.

Policy stance:

> Strengthens cooperative governance and prepares data for future integration, without replacing official systems.

Closing line:

> Kami tidak hanya membuat peta potensi. Kami membuat jalur dari potensi menuju keputusan koperasi yang bisa dipertanggungjawabkan.

## 15. Presentation Checklist

Before presenting:

1. No secrets visible in terminal, slides, docs, or browser.
2. Use `anak_sarengklek_` as team table prefix for any derived table.
3. Source labels visible on data cards.
4. Demo fallback/baseline clearly labeled.
5. PII not shown.
6. Auth/login and integration health are ready.
7. WA wording says draft/intake unless live delivery is proven.
8. AI wording says rules/Postgres or provider-configured assistant, not autonomous.
9. Buyer matching says lite/archetype unless real buyer data is loaded.
10. Laporan Aksi is shown as final output.
