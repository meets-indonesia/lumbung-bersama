import { requireAuthenticatedRequest } from "@/lib/auth";
import {
  hackathonDbRequiredResponse,
  HACKATHON_SCHEMA_SCOPE,
  HACKATHON_TABLE_PREFIX,
  isHackathonSharedDbConfigured,
  queryHackathonRows,
} from "@/lib/hackathon-shared-db";
import { buildSourceCaveatFields } from "@/lib/commodity-intelligence";

export const runtime = "nodejs";

type CommodityRow = {
  totalRows: number;
  missingKodeWilayah: number;
  missingKomoditasRef: number;
  missingNamaKomoditas: number;
  missingVolume: number;
  missingLuasArea: number;
  missingNilaiPotensiDesa: number;
  volumeTextNumericRisk: number;
  luasAreaTextNumericRisk: number;
};

type CooperativeRow = {
  totalRows: number;
  missingKoperasiRef: number;
  missingNamaKoperasi: number;
  missingStatusRegistrasi: number;
  missingKoordinatDibulatkan: number;
};

type InventoryRow = {
  totalRows: number;
  missingKoperasiRef: number;
  missingNamaProduk: number;
  missingStok: number;
  negativeStock: number;
  genericProductLabels: number;
  productNameVariants: number;
};

type PartnershipRow = {
  totalRows: number;
  missingKoperasiRef: number;
  missingStatusPermohonan: number;
  missingBisnisKemitraan: number;
};

type CompletenessCheck = {
  field: string;
  missingRows: number;
  presentRows: number;
  completenessRate: number | null;
};

type QualityRiskCheck = {
  field: string;
  risk: string;
  affectedRows: number;
  affectedRate: number | null;
};

type TableCheck = {
  table: string;
  totalRows: number;
  missingKeyRefs: CompletenessCheck[];
  completeness: CompletenessCheck[];
  quality: QualityRiskCheck[];
};

const DECIMAL_TEXT_PATTERN = "^-?[0-9]+([.,][0-9]+)?$";

function rate(totalRows: number, affectedRows: number) {
  if (totalRows <= 0) return null;
  return Number((affectedRows / totalRows).toFixed(4));
}

function completenessMetric(totalRows: number, field: string, missingRows: number): CompletenessCheck {
  return {
    field,
    missingRows,
    presentRows: Math.max(totalRows - missingRows, 0),
    completenessRate: rate(totalRows, Math.max(totalRows - missingRows, 0)),
  };
}

function qualityMetric(totalRows: number, field: string, risk: string, affectedRows: number): QualityRiskCheck {
  return {
    field,
    risk,
    affectedRows,
    affectedRate: rate(totalRows, affectedRows),
  };
}

