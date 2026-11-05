import { prisma, isDbConnected } from "./prisma";
import {
  calculateFineGold,
  calculateAllowedWastage,
  calculateActualWastage,
  calculateExcessWastage,
  assessOldGold,
  detectKarigarWastageDrift,
} from "./calculations";
import Decimal from "decimal.js";

// Company A, Coimbatore Showrooms & Facilities
export const INITIAL_BRANCHES = [
  { id: "b-01", code: "SHW-01", name: "Flagship Showroom — Cross Cut Road, Gandhipuram", type: "SHOWROOM", city: "Coimbatore", address: "142 Cross Cut Road, Gandhipuram, Coimbatore 641012", phone: "+91 422 249 8001" },
  { id: "b-02", code: "SHW-02", name: "RS Puram High Street Showroom", type: "SHOWROOM", city: "Coimbatore", address: "DB Road, RS Puram, Coimbatore 641002", phone: "+91 422 254 8002" },
  { id: "b-03", code: "SHW-03", name: "Peelamedu Avinashi Road Boutique", type: "SHOWROOM", city: "Coimbatore", address: "Avinashi Road, Peelamedu, Coimbatore 641004", phone: "+91 422 257 8003" },
  { id: "b-04", code: "SHW-04", name: "Oppanakara Street Heritage Showroom", type: "SHOWROOM", city: "Coimbatore", address: "Big Bazaar & Oppanakara St Junction, Town Hall, Coimbatore 641001", phone: "+91 422 239 8004" },
  { id: "b-05", code: "SHW-05", name: "Pollachi Town Showroom", type: "SHOWROOM", city: "Pollachi", address: "New Scheme Road, Pollachi 642001", phone: "+91 4259 223 005" },
  { id: "b-06", code: "VLT-01", name: "Central Strongroom Vault (Town Hall)", type: "CENTRAL_VAULT", city: "Coimbatore", address: "Big Bazaar Street Bullion Safe, Coimbatore 641001", phone: "+91 422 230 7000" },
  { id: "b-07", code: "WRK-01", name: "Sullivan Street Master Goldsmith Workshop", type: "WORKSHOP", city: "Coimbatore", address: "Sullivan Street Goldsmith Enclave, Coimbatore 641001", phone: "+91 422 239 6000" },
  { id: "b-08", code: "REF-01", name: "Salem / Shirpur Refinery Transit Hub", type: "REFINERY", city: "Salem", address: "Bullion Refining Corridor, Tamil Nadu", phone: "+91 427 244 5000" },
];

export const INITIAL_LOCATIONS = [
  { id: "loc-01", branchId: "b-06", code: "LOC-VLT-SAFE", name: "Central Strongroom Safe A", isHolding: false },
  { id: "loc-02", branchId: "b-07", code: "LOC-WRK-FLOOR", name: "Sullivan Street Workshop Vault", isHolding: false },
  { id: "loc-03", branchId: "b-01", code: "LOC-SHW1-DISP", name: "Cross Cut Rd Showcase Display", isHolding: false },
  { id: "loc-04", branchId: "b-01", code: "LOC-SHW1-HOLD", name: "Cross Cut Rd Old-Gold Desk", isHolding: true },
  { id: "loc-05", branchId: "b-02", code: "LOC-SHW2-DISP", name: "RS Puram Showcase Display", isHolding: false },
  { id: "loc-06", branchId: "b-02", code: "LOC-SHW2-HOLD", name: "RS Puram Old-Gold Desk", isHolding: true },
  { id: "loc-07", branchId: "b-03", code: "LOC-SHW3-DISP", name: "Peelamedu Showcase Display", isHolding: false },
  { id: "loc-08", branchId: "b-04", code: "LOC-SHW4-DISP", name: "Oppanakara St Showcase Display", isHolding: false },
  { id: "loc-09", branchId: "b-05", code: "LOC-SHW5-DISP", name: "Pollachi Showcase Display", isHolding: false },
  { id: "loc-10", branchId: "b-08", code: "LOC-REF-TRANSIT", name: "Refinery Assaying Vault", isHolding: false },
];

export const INITIAL_CATEGORIES = [
  { id: "cat-01", code: "CAT-CHAIN", name: "Plain Gold Chains & Thali Chains", standardPurity: 91.6, defaultMaxWastagePct: 1.00, description: "Machine and handmade 22K chains and traditional kodi" },
  { id: "cat-02", code: "CAT-RING", name: "Studded & Plain Rings", standardPurity: 91.6, defaultMaxWastagePct: 0.80, description: "Cast, hand-set rings, navaratna, and bands" },
  { id: "cat-03", code: "CAT-NECK", name: "Bridal Necklaces & Kasu Malai", standardPurity: 91.6, defaultMaxWastagePct: 3.00, description: "Intricate Coimbatore handcrafted temple necklaces and bridal harams" },
  { id: "cat-04", code: "CAT-BANGLE", name: "Antique & Handcrafted Bangles (Valayal)", standardPurity: 91.6, defaultMaxWastagePct: 0.90, description: "Traditional kappu, antique bangles, and kadas" },
  { id: "cat-05", code: "CAT-EARRING", name: "Filigree Jimikki & Studs", standardPurity: 91.6, defaultMaxWastagePct: 1.10, description: "Delicate wire jimikki and drops" },
];

