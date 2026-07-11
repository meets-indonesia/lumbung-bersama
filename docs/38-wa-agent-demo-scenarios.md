# WA Agent Demo Scenarios

Generated: 2026-07-11

Use these prompts for the hackathon video/live demo. They are designed to hit real app data paths: local operational DB, map commodity signals, stock rows, queue rows, media evidence metadata, and shared DB aggregate readers when configured. Do not use real personal data in the demo.

## Rules For Demo

- Informational questions should be answered automatically and should not create an operator ticket.
- Manual-impact flows create a ticket/review item: loan request, buyer outreach, final negotiation, restock/pickup, data correction, and media/document evidence.
- The bot must not claim automatic loan approval, final deal approval, live SIMKOPDES production access, named buyer commitment, or real-time price if no price field exists in data.
- If a price number appears, it must come from available DB fields such as transaction value/quantity or inventory price. If only `price_signal` exists, the answer should say signal/trend rather than invent a per-kg price.

## Video Flow

| Step | Prompt to send in WA | Expected behavior | Ticket? | Data basis |
|---|---|---|---|---|
| 1 | `menu` | Welcome message with agent choices and quick buttons. | No | WA router |
| 2 | `Apa potensi kopi di Wanasari?` | Peta/potensi agent explains kopi context and asks for volume/grade/evidence if needed. | No | `village_commodities`, `villages`, commodity profile |
| 3 | `Cek harga atau sinyal harga kopi kering di Wanasari` | Harga agent answers from DB evidence. If no numeric price exists, it says signal such as trend/price signal and does not invent angka. | No | `village_commodities.price_signal`, shared transaction/inventory price when configured |
| 4 | `Stok beras medium di gerai masih ada?` | Stok agent answers stock/readiness context from operational stock data. | No | `stock_items`, `anak_sarengklek_stock_ledger` |
| 5 | `Beras medium di gerai habis, minta restock 20 karung` | Restock/stock agent creates follow-up review and tells user operator will act within 24 hours. | Yes | `wa_messages`, `operator_queue`, stock module |
| 6 | `Mau jual kopi kering 120 kg grade A di Wanasari` | Buyer flow checks price/readiness first, asks for grade/photo/pickup, and creates commercial approval queue. | Yes | WA intake, buyer readiness, stock/commodity context |
| 7 | `Buyer minta harga kopi lebih rendah, bantu bahan nego` | Negotiation flow gives non-final negotiation checklist and keeps approval with operator/pengurus. | Yes | price evidence + negotiation guardrail |
| 8 | `Saya ajukan pinjaman pupuk Rp1.000.000 untuk musim tanam, bayar setelah panen kopi` | Pembiayaan readiness says "siap masuk review komite", not approved. | Yes | finance readiness rules + aggregate finance data |
| 9 | `Mau pinjam Rp50.000.000 untuk kebutuhan pribadi, belum ada usaha dan belum tahu cara bayar` | Pembiayaan readiness says "perlu revisi sebelum review komite" and explains missing productive purpose/repayment. | Yes | finance readiness rules + aggregate finance data |
| 10 | Send a product/photo/PDF with caption `Bukti timbang kopi Wanasari` | Document agent extracts OCR/PDF text when supported, stores redacted evidence metadata, and sends review note. | Yes | media download, OCR/PDF parser, `anak_sarengklek_media_evidence` |
| 11 | `Tolong buat ringkasan laporan aksi untuk stok dan buyer minggu ini` | Report agent summarizes as action material and keeps decisions human-reviewed. | Yes | operator queue, agent runs, stock ledger, buyer readiness |
| 12 | `terima kasih` | Bot closes politely and says user can type `menu` later. | No | WA close trigger |

## Prompt Yang Aman Untuk Direkam

Pakai prompt ini agar video demo menampilkan jawaban yang memang punya basis data saat ini.

| Agent | Prompt | Yang Harus Terlihat |
|---|---|---|
| Welcome/router | `menu` | Salam Kopdes Lumbung Bersama dan pilihan agent. |
| Peta potensi | `Apa potensi kopi di Wanasari?` | Jawaban memakai komoditas Wanasari, volume 120 kg, sinyal harga, peluang sortasi/pengeringan, dan risiko kadar air. |
| Harga/sinyal | `Cek sinyal harga kopi kering di Wanasari` | Jawaban otomatis tanpa ticket. Jika tidak ada angka harga/kg, bot menyebut bukti inventaris/sinyal harga dan alasan tidak mengarang angka. |
| Stok | `Stok beras medium di gerai masih ada?` | Jawaban memakai stok operasional: beras medium, 28 karung, status stok aman. |
| Restock | `Beras medium di gerai habis, minta restock 20 karung` | Ticket dibuat karena ini aksi operasional. Bot menyebut tindak lanjut maksimal 24 jam. |
| Buyer matching | `Mau jual kopi kering 120 kg grade A di Wanasari` | Ticket dibuat karena ada potensi transaksi/outreach. Bot meminta foto, grade, lokasi pickup, dan tidak membuat nama buyer palsu. |
| Negosiasi | `Buyer minta harga kopi lebih rendah, bantu bahan nego` | Ticket/approval komersial dibuat; bot memberi bahan cek dan tidak mengunci floor price final. |
| Pinjaman siap review | `Saya ajukan pinjaman pupuk Rp1.000.000 untuk musim tanam, bayar setelah panen kopi` | Bot menjawab "Siap masuk review komite", bukan disetujui otomatis. |
| Pinjaman ditahan | `Mau pinjam Rp50.000.000 untuk kebutuhan pribadi, belum ada usaha dan belum tahu cara bayar` | Bot menjawab "Perlu revisi sebelum review komite" dan menjelaskan alasan. |
| Dokumen/OCR | Kirim foto/PDF dengan caption `Bukti timbang kopi Wanasari` | Bot memisahkan hasil baca OCR/PDF dari rekomendasi agent, lalu membuat review evidence. |
| Laporan | `Tolong buat ringkasan laporan aksi untuk stok dan buyer minggu ini` | Bot menyiapkan bahan laporan aksi dan menandai keputusan tetap human-reviewed. |
| Penutup | `terima kasih` | Bot menutup percakapan dengan sopan. |

Hindari prompt harga seperti `Harga beras per kilo di Lampung` untuk klaim angka final, kecuali connector harga resmi sudah diberi API key atau data DB memang memiliki field harga satuan. Saat ini shared DB siap dibaca tetapi transaksi tidak memuat item/kuantitas produk, jadi bot akan menjawab dengan evidence produk/stok/sinyal dan tidak mengarang angka.

## Negative Scope Check

Prompt: `Siapa presiden Amerika sekarang?`

Expected answer: refusal/redirect because it is outside Lumbung Bersama/koperasi desa. No operator ticket should be created.

## Suggested Recording Script

1. Open dashboard WA Inbox in browser.
2. Send `menu` from WA and show welcome.
3. Send one automatic question: `Cek harga atau sinyal harga kopi kering di Wanasari`.
4. Show it appears in WA Inbox without operator ticket.
5. Send one operational ticket: `Mau jual kopi kering 120 kg grade A di Wanasari`.
6. Show WA Inbox and operator queue entry.
7. Send loan ready prompt and show "siap masuk review komite" without approval claim.
8. Send loan risky prompt and show "perlu revisi sebelum review komite".
9. Send `terima kasih` and show closing response.