async function getDataQualityChecks() {
  const [commodityRows, cooperativeRows, inventoryRows, partnershipRows] = await Promise.all([
    queryHackathonRows<CommodityRow>(
      `SELECT
         COUNT(*)::int AS "totalRows",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(kode_wilayah::text), '') IS NULL)::int AS "missingKodeWilayah",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(komoditas_ref::text), '') IS NULL)::int AS "missingKomoditasRef",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(nama_komoditas::text), '') IS NULL)::int AS "missingNamaKomoditas",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(volume::text), '') IS NULL)::int AS "missingVolume",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(luas_area::text), '') IS NULL)::int AS "missingLuasArea",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(nilai_potensi_desa::text), '') IS NULL)::int AS "missingNilaiPotensiDesa",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(volume::text), '') IS NOT NULL
             AND BTRIM(volume::text) !~ $1
         )::int AS "volumeTextNumericRisk",
         COUNT(*) FILTER (
           WHERE NULLIF(BTRIM(luas_area::text), '') IS NOT NULL
             AND BTRIM(luas_area::text) !~ $1
         )::int AS "luasAreaTextNumericRisk"
       FROM referensi_komoditas_desa`,
      [DECIMAL_TEXT_PATTERN],
    ),
    queryHackathonRows<CooperativeRow>(
      `SELECT
         COUNT(*)::int AS "totalRows",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(koperasi_ref::text), '') IS NULL)::int AS "missingKoperasiRef",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(nama_koperasi::text), '') IS NULL)::int AS "missingNamaKoperasi",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(status_registrasi::text), '') IS NULL)::int AS "missingStatusRegistrasi",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(koordinat_dibulatkan::text), '') IS NULL)::int AS "missingKoordinatDibulatkan"
       FROM profil_koperasi`,
    ),
    queryHackathonRows<InventoryRow>(
      `SELECT
         COUNT(*)::int AS "totalRows",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(koperasi_ref::text), '') IS NULL)::int AS "missingKoperasiRef",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(nama_produk::text), '') IS NULL)::int AS "missingNamaProduk",
         COUNT(*) FILTER (WHERE stok IS NULL)::int AS "missingStok",
         COUNT(*) FILTER (WHERE stok < 0)::int AS "negativeStock",
         COUNT(*) FILTER (
           WHERE LOWER(COALESCE(nama_produk::text, '')) ~ '(barang lainnya|barang lain|lainnya|produk lainnya|other)'
         )::int AS "genericProductLabels",
         COUNT(DISTINCT LOWER(NULLIF(BTRIM(nama_produk::text), '')))::int AS "productNameVariants"
       FROM inventaris_produk`,
    ),
    queryHackathonRows<PartnershipRow>(
      `SELECT
         COUNT(*)::int AS "totalRows",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(koperasi_ref::text), '') IS NULL)::int AS "missingKoperasiRef",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(status_permohonan::text), '') IS NULL)::int AS "missingStatusPermohonan",
         COUNT(*) FILTER (WHERE NULLIF(BTRIM(bisnis_kemitraan::text), '') IS NULL)::int AS "missingBisnisKemitraan"
       FROM pengajuan_kemitraan`,
    ),
  ]);

  const commodity = commodityRows[0] ?? {
    totalRows: 0,
    missingKodeWilayah: 0,
    missingKomoditasRef: 0,
    missingNamaKomoditas: 0,
    missingVolume: 0,
    missingLuasArea: 0,
    missingNilaiPotensiDesa: 0,
    volumeTextNumericRisk: 0,
    luasAreaTextNumericRisk: 0,
  };
  const cooperative = cooperativeRows[0] ?? {
    totalRows: 0,
    missingKoperasiRef: 0,
    missingNamaKoperasi: 0,
    missingStatusRegistrasi: 0,
    missingKoordinatDibulatkan: 0,
  };
  const inventory = inventoryRows[0] ?? {
    totalRows: 0,
    missingKoperasiRef: 0,
    missingNamaProduk: 0,
    missingStok: 0,
    negativeStock: 0,
    genericProductLabels: 0,
    productNameVariants: 0,
  };
  const partnership = partnershipRows[0] ?? {
    totalRows: 0,
    missingKoperasiRef: 0,
    missingStatusPermohonan: 0,
    missingBisnisKemitraan: 0,
  };

  const checks: TableCheck[] = [
    {
      table: "referensi_komoditas_desa",
      totalRows: commodity.totalRows,
      missingKeyRefs: [
        completenessMetric(commodity.totalRows, "kode_wilayah", commodity.missingKodeWilayah),
        completenessMetric(commodity.totalRows, "komoditas_ref", commodity.missingKomoditasRef),
      ],
      completeness: [
        completenessMetric(commodity.totalRows, "nama_komoditas", commodity.missingNamaKomoditas),
        completenessMetric(commodity.totalRows, "volume", commodity.missingVolume),
        completenessMetric(commodity.totalRows, "luas_area", commodity.missingLuasArea),
        completenessMetric(
          commodity.totalRows,
          "nilai_potensi_desa",
          commodity.missingNilaiPotensiDesa,
        ),
      ],
      quality: [
        qualityMetric(
          commodity.totalRows,
          "volume",
          "non-decimal-text-or-unit-suffix-before-normalization",
          commodity.volumeTextNumericRisk,
        ),
        qualityMetric(
          commodity.totalRows,
          "luas_area",
          "non-decimal-text-or-unit-suffix-before-normalization",
          commodity.luasAreaTextNumericRisk,
        ),
      ],
    },
    {
      table: "profil_koperasi",
      totalRows: cooperative.totalRows,
      missingKeyRefs: [completenessMetric(cooperative.totalRows, "koperasi_ref", cooperative.missingKoperasiRef)],
      completeness: [
        completenessMetric(cooperative.totalRows, "nama_koperasi", cooperative.missingNamaKoperasi),
        completenessMetric(cooperative.totalRows, "status_registrasi", cooperative.missingStatusRegistrasi),
        completenessMetric(
          cooperative.totalRows,
          "koordinat_dibulatkan",
          cooperative.missingKoordinatDibulatkan,
        ),
      ],
      quality: [],
    },
    {
      table: "inventaris_produk",
      totalRows: inventory.totalRows,
      missingKeyRefs: [completenessMetric(inventory.totalRows, "koperasi_ref", inventory.missingKoperasiRef)],
      completeness: [
        completenessMetric(inventory.totalRows, "nama_produk", inventory.missingNamaProduk),
        completenessMetric(inventory.totalRows, "stok", inventory.missingStok),
      ],
      quality: [
        qualityMetric(inventory.totalRows, "stok", "negative-or-null-stock-risk", inventory.negativeStock),
        qualityMetric(
          inventory.totalRows,
          "nama_produk",
          "generic-product-label-needs-reclassification",
          inventory.genericProductLabels,
        ),
        qualityMetric(
          inventory.totalRows,
          "nama_produk",
          "product-name-variants-need-normalization",
          inventory.productNameVariants,
        ),
      ],
    },
    {
      table: "pengajuan_kemitraan",
      totalRows: partnership.totalRows,
      missingKeyRefs: [completenessMetric(partnership.totalRows, "koperasi_ref", partnership.missingKoperasiRef)],
      completeness: [
        completenessMetric(partnership.totalRows, "status_permohonan", partnership.missingStatusPermohonan),
        completenessMetric(partnership.totalRows, "bisnis_kemitraan", partnership.missingBisnisKemitraan),
      ],
      quality: [],
    },
  ];

  return {
    source: "hackathon-shared-db-read-only",
    mode: "aggregate-only-no-pii",
    tablePrefix: HACKATHON_TABLE_PREFIX,
    schemaScope: HACKATHON_SCHEMA_SCOPE,
    sourceCaveat: buildSourceCaveatFields(
      "data-quality aggregate checks",
      checks.some((check) => check.totalRows > 0) ? "medium" : "limited",
      "shared-db-read-only-aggregate",
    ),
    checks,
    piiGuardrails: {
      enforcement:
        "aggregate counts only; no row samples, identifiers, contact values, addresses, file paths, or documents are selected or returned",
      excludedFields: [
        "nik",
        "phone",
        "email",
        "alamat",
        "nama_anggota",
        "nama_pengurus",
        "nama_pelanggan",
        "nama_member",
        "nama_pemilik_rekening",
        "file_ktp",
        "file_kk",
        "foto",
        "dokumen",
        "path_file",
      ],
      notes: [
        "Only COUNT and aggregate FILTER checks are used.",
        "Any row-level review must stay in authenticated operator workflows.",
      ],
    },
    recommendations: [
      "Backfill missing kode_wilayah, komoditas_ref, and koperasi_ref values before any cross-table reporting.",
      "Normalize volume and luas_area into numeric value plus unit so simple text parsing does not leak into ranking logic.",
      "Treat missing stok and negative stok rows as cleanup items before inventory readiness is used in demos.",
      "Require status_permohonan and bisnis_kemitraan completion before summarizing kemitraan readiness.",
    ],
  };
}

export async function GET(request: Request) {
  if (!isHackathonSharedDbConfigured()) return hackathonDbRequiredResponse();

  const auth = await requireAuthenticatedRequest(request);
  if (auth.response) return auth.response;

  try {
    return Response.json(await getDataQualityChecks());
  } catch (error) {
    return Response.json(
      {
        error: "HACKATHON_SHARED_DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Shared DB query failed.",
        tablePrefix: HACKATHON_TABLE_PREFIX,
      },
      { status: 502 },
    );
  }
}