// Seed master karigars of Company A, Coimbatore
export const INITIAL_KARIGARS = [
  {
    id: "k-01",
    code: "KRG-304",
    name: "Murugesan S",
    nameTamil: "முருகேசன் எஸ்",
    phone: "+91 94431 10001",
    workshop: "Sullivan St Bay 1",
    runningBalanceFine: 3.893, // Exact balance from sample data after TX-30411, TX-30437, TX-30438!
    wastageRates: { "cat-01": 1.0, "cat-02": 0.8, "cat-03": 3.0, "cat-04": 0.9, "cat-05": 1.1 },
    historicalWastages: [2.90, 2.95, 3.00, 2.85, 3.05],
  },
  {
    id: "k-02",
    code: "KRG-305",
    name: "Kuppusamy P",
    nameTamil: "குப்புசாமி பி",
    phone: "+91 94431 10002",
    workshop: "Sullivan St Bay 1",
    runningBalanceFine: 0.0,
    wastageRates: { "cat-01": 1.0, "cat-02": 0.8, "cat-03": 2.8, "cat-04": 0.9, "cat-05": 1.1 },
    historicalWastages: [2.70, 2.80, 2.75, 2.85],
  },
  {
    id: "k-03",
    code: "KRG-306",
    name: "Palanisamy K",
    nameTamil: "பழனிசாமி கே",
    phone: "+91 94431 10003",
    workshop: "Sullivan St Bay 2",
    runningBalanceFine: 54.960,
    wastageRates: { "cat-01": 0.95, "cat-02": 0.85, "cat-03": 2.9, "cat-04": 0.9, "cat-05": 1.05 },
    historicalWastages: [2.80, 2.85, 2.90],
  },
  {
    id: "k-04",
    code: "KRG-307",
    name: "Senthil Nathan R",
    nameTamil: "செந்தில் நாதன் ஆர்",
    phone: "+91 94431 10004",
    workshop: "Sullivan St Bay 2",
    runningBalanceFine: 0.0,
    wastageRates: { "cat-01": 1.0, "cat-02": 0.8, "cat-03": 3.0, "cat-04": 0.9, "cat-05": 1.1 },
    historicalWastages: [2.95, 3.00, 3.40], // Loss drift trending high!
  },
  {
    id: "k-05",
    code: "KRG-308",
    name: "Thangavel M",
    nameTamil: "தங்கவேல் எம்",
    phone: "+91 94431 10005",
    workshop: "Sullivan St Bay 3",
    runningBalanceFine: 0.0,
    wastageRates: { "cat-01": 1.0, "cat-02": 0.8, "cat-03": 3.0, "cat-04": 0.9, "cat-05": 1.1 },
    historicalWastages: [2.85, 2.90, 2.95],
  },
  {
    id: "k-06",
    code: "KRG-309",
    name: "Arumugam R",
    nameTamil: "ஆறுமுகம் ஆர்",
    phone: "+91 94431 10006",
    workshop: "Sullivan St Bay 3",
    runningBalanceFine: 0.0,
    wastageRates: { "cat-01": 1.0, "cat-02": 0.8, "cat-03": 3.0, "cat-04": 0.9, "cat-05": 1.1 },
    historicalWastages: [2.90, 3.00],
  },
];

export const INITIAL_USERS = [
  { id: "u-01", email: "partner@companya-cbe.com", name: "Managing Partner", role: "SUPER_ADMIN", phone: "+91 94430 99999" },
  { id: "u-02", email: "finance.head@companya-cbe.com", name: "Head of Finance", role: "ACCOUNTANT", branchId: "b-06", phone: "+91 94430 88888" },
  { id: "u-03", email: "clerk@companya-cbe.com", name: "Workshop Issue Clerk", role: "INVENTORY_MANAGER", branchId: "b-07", phone: "+91 94430 77777" },
  { id: "u-04", email: "karigar.murugesan@companya-cbe.com", name: "Murugesan S (Karigar)", role: "KARIGAR", karigarId: "k-01", phone: "+91 94431 10001" },
  { id: "u-05", email: "oldgold@companya-cbe.com", name: "Old-Gold Desk Staff", role: "OLD_GOLD_STAFF", branchId: "b-01", phone: "+91 94430 66666" },
];

class GoldTrackStore {
  branches = [...INITIAL_BRANCHES];
  locations = [...INITIAL_LOCATIONS];
  categories = [...INITIAL_CATEGORIES];
  karigars = [...INITIAL_KARIGARS];
  users = [...INITIAL_USERS];

  // Benchmark rate for Coimbatore bullion
  goldRatePerGram = 12500.0;

  balances: Record<string, { grossWeight: number; fineGoldWeight: number; purityKarats: string }> = {
    "loc-01_24K": { grossWeight: 18500.0, fineGoldWeight: 18481.5, purityKarats: "24K" },
    "loc-01_22K": { grossWeight: 6000.0, fineGoldWeight: 5496.0, purityKarats: "22K_916" },
    "loc-02_22K": { grossWeight: 4200.0, fineGoldWeight: 3847.2, purityKarats: "22K_916" },
    "loc-03_22K": { grossWeight: 3200.0, fineGoldWeight: 2931.2, purityKarats: "22K_916" },
    "loc-04_OLD": { grossWeight: 420.0, fineGoldWeight: 378.0, purityKarats: "OLD_HOLDING" },
    "loc-05_22K": { grossWeight: 2800.0, fineGoldWeight: 2564.8, purityKarats: "22K_916" },
    "loc-06_OLD": { grossWeight: 180.0, fineGoldWeight: 153.0, purityKarats: "OLD_HOLDING" },
    "loc-07_22K": { grossWeight: 2400.0, fineGoldWeight: 2198.4, purityKarats: "22K_916" },
    "loc-08_22K": { grossWeight: 2100.0, fineGoldWeight: 1923.6, purityKarats: "22K_916" },
    "loc-09_22K": { grossWeight: 1900.0, fineGoldWeight: 1740.4, purityKarats: "22K_916" },
  };

  // Pre-seed exact sample data from client specification!
  // TX-30411 (Issue), TX-30437 (Receipt necklace), TX-30438 (Receipt scrap)
  jobCards: any[] = [
    {
      id: "job-304",
      jobNumber: "JOB-30411",
      branchId: "b-07",
      karigarId: "k-01",
      karigarName: "Murugesan S",
      categoryId: "cat-03",
      categoryName: "Bridal Necklaces & Kasu Malai",
      createdById: "u-03",
      status: "IN_PROGRESS", // partially returned, 3.893g fine remains
      targetCompletionDate: "2026-11-06T18:00:00Z",
      agreedWastagePct: 3.0,
      notes: "Traditional Coimbatore 22K bridal temple necklace with filigree work",
      createdAt: "2026-11-01T10:00:00Z",
      issue: {
        id: "iss-30411",
        slipNumber: "TX-30411",
        sourceLocationId: "loc-02",
        grossWeight: 120.0,
        purityPct: 91.6,
        fineGoldWeight: 109.92, // 120 * 0.916 = 109.920g
        issueDate: "2026-11-01T10:30:00Z",
      },
      receipts: [
        {
          id: "rcp-30437",
          receiptNumber: "TX-30437",
          handledById: "u-03",
          destLocationId: "loc-02",
          receiptDate: "2026-11-03T16:00:00Z",
          totalRecoveredFineGold: 103.004, // 112.450 * 0.916 = 103.0042 -> 103.004g
          actualWastage: 6.916, // 109.920 - 103.004 = 6.916g running balance
          allowedWastage: 3.298,
          excessWastage: 0.0,
          isFinalReconciliation: false,
          items: [
            {
              id: "ri-30437",
              itemType: "FINISHED_JEWELLERY",
              huid: "CB9142",
              description: "22K Handcrafted Bridal Necklace",
              grossWeight: 112.45,
              purityPct: 91.6,
              fineGoldWeight: 103.004,
            },
          ],
        },
        {
          id: "rcp-30438",
          receiptNumber: "TX-30438",
          handledById: "u-03",
          destLocationId: "loc-02",
          receiptDate: "2026-11-04T11:00:00Z",
          totalRecoveredFineGold: 3.023, // 3.300 * 0.916 = 3.0228 -> 3.023g
          actualWastage: 3.893, // 6.916 - 3.023 = 3.893g remaining fine balance!
          allowedWastage: 3.298,
          excessWastage: 0.595,
          isFinalReconciliation: false,
          items: [
            {
              id: "ri-30438",
              itemType: "SCRAP",
              description: "End wire cuttings & sprue scrap",
              grossWeight: 3.3,
              purityPct: 91.6,
              fineGoldWeight: 3.023,
            },
          ],
        },
      ],
    },
    {
      id: "job-305",
      jobNumber: "JOB-30412",
      branchId: "b-07",
      karigarId: "k-03",
      karigarName: "Palanisamy K",
      categoryId: "cat-04",
      categoryName: "Antique & Handcrafted Bangles",
      createdById: "u-03",
      status: "IN_PROGRESS",
      targetCompletionDate: "2026-11-08T18:00:00Z",
      agreedWastagePct: 0.9,
      notes: "Set of traditional Tamil kadas",
      createdAt: "2026-11-03T09:00:00Z",
      issue: {
        id: "iss-30412",
        slipNumber: "TX-30412",
        sourceLocationId: "loc-02",
        grossWeight: 60.0,
        purityPct: 91.6,
        fineGoldWeight: 54.96,
        issueDate: "2026-11-03T09:30:00Z",
      },
      receipts: [],
    },
  ];

  alerts: any[] = [
    {
      id: "alt-01",
      alertNumber: "ALT-30401",
      severity: "MEDIUM",
      alertType: "KARIGAR_LOSS_DRIFT",
      jobCardId: "job-304",
      jobNumber: "JOB-30411",
      karigarId: "k-01",
      karigarName: "Murugesan S",
      expectedValue: 3.298,
      actualValue: 3.893,
      differenceGrams: 0.595,
      status: "OPEN",
      reviewerId: "u-02",
      resolutionNotes: null,
      createdAt: "2026-11-04T11:05:00Z",
      notes: "Observation for Finance Head and Managing Partner: Murugesan's remaining balance on bridal job JOB-30411 has 0.595g variance before filings smelting return. Review bench sweepings.",
    },
  ];

  oldGoldPurchases: any[] = [
    {
      id: "ogp-01",
      purchaseNumber: "OGP-30201",
      customerName: "Smt. Meenakshi Sundaram",
      customerPhone: "+91 94432 55441",
      panNumber: "ABCDE1234F",
      paymentMode: "BILL_EXCHANGE",
      itemDescription: "22K Traditional Coimbatore Lakshmi Haram & Kasu Malai",
      grossWeight: 54.2,
      approvedDeduction: 2.2, // stone & lac deduction
      netEligibleWeight: 52.0,
      testedPurityPct: 89.5, // XRF spectrometer tested
      fineGoldWeight: 46.54,
      goldRatePerGram: 12500.0,
      exchangeValue: 581750.0,
      salesBillNumber: "BILL-CBE-9821",
      testMethodNotes: "XRF spectrometer analysis + touchstone streak test",
      holdingLocationId: "loc-04",
      status: "EXCHANGED",
      staffId: "u-05",
      createdAt: "2026-11-04T15:30:00Z",
    },
  ];

  stockTransfers: any[] = [
    {
      id: "trf-01",
      transferNumber: "TRF-30101",
      sourceLocationId: "loc-01",
      sourceLocationName: "Central Strongroom Safe A",
      destLocationId: "loc-03",
      destLocationName: "Cross Cut Rd Showcase Display",
      status: "RECEIVED",
      totalGrossWeight: 500.0,
      totalFineGoldWeight: 458.0,
      initiatedByUserId: "u-03",
      approvedByUserId: "u-01",
      initiatedAt: "2026-11-03T11:00:00Z",
      completedAt: "2026-11-03T15:30:00Z",
      notes: "Diwali showroom replenishment dispatch from Big Bazaar central vault",
      items: [
        { purityKarats: "22K_916", purityPct: 91.6, grossWeight: 500.0, fineGoldWeight: 458.0, description: "Coimbatore Traditional Bridal Consignment" },
      ],
    },
  ];

  transactions: any[] = [
    {
      id: "txn-30411",
      transactionNumber: "TX-30411",
      type: "ISSUE_TO_KARIGAR",
      sourceLocationId: "loc-02",
      destLocationId: null,
      purityPct: 91.6,
      grossWeight: 120.0,
      fineGoldWeight: 109.92,
      referenceType: "JOB_ISSUE",
      referenceId: "job-304",
      performedByUserId: "u-03",
      notes: "Issued 120g gross bullion to Murugesan S (agreed 3.00% wastage)",
      timestamp: "2026-11-01T10:30:00Z",
    },
    {
      id: "txn-30437",
      transactionNumber: "TX-30437",
      type: "RECEIPT_FROM_KARIGAR",
      sourceLocationId: null,
      destLocationId: "loc-02",
      purityPct: 91.6,
      grossWeight: 112.45,
      fineGoldWeight: 103.004,
      referenceType: "JOB_RECEIPT",
      referenceId: "rcp-30437",
      performedByUserId: "u-03",
      notes: "Received finished necklace (103.004g fine). Karigar balance: 6.916g",
      timestamp: "2026-11-03T16:00:00Z",
    },
    {
      id: "txn-30438",
      transactionNumber: "TX-30438",
      type: "RECEIPT_FROM_KARIGAR",
      sourceLocationId: null,
      destLocationId: "loc-02",
      purityPct: 91.6,
      grossWeight: 3.3,
      fineGoldWeight: 3.023,
      referenceType: "JOB_RECEIPT",
      referenceId: "rcp-30438",
      performedByUserId: "u-03",
      notes: "Received scrap (3.023g fine). Karigar balance: 3.893g",
      timestamp: "2026-11-04T11:00:00Z",
    },
  ];

  auditLogs: any[] = [
    {
      id: "aud-01",
      action: "JOB_ISSUED",
      entityType: "JobCard",
      entityId: "job-304",
      userId: "u-03",
      userName: "Workshop Issue Clerk",
      details: "Issued 120.000g gross (109.920g fine) to Murugesan S (TX-30411)",
      timestamp: "2026-11-01T10:30:00Z",
    },
  ];

  exports: any[] = [
    {
      id: "exp-01",
      exportId: "EXP-2026-11-0001",
      exportType: "TALLY_XML",
      dateRangeStart: "2026-11-01",
      dateRangeEnd: "2026-11-05",
      recordCount: 3,
      generatedByName: "Head of Finance",
      createdAt: "2026-11-05T09:00:00Z",
    },
  ];
}

declare global {
  // eslint-disable-next-line no-var
  var goldTrackStoreGlobal: GoldTrackStore | undefined;
}

export const store = globalThis.goldTrackStoreGlobal ?? new GoldTrackStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.goldTrackStoreGlobal = store;
}

export const GoldTrackService = {
  async getBranches() {
    return store.branches;
  },

  async getLocations() {
    return store.locations.map(loc => {
      const branch = store.branches.find(b => b.id === loc.branchId);
      return { ...loc, branchName: branch?.name || "" };
    });
  },

  async getCategories() {
    return store.categories;
  },

  async getKarigars() {
    return store.karigars.map(k => {
      const activeJobs = store.jobCards.filter(j => j.karigarId === k.id && j.status === "IN_PROGRESS").length;
      return {
        ...k,
        activeJobsCount: activeJobs,
      };
    });
  },

  async getKarigarById(id: string) {
    const k = store.karigars.find(x => x.id === id);
    if (!k) return null;
    const jobs = store.jobCards.filter(j => j.karigarId === id);
    return { ...k, jobs };
  },

  async createKarigar(data: { name: string; nameTamil?: string; phone: string; workshop: string; wastageRates: Record<string, number>; notes?: string }) {
    const code = `KRG-${String(store.karigars.length + 301)}`;
    const newK = {
      id: `k-${Date.now()}`,
      code,
      name: data.name,
      nameTamil: data.nameTamil || data.name,
      phone: data.phone,
      workshop: data.workshop,
      runningBalanceFine: 0.0,
      wastageRates: data.wastageRates,
      historicalWastages: [3.0],
      notes: data.notes || "",
    };
    store.karigars.unshift(newK);

    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: "KARIGAR_CREATED",
      entityType: "Karigar",
      entityId: newK.id,
      userId: "u-01",
      userName: "Managing Partner",
      details: `Created master goldsmith profile for ${data.name} (${code})`,
      timestamp: new Date().toISOString(),
    });

    return newK;
  },

  async getJobCards(status?: string, karigarId?: string) {
    let list = store.jobCards;
    if (status) list = list.filter(j => j.status === status);
    if (karigarId) list = list.filter(j => j.karigarId === karigarId);

    return list.map(j => {
      const karigar = store.karigars.find(k => k.id === j.karigarId);
      const category = store.categories.find(c => c.id === j.categoryId);
      const branch = store.branches.find(b => b.id === j.branchId);
      return {
        ...j,
        karigarName: karigar?.name || "Unknown",
        categoryName: category?.name || "Unknown",
        branchName: branch?.name || "Unknown",
      };
    });
  },

  async getJobCardById(id: string) {
    const j = store.jobCards.find(x => x.id === id || x.jobNumber === id);
    if (!j) return null;
    const karigar = store.karigars.find(k => k.id === j.karigarId);
    const category = store.categories.find(c => c.id === j.categoryId);
    const branch = store.branches.find(b => b.id === j.branchId);
    return {
      ...j,
      karigar,
      category,
      branch,
    };
  },

  async createGoldIssue(payload: {
    karigarId: string;
    categoryId: string;
    sourceLocationId: string;
    grossWeight: number;
    purityPct: number;
    targetCompletionDate: string;
    notes?: string;
    userId: string;
  }) {
    const fineGold = calculateFineGold(payload.grossWeight, payload.purityPct);

    const location = store.locations.find(l => l.id === payload.sourceLocationId);
    if (!location) throw new Error("Invalid source location");

    const karigar = store.karigars.find(k => k.id === payload.karigarId);
    if (!karigar) throw new Error("Invalid karigar specified");

    const category = store.categories.find(c => c.id === payload.categoryId);
    if (!category) throw new Error("Invalid jewellery category specified");

    const agreedPct = karigar.wastageRates[payload.categoryId] ?? category.defaultMaxWastagePct;

    const jobNumber = `JOB-${String(store.jobCards.length + 30412)}`;
    const slipNumber = `TX-${String(store.transactions.length + 30412)}`;
    const now = new Date().toISOString();

    const newJob = {
      id: `job-${Date.now()}`,
      jobNumber,
      branchId: location.branchId,
      karigarId: payload.karigarId,
      karigarName: karigar.name,
      categoryId: payload.categoryId,
      categoryName: category.name,
      createdById: payload.userId,
      status: "IN_PROGRESS",
      targetCompletionDate: payload.targetCompletionDate,
      agreedWastagePct: agreedPct,
      notes: payload.notes || "",
      createdAt: now,
      issue: {
        id: `iss-${Date.now()}`,
        slipNumber,
        sourceLocationId: payload.sourceLocationId,
        grossWeight: payload.grossWeight,
        purityPct: payload.purityPct,
        fineGoldWeight: fineGold.toNumber(),
        issueDate: now,
      },
      receipts: [],
    };

    store.jobCards.unshift(newJob);

    // Increase karigar running fine balance
    karigar.runningBalanceFine = new Decimal(karigar.runningBalanceFine).plus(fineGold).toNumber();

    // Immutable ledger entry
    store.transactions.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: slipNumber,
      type: "ISSUE_TO_KARIGAR",
      sourceLocationId: payload.sourceLocationId,
      destLocationId: null,
      purityPct: payload.purityPct,
      grossWeight: payload.grossWeight,
      fineGoldWeight: fineGold.toNumber(),
      referenceType: "JOB_ISSUE",
      referenceId: newJob.id,
      performedByUserId: payload.userId,
      notes: `Issued gold to ${karigar.name} for ${jobNumber}`,
      timestamp: now,
    });

    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: "GOLD_ISSUE_CREATED",
      entityType: "JobCard",
      entityId: newJob.id,
      userId: payload.userId,
      userName: "Workshop Issue Clerk",
      details: `Issued ${payload.grossWeight}g gross (${fineGold.toString()}g fine) to ${karigar.name} (${slipNumber})`,
      timestamp: now,
    });

    return newJob;
  },

  async receiveFinishedJewellery(payload: {
    jobCardId: string;
    destLocationId: string;
    items: Array<{
      itemType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS";
      description: string;
      grossWeight: number;
      purityPct: number;
      huid?: string;
    }>;
    notes?: string;
    userId: string;
  }) {
    const job = store.jobCards.find(j => j.id === payload.jobCardId);
    if (!job) throw new Error("Job card not found");

    const karigar = store.karigars.find(k => k.id === job.karigarId);
    if (!karigar) throw new Error("Karigar record not found");

    let totalRecoveredFine = new Decimal(0);
    const receiptItems = payload.items.map((item, idx) => {
      const fine = calculateFineGold(item.grossWeight, item.purityPct);
      totalRecoveredFine = totalRecoveredFine.plus(fine);
      return {
        id: `ri-${Date.now()}-${idx}`,
        itemType: item.itemType,
        description: item.description,
        grossWeight: item.grossWeight,
        purityPct: item.purityPct,
        fineGoldWeight: fine.toNumber(),
        huid: item.huid || null,
      };
    });

    const issuedFine = new Decimal(job.issue.fineGoldWeight);
    const actualWastage = calculateActualWastage(issuedFine, totalRecoveredFine);
    const allowedWastage = calculateAllowedWastage(issuedFine, job.agreedWastagePct);
    const excessWastage = calculateExcessWastage(actualWastage, allowedWastage);

    const receiptNumber = `TX-${String(store.transactions.length + 30439)}`;
    const now = new Date().toISOString();

    const receipt = {
      id: `rcp-${Date.now()}`,
      receiptNumber,
      handledById: payload.userId,
      destLocationId: payload.destLocationId,
      receiptDate: now,
      totalRecoveredFineGold: totalRecoveredFine.toNumber(),
      actualWastage: actualWastage.toNumber(),
      allowedWastage: allowedWastage.toNumber(),
      excessWastage: excessWastage.toNumber(),
      isFinalReconciliation: true,
      items: receiptItems,
      notes: payload.notes || "",
    };

    job.receipts.push(receipt);
    job.status = "COMPLETED";
    job.actualCompletionDate = now;

    // Deduct total fine recovered and actual wastage from karigar running balance
    const deduction = totalRecoveredFine.plus(actualWastage);
    karigar.runningBalanceFine = Decimal.max(0, new Decimal(karigar.runningBalanceFine).minus(deduction)).toNumber();

    // AI Wastage Drift Detection
    const currentWastagePct = actualWastage.dividedBy(issuedFine).times(100).toNumber();
    const driftResult = detectKarigarWastageDrift(
      karigar.historicalWastages || [job.agreedWastagePct],
      currentWastagePct,
      karigar.name
    );

    // If loss is drifting or excess wastage breached, trigger quiet review item for Finance Head and Partner
    if (excessWastage.greaterThan(0) || driftResult.isDriftingHigh) {
      const alertNumber = `ALT-${String(store.alerts.length + 30402)}`;
      const alert = {
        id: `alt-${Date.now()}`,
        alertNumber,
        severity: excessWastage.greaterThan(1.0) ? "CRITICAL" : "MEDIUM",
        alertType: driftResult.isDriftingHigh ? "KARIGAR_LOSS_DRIFT" : "EXCESS_WASTAGE",
        jobCardId: job.id,
        jobNumber: job.jobNumber,
        karigarId: karigar.id,
        karigarName: karigar.name,
        expectedValue: allowedWastage.toNumber(),
        actualValue: actualWastage.toNumber(),
        differenceGrams: excessWastage.toNumber(),
        status: "OPEN",
        reviewerId: "u-02",
        resolutionNotes: null,
        createdAt: now,
        notes: driftResult.isDriftingHigh
          ? driftResult.advisoryNote
          : `Excess wastage of ${excessWastage.toString()}g fine gold on ${job.jobNumber}. Allowed: ${allowedWastage.toString()}g, Actual: ${actualWastage.toString()}g.`,
      };
      store.alerts.unshift(alert);
    }

    // Ledger Entry
    store.transactions.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: receiptNumber,
      type: "RECEIPT_FROM_KARIGAR",
      sourceLocationId: null,
      destLocationId: payload.destLocationId,
      purityPct: 91.6,
      grossWeight: receiptItems.reduce((acc, i) => acc + i.grossWeight, 0),
      fineGoldWeight: totalRecoveredFine.toNumber(),
      referenceType: "JOB_RECEIPT",
      referenceId: receipt.id,
      performedByUserId: payload.userId,
      notes: `Receipt ${receiptNumber} from ${karigar.name} for ${job.jobNumber}`,
      timestamp: now,
    });

    return { job, receipt, excessWastage: excessWastage.toNumber() };
  },

  async createOldGoldPurchase(payload: {
    customerName: string;
    customerPhone?: string;
    panNumber?: string;
    paymentMode?: string;
    itemDescription: string;
    grossWeight: number;
    approvedDeduction: number;
    testedPurityPct: number;
    goldRatePerGram?: number;
    salesBillNumber?: string;
    testMethodNotes?: string;
    holdingLocationId: string;
    staffId: string;
  }) {
    const rate = payload.goldRatePerGram || store.goldRatePerGram;
    const mode = payload.paymentMode || "BILL_EXCHANGE";

    const assessment = assessOldGold(
      payload.grossWeight,
      payload.approvedDeduction,
      payload.testedPurityPct,
      rate,
      mode,
      payload.panNumber
    );

    const purchaseNumber = `OGP-${String(store.oldGoldPurchases.length + 30202)}`;
    const now = new Date().toISOString();

    const purchase = {
      id: `ogp-${Date.now()}`,
      purchaseNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone || "",
      panNumber: payload.panNumber || "",
      paymentMode: mode,
      itemDescription: payload.itemDescription,
      grossWeight: assessment.grossWeight.toNumber(),
      approvedDeduction: assessment.approvedDeduction.toNumber(),
      netEligibleWeight: assessment.netEligibleWeight.toNumber(),
      testedPurityPct: assessment.testedPurityPct.toNumber(),
      fineGoldWeight: assessment.fineGoldWeight.toNumber(),
      goldRatePerGram: assessment.ratePerGram.toNumber(),
      exchangeValue: assessment.exchangeValue.toNumber(),
      salesBillNumber: payload.salesBillNumber || null,
      testMethodNotes: payload.testMethodNotes || "XRF Spectrometer Analysis",
      holdingLocationId: payload.holdingLocationId,
      status: payload.salesBillNumber ? "EXCHANGED" : "QUARANTINED",
      staffId: payload.staffId,
      createdAt: now,
    };

    store.oldGoldPurchases.unshift(purchase);

    store.transactions.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: `TX-${String(store.transactions.length + 30440)}`,
      type: "OLD_GOLD_PURCHASE",
      sourceLocationId: null,
      destLocationId: payload.holdingLocationId,
      purityPct: assessment.testedPurityPct.toNumber(),
      grossWeight: assessment.netEligibleWeight.toNumber(),
      fineGoldWeight: assessment.fineGoldWeight.toNumber(),
      referenceType: "OLD_GOLD",
      referenceId: purchase.id,
      performedByUserId: payload.staffId,
      notes: `Old gold purchase ${purchaseNumber} from ${payload.customerName}`,
      timestamp: now,
    });

    return purchase;
  },

  async getOldGoldPurchases() {
    return store.oldGoldPurchases.map(p => {
      const loc = store.locations.find(l => l.id === p.holdingLocationId);
      return { ...p, locationName: loc?.name || "Quarantine Holding Safe" };
    });
  },

  async createStockTransfer(payload: {
    sourceLocationId: string;
    destLocationId: string;
    items: Array<{
      purityKarats: string;
      purityPct: number;
      grossWeight: number;
      description: string;
    }>;
    notes?: string;
    userId: string;
  }) {
    const sourceLoc = store.locations.find(l => l.id === payload.sourceLocationId);
    const destLoc = store.locations.find(l => l.id === payload.destLocationId);
    if (!sourceLoc || !destLoc) throw new Error("Invalid location specified");

    let totalGross = new Decimal(0);
    let totalFine = new Decimal(0);

    const items = payload.items.map(item => {
      const gross = new Decimal(item.grossWeight);
      const fine = calculateFineGold(gross, item.purityPct);
      totalGross = totalGross.plus(gross);
      totalFine = totalFine.plus(fine);
      return {
        purityKarats: item.purityKarats,
        purityPct: item.purityPct,
        grossWeight: gross.toNumber(),
        fineGoldWeight: fine.toNumber(),
        description: item.description,
      };
    });

    const transferNumber = `TRF-${String(store.stockTransfers.length + 30102)}`;
    const now = new Date().toISOString();

    const transfer = {
      id: `trf-${Date.now()}`,
      transferNumber,
      sourceLocationId: payload.sourceLocationId,
      sourceLocationName: sourceLoc.name,
      destLocationId: payload.destLocationId,
      destLocationName: destLoc.name,
      status: "IN_TRANSIT",
      totalGrossWeight: totalGross.toNumber(),
      totalFineGoldWeight: totalFine.toNumber(),
      initiatedByUserId: payload.userId,
      approvedByUserId: null,
      initiatedAt: now,
      completedAt: null,
      notes: payload.notes || "",
      items,
    };

    store.stockTransfers.unshift(transfer);
    return transfer;
  },

  async approveStockTransfer(transferId: string, userId: string) {
    const trf = store.stockTransfers.find(t => t.id === transferId);
    if (!trf) throw new Error("Stock transfer not found");
    if (trf.status !== "IN_TRANSIT") throw new Error("Only in-transit transfers can be received");

    const now = new Date().toISOString();
    trf.status = "RECEIVED";
    trf.approvedByUserId = userId;
    trf.completedAt = now;

    store.transactions.unshift({
      id: `txn-${Date.now()}`,
      transactionNumber: `TX-${String(store.transactions.length + 30441)}`,
      type: "TRANSFER_IN",
      sourceLocationId: trf.sourceLocationId,
      destLocationId: trf.destLocationId,
      purityPct: 91.6,
      grossWeight: trf.totalGrossWeight,
      fineGoldWeight: trf.totalFineGoldWeight,
      referenceType: "TRANSFER",
      referenceId: trf.id,
      performedByUserId: userId,
      notes: `Transfer ${trf.transferNumber} received into ${trf.destLocationName}`,
      timestamp: now,
    });

    return trf;
  },

  async getStockTransfers() {
    return store.stockTransfers;
  },

  async getAlerts(status?: string) {
    if (status) return store.alerts.filter(a => a.status === status);
    return store.alerts;
  },

  async resolveAlert(alertId: string, payload: { status: "IN_REVIEW" | "RESOLVED"; resolutionNotes: string; reviewerId: string }) {
    const alert = store.alerts.find(a => a.id === alertId);
    if (!alert) throw new Error("Alert not found");

    alert.status = payload.status;
    alert.resolutionNotes = payload.resolutionNotes;
    alert.reviewerId = payload.reviewerId;
    if (payload.status === "RESOLVED") {
      alert.resolvedAt = new Date().toISOString();
    }
    return alert;
  },

  async getInventoryBalances() {
    return Object.entries(store.balances).map(([key, val]) => {
      const [locationId] = key.split("_");
      const loc = store.locations.find(l => l.id === locationId);
      const branch = store.branches.find(b => b.id === loc?.branchId);
      return {
        key,
        locationId,
        locationName: loc?.name || "Safe",
        branchName: branch?.name || "Showroom",
        branchType: branch?.type || "SHOWROOM",
        purityKarats: val.purityKarats,
        grossWeight: val.grossWeight,
        fineGoldWeight: val.fineGoldWeight,
      };
    });
  },

  async getLedgerTransactions() {
    return store.transactions.map(t => {
      const source = store.locations.find(l => l.id === t.sourceLocationId);
      const dest = store.locations.find(l => l.id === t.destLocationId);
      const user = store.users.find(u => u.id === t.performedByUserId);
      return {
        ...t,
        sourceName: source?.name || "Karigar Bench",
        destName: dest?.name || "Customer / Safe",
        performedByName: user?.name || "Workshop Issue Clerk",
      };
    });
  },

  async getAuditLogs() {
    return store.auditLogs;
  },

  async getDashboardMetrics() {
    const vaultBalances = Object.entries(store.balances)
      .filter(([k]) => k.startsWith("loc-01"))
      .reduce((sum, [, v]) => sum + v.fineGoldWeight, 0);

    const karigarOutstanding = store.karigars.reduce((sum, k) => sum + k.runningBalanceFine, 0);

    const workshopBalances = Object.entries(store.balances)
      .filter(([k]) => k.startsWith("loc-02"))
      .reduce((sum, [, v]) => sum + v.fineGoldWeight, 0);

    const showroomBalances = Object.entries(store.balances)
      .filter(([k]) => k.includes("loc-03") || k.includes("loc-05") || k.includes("loc-07") || k.includes("loc-08") || k.includes("loc-09"))
      .reduce((sum, [, v]) => sum + v.fineGoldWeight, 0);

    const refineryBalances = Object.entries(store.balances)
      .filter(([k]) => k.startsWith("loc-10"))
      .reduce((sum, [, v]) => sum + v.fineGoldWeight, 0);

    const totalFineGoldStock = vaultBalances + workshopBalances + showroomBalances + refineryBalances + karigarOutstanding;

    // Monthly aggregates from JobCards
    const issuedThisMonth = store.jobCards.reduce((sum, j) => sum + (j.issue?.fineGoldWeight || 0), 0);
    const receivedThisMonth = store.jobCards.reduce((sum, j) => {
      const rSum = j.receipts.reduce((s: number, r: any) => s + r.totalRecoveredFineGold, 0);
      return sum + rSum;
    }, 0);

    const actualWastageThisMonth = store.jobCards.reduce((sum, j) => {
      const wSum = j.receipts.reduce((s: number, r: any) => s + r.actualWastage, 0);
      return sum + wSum;
    }, 0);

    const allowedWastageThisMonth = store.jobCards.reduce((sum, j) => {
      const aSum = j.receipts.reduce((s: number, r: any) => s + r.allowedWastage, 0);
      return sum + aSum;
    }, 0);

    const pendingJobsCount = store.jobCards.filter(j => j.status === "IN_PROGRESS").length;
    const openAlertsCount = store.alerts.filter(a => a.status === "OPEN").length;
    const criticalAlertsCount = store.alerts.filter(a => a.severity === "CRITICAL" && a.status === "OPEN").length;

    // Coimbatore facilities breakdown
    const branchDistribution = [
      { name: "Central Vault", fineGold: Number(vaultBalances.toFixed(3)) },
      { name: "Sullivan St Workshop", fineGold: Number(workshopBalances.toFixed(3)) },
      { name: "Cross Cut Rd", fineGold: Number((store.balances["loc-03_22K"]?.fineGoldWeight || 0).toFixed(3)) },
      { name: "RS Puram", fineGold: Number((store.balances["loc-05_22K"]?.fineGoldWeight || 0).toFixed(3)) },
      { name: "Peelamedu", fineGold: Number((store.balances["loc-07_22K"]?.fineGoldWeight || 0).toFixed(3)) },
      { name: "Oppanakara St", fineGold: Number((store.balances["loc-08_22K"]?.fineGoldWeight || 0).toFixed(3)) },
      { name: "Pollachi", fineGold: Number((store.balances["loc-09_22K"]?.fineGoldWeight || 0).toFixed(3)) },
      { name: "With Karigars (WIP)", fineGold: Number(karigarOutstanding.toFixed(3)) },
    ];

    const karigarBalancesChart = store.karigars
      .filter(k => k.runningBalanceFine > 0)
      .map(k => ({
        name: k.name.split(" ")[0],
        fullName: k.name,
        code: k.code,
        fineGold: k.runningBalanceFine,
      }));

    return {
      companyName: "Company A, Coimbatore",
      totalFineGoldStock: Number(totalFineGoldStock.toFixed(3)),
      goldInVault: Number(vaultBalances.toFixed(3)),
      goldWithKarigars: Number(karigarOutstanding.toFixed(3)),
      goldAtWorkshop: Number(workshopBalances.toFixed(3)),
      goldAtShowrooms: Number(showroomBalances.toFixed(3)),
      goldAtRefinery: Number(refineryBalances.toFixed(3)),
      pendingJobsCount,
      issuedThisMonth: Number(issuedThisMonth.toFixed(3)),
      receivedThisMonth: Number(receivedThisMonth.toFixed(3)),
      actualWastageThisMonth: Number(actualWastageThisMonth.toFixed(3)),
      allowedWastageThisMonth: Number(allowedWastageThisMonth.toFixed(3)),
      excessWastageThisMonth: Number(Math.max(0, actualWastageThisMonth - allowedWastageThisMonth).toFixed(3)),
      openAlertsCount,
      criticalAlertsCount,
      goldRatePerGram: store.goldRatePerGram,
      branchDistribution,
      karigarBalancesChart,
      recentMovements: store.transactions.slice(0, 6),
      recentAlerts: store.alerts.slice(0, 4),
    };
  },

  async getExports() {
    return store.exports;
  },

  async generateExport(type: "CSV_STOCK" | "CSV_KARIGAR" | "CSV_WASTAGE" | "TALLY_XML", dateStart: string, dateEnd: string, user: string) {
    const exportId = `EXP-CBE-${String(store.exports.length + 1001)}`;
    const newExp = {
      id: `exp-${Date.now()}`,
      exportId,
      exportType: type,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      recordCount: store.transactions.length,
      generatedByName: user,
      createdAt: new Date().toISOString(),
    };
    store.exports.unshift(newExp);
    return newExp;
  },
};
