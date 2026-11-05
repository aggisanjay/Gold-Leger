const { PrismaClient, Role, BranchType, JobCardStatus, ReceiptItemType, TransferStatus, AlertSeverity, AlertType, AlertStatus, OldGoldStatus, TransactionType } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting GoldTrack ERP Database Seeding on Neon PostgreSQL...");

  // Clear existing records in cascade-safe order
  await prisma.auditLog.deleteMany({});
  await prisma.exportRecord.deleteMany({});
  await prisma.reconciliation.deleteMany({});
  await prisma.wastageAlert.deleteMany({});
  await prisma.stockTransferItem.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventoryBalance.deleteMany({});
  await prisma.exchangeTransaction.deleteMany({});
  await prisma.oldGoldPurchase.deleteMany({});
  await prisma.goldReceiptItem.deleteMany({});
  await prisma.goldReceipt.deleteMany({});
  await prisma.goldIssue.deleteMany({});
  await prisma.jobCard.deleteMany({});
  await prisma.karigarWastageRate.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.karigar.deleteMany({});
  await prisma.jewelleryCategory.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log("Cleared existing data.");

  // 1. Create Branches & Entities
  const colaba = await prisma.branch.create({
    data: {
      code: "SHW-01",
      name: "Flagship Showroom — Colaba",
      type: BranchType.SHOWROOM,
      city: "Mumbai",
      address: "Heritage Wing, Colaba Causeway, Mumbai 400001",
      phone: "+91 22 2284 9001",
    },
  });

  const bandra = await prisma.branch.create({
    data: {
      code: "SHW-02",
      name: "Bandra Boutique Showroom",
      type: BranchType.SHOWROOM,
      city: "Mumbai",
      address: "Waterfield Road, Bandra West, Mumbai 400050",
      phone: "+91 22 2642 9002",
    },
  });

  const juhu = await prisma.branch.create({
    data: {
      code: "SHW-03",
      name: "Juhu Signature Gallery",
      type: BranchType.SHOWROOM,
      city: "Mumbai",
      address: "Juhu Tara Road, Juhu, Mumbai 400049",
      phone: "+91 22 2618 9003",
    },
  });

  const andheri = await prisma.branch.create({
    data: {
      code: "SHW-04",
      name: "Andheri West Showroom",
      type: BranchType.SHOWROOM,
      city: "Mumbai",
      address: "Lokhandwala Complex, Andheri West, Mumbai 400053",
      phone: "+91 22 2630 9004",
    },
  });

  const thane = await prisma.branch.create({
    data: {
      code: "SHW-05",
      name: "Thane Luxury Pavilion",
      type: BranchType.SHOWROOM,
      city: "Thane",
      address: "Viviana Mall Promenade, Thane West 400606",
      phone: "+91 22 2580 9005",
    },
  });

  const vault = await prisma.branch.create({
    data: {
      code: "VLT-01",
      name: "Zaveri Bazaar Central Vault",
      type: BranchType.CENTRAL_VAULT,
      city: "Mumbai",
      address: "Bullion Chambers, Sheikh Memon St, Zaveri Bazaar, Mumbai 400002",
      phone: "+91 22 2341 8000",
    },
  });

  const workshop = await prisma.branch.create({
    data: {
      code: "WRK-01",
      name: "SEEPZ Master Craft Workshop",
      type: BranchType.WORKSHOP,
      city: "Mumbai",
      address: "Gems & Jewellery Complex, SEEPZ SEZ, Andheri East, Mumbai 400096",
      phone: "+91 22 2829 7000",
    },
  });

  const refinery = await prisma.branch.create({
    data: {
      code: "REF-01",
      name: "Shirpur Refinery Transit Hub",
      type: BranchType.REFINERY,
      city: "Shirpur",
      address: "Gold Refinery Corridor, Dhule District",
      phone: "+91 2563 259 000",
    },
  });

  console.log("Branches and facilities seeded.");

  // 2. Locations (safes, display, karigar holding)
  const locVaultSafe = await prisma.location.create({
    data: { branchId: vault.id, code: "LOC-VLT-SAFE", name: "Central Strongroom Safe A" },
  });
  const locWorkshopFloor = await prisma.location.create({
    data: { branchId: workshop.id, code: "LOC-WRK-FLOOR", name: "SEEPZ Floor Vault" },
  });
  const locColabaDisplay = await prisma.location.create({
    data: { branchId: colaba.id, code: "LOC-SHW1-DISP", name: "Colaba Main Showcase" },
  });
  const locColabaOldGold = await prisma.location.create({
    data: { branchId: colaba.id, code: "LOC-SHW1-HOLD", name: "Colaba Old Gold Quarantine Desk", isHolding: true },
  });
  const locBandraDisplay = await prisma.location.create({
    data: { branchId: bandra.id, code: "LOC-SHW2-DISP", name: "Bandra Main Showcase" },
  });
  const locBandraOldGold = await prisma.location.create({
    data: { branchId: bandra.id, code: "LOC-SHW2-HOLD", name: "Bandra Old Gold Quarantine Desk", isHolding: true },
  });
  const locRefinerTransit = await prisma.location.create({
    data: { branchId: refinery.id, code: "LOC-REF-TRANSIT", name: "Refiner Assaying Holding" },
  });

  // 3. Jewellery Categories
  const catChains = await prisma.jewelleryCategory.create({
    data: {
      code: "CAT-CHAIN",
      name: "Plain Gold Chains & Ropes",
      standardPurity: 91.6,
      defaultMaxWastagePct: 1.00,
      description: "Machine and handmade gold chains (22K)",
    },
  });

  const catRings = await prisma.jewelleryCategory.create({
    data: {
      code: "CAT-RING",
      name: "Studded & Plain Rings",
      standardPurity: 91.6,
      defaultMaxWastagePct: 0.80,
      description: "Cast and hand-set rings, bands, and solitaires",
    },
  });

  const catNecklaces = await prisma.jewelleryCategory.create({
    data: {
      code: "CAT-NECK",
      name: "Bridal Necklaces & Chokers",
      standardPurity: 91.6,
      defaultMaxWastagePct: 1.20,
      description: "Intricate temple jewellery, kundan, and bridal sets",
    },
  });

  const catBangles = await prisma.jewelleryCategory.create({
    data: {
      code: "CAT-BANGLE",
      name: "Antique & Handcrafted Bangles",
      standardPurity: 91.6,
      defaultMaxWastagePct: 0.90,
      description: "Traditional kadas, broad bangles, and bracelets",
    },
  });

  const catEarrings = await prisma.jewelleryCategory.create({
    data: {
      code: "CAT-EARRING",
      name: "Filigree Jhumkas & Drops",
      standardPurity: 91.6,
      defaultMaxWastagePct: 1.10,
      description: "Delicate wire-work earrings and tops",
    },
  });

  console.log("Categories seeded.");

  // 4. Karigars (10 master artisans)
  const karigarData = [
    { code: "KRG-001", name: "Ramesh Baburao Soni", phone: "+91 98201 12341", workshop: "SEEPZ Bay A" },
    { code: "KRG-002", name: "Gopal Swarnakar", phone: "+91 98201 12342", workshop: "SEEPZ Bay A" },
    { code: "KRG-003", name: "Anand Mondal", phone: "+91 98201 12343", workshop: "SEEPZ Bay B" },
    { code: "KRG-004", name: "Deepak Patra", phone: "+91 98201 12344", workshop: "SEEPZ Bay B" },
    { code: "KRG-005", name: "Santosh Roy", phone: "+91 98201 12345", workshop: "SEEPZ Bay C" },
    { code: "KRG-006", name: "Manoj Bhowmick", phone: "+91 98201 12346", workshop: "SEEPZ Bay C" },
    { code: "KRG-007", name: "Pradip Sen", phone: "+91 98201 12347", workshop: "SEEPZ Bay D" },
    { code: "KRG-008", name: "Kishore Hazra", phone: "+91 98201 12348", workshop: "SEEPZ Bay D" },
    { code: "KRG-009", name: "Subhash Dhara", phone: "+91 98201 12349", workshop: "SEEPZ Bay E" },
    { code: "KRG-010", name: "Bikash Karmakar", phone: "+91 98201 12350", workshop: "SEEPZ Bay E" },
  ];

  const createdKarigars = [];
  for (const kd of karigarData) {
    const k = await prisma.karigar.create({
      data: {
        code: kd.code,
        name: kd.name,
        phone: kd.phone,
        workshop: kd.workshop,
        runningBalanceFine: 0,
      },
    });
    createdKarigars.push(k);

    // Wastage rates per category (tailored per artisan)
    await prisma.karigarWastageRate.createMany({
      data: [
        { karigarId: k.id, categoryId: catChains.id, allowedPct: 1.00 },
        { karigarId: k.id, categoryId: catRings.id, allowedPct: 0.80 },
        { karigarId: k.id, categoryId: catNecklaces.id, allowedPct: 1.20 },
        { karigarId: k.id, categoryId: catBangles.id, allowedPct: 0.90 },
        { karigarId: k.id, categoryId: catEarrings.id, allowedPct: 1.10 },
      ],
    });
  }

  console.log("Karigars and custom wastage configurations seeded.");

  // 5. System Users (with bcrypt hashed credentials)
  const passwordHash = await bcrypt.hash("GoldTrack@2026", 10);

  const admin = await prisma.user.create({
    data: {
      email: "owner@goldtrack.com",
      name: "Rajeshwar Zaveri (Proprietor)",
      passwordHash,
      role: Role.SUPER_ADMIN,
      phone: "+91 98200 99999",
    },
  });

  const branchManager = await prisma.user.create({
    data: {
      email: "branch.mgr@goldtrack.com",
      name: "Vikramaditya Rathore",
      passwordHash,
      role: Role.BRANCH_MANAGER,
      branchId: colaba.id,
      phone: "+91 98200 88888",
    },
  });

  const inventoryManager = await prisma.user.create({
    data: {
      email: "inventory.mgr@goldtrack.com",
      name: "Suresh Chandra Parekh",
      passwordHash,
      role: Role.INVENTORY_MANAGER,
      branchId: vault.id,
      phone: "+91 98200 77777",
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: "accountant@goldtrack.com",
      name: "Kavita Shah, CA",
      passwordHash,
      role: Role.ACCOUNTANT,
      branchId: vault.id,
      phone: "+91 98200 66666",
    },
  });

  const oldGoldStaff = await prisma.user.create({
    data: {
      email: "oldgold.staff@goldtrack.com",
      name: "Nilesh Varma (Appraiser)",
      passwordHash,
      role: Role.OLD_GOLD_STAFF,
      branchId: colaba.id,
      phone: "+91 98200 55555",
    },
  });

  const karigarUser = await prisma.user.create({
    data: {
      email: "karigar.ramesh@goldtrack.com",
      name: "Ramesh Baburao Soni (Artisan)",
      passwordHash,
      role: Role.KARIGAR,
      karigarId: createdKarigars[0].id,
      phone: "+91 98201 12341",
    },
  });

  console.log("Users and role accounts created.");

  // 6. Starting Inventory Balances
  // Central Vault: 15,000g of 24K pure bullion, 5,000g of 22K (916)
  await prisma.inventoryBalance.createMany({
    data: [
      {
        locationId: locVaultSafe.id,
        purityKarats: "24K",
        purityPct: 99.9,
        grossWeight: 15000.0,
        fineGoldWeight: 14985.0,
      },
      {
        locationId: locVaultSafe.id,
        purityKarats: "22K_916",
        purityPct: 91.6,
        grossWeight: 5000.0,
        fineGoldWeight: 4580.0,
      },
      {
        locationId: locWorkshopFloor.id,
        purityKarats: "22K_916",
        purityPct: 91.6,
        grossWeight: 3500.0,
        fineGoldWeight: 3206.0,
      },
      {
        locationId: locColabaDisplay.id,
        purityKarats: "22K_916",
        purityPct: 91.6,
        grossWeight: 2800.0,
        fineGoldWeight: 2564.8,
      },
      {
        locationId: locBandraDisplay.id,
        purityKarats: "22K_916",
        purityPct: 91.6,
        grossWeight: 2400.0,
        fineGoldWeight: 2198.4,
      },
      {
        locationId: locColabaOldGold.id,
        purityKarats: "OLD_HOLDING",
        purityPct: 85.0,
        grossWeight: 350.0,
        fineGoldWeight: 297.5,
      },
    ],
  });

  // 7. Active Job Cards & Real Issues
  // Job 1: Normal completed job (Ramesh - Chains)
  const job1 = await prisma.jobCard.create({
    data: {
      jobNumber: "JOB-2026-0001",
      branchId: workshop.id,
      karigarId: createdKarigars[0].id,
      categoryId: catChains.id,
      createdById: inventoryManager.id,
      status: JobCardStatus.COMPLETED,
      targetCompletionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      actualCompletionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      agreedWastagePct: 1.00,
      notes: "5 units of 22K 4-ply rope chains (20-inch standard)",
    },
  });

  const issue1 = await prisma.goldIssue.create({
    data: {
      jobCardId: job1.id,
      slipNumber: "ISS-2026-0001",
      sourceLocationId: locWorkshopFloor.id,
      grossWeight: 100.0,
      purityPct: 91.6,
      fineGoldWeight: 91.6,
      issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: "Issued 100.0g 22K pure grain",
    },
  });

  // Receipt for Job 1: Clean return within allowance
  const rcp1 = await prisma.goldReceipt.create({
    data: {
      receiptNumber: "RCP-2026-0001",
      jobCardId: job1.id,
      karigarId: createdKarigars[0].id,
      handledById: inventoryManager.id,
      destLocationId: locWorkshopFloor.id,
      receiptDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalRecoveredFineGold: 90.8, // 89 finished + 1 scrap + 0.8 filings
      actualWastage: 0.8, // 91.6 - 90.8 = 0.8g
      allowedWastage: 0.916, // 1% of 91.6 = 0.916g
      excessWastage: 0.0,
      isFinalReconciliation: true,
      notes: "All 5 chains verified with hallmarking laser marks",
    },
  });

  await prisma.goldReceiptItem.createMany({
    data: [
      {
        receiptId: rcp1.id,
        itemType: ReceiptItemType.FINISHED_JEWELLERY,
        huid: "HA9021",
        description: "5x Plain 22K Rope Chains",
        grossWeight: 97.16,
        purityPct: 91.6,
        fineGoldWeight: 89.0,
      },
      {
        receiptId: rcp1.id,
        itemType: ReceiptItemType.SCRAP,
        description: "End-link trimmings and wire ends",
        grossWeight: 1.09,
        purityPct: 91.6,
        fineGoldWeight: 1.0,
      },
      {
        receiptId: rcp1.id,
        itemType: ReceiptItemType.FILINGS,
        description: "Workshop leather bench filings",
        grossWeight: 0.87,
        purityPct: 91.6,
        fineGoldWeight: 0.8,
      },
    ],
  });

  // Job 2: EXCESS WASTAGE alert triggered! (Gopal - Necklaces)
  const job2 = await prisma.jobCard.create({
    data: {
      jobNumber: "JOB-2026-0002",
      branchId: workshop.id,
      karigarId: createdKarigars[1].id,
      categoryId: catNecklaces.id,
      createdById: inventoryManager.id,
      status: JobCardStatus.COMPLETED,
      targetCompletionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      actualCompletionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      agreedWastagePct: 1.20,
      notes: "Temple floral necklace set",
    },
  });

  const issue2 = await prisma.goldIssue.create({
    data: {
      jobCardId: job2.id,
      slipNumber: "ISS-2026-0002",
      sourceLocationId: locWorkshopFloor.id,
      grossWeight: 120.0,
      purityPct: 91.6,
      fineGoldWeight: 109.92,
      issueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  // Receipt for Job 2 with EXCESS wastage:
  // Issued Fine: 109.92g
  // Recovered Fine: 106.50g
  // Actual Wastage: 3.42g
  // Allowed Wastage @ 1.2%: 1.319g
  // Excess Wastage: 2.101g (HIGH SEVERITY ALERT)
  const rcp2 = await prisma.goldReceipt.create({
    data: {
      receiptNumber: "RCP-2026-0002",
      jobCardId: job2.id,
      karigarId: createdKarigars[1].id,
      handledById: inventoryManager.id,
      destLocationId: locWorkshopFloor.id,
      receiptDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalRecoveredFineGold: 106.5,
      actualWastage: 3.42,
      allowedWastage: 1.319,
      excessWastage: 2.101,
      isFinalReconciliation: true,
      notes: "Wastage exceeded allowance. Bench pot recovery pending review.",
    },
  });

  // Create Wastage Alert for Job 2
  await prisma.wastageAlert.create({
    data: {
      alertNumber: "ALT-2026-0001",
      severity: AlertSeverity.CRITICAL,
      alertType: AlertType.EXCESS_WASTAGE,
      jobCardId: job2.id,
      karigarId: createdKarigars[1].id,
      expectedValue: 1.319,
      actualValue: 3.42,
      differenceGrams: 2.101,
      status: AlertStatus.OPEN,
      notes: "Unexplained gold loss of 2.101g fine gold on Temple Necklace job. Investigation required before releasing next bullion batch.",
    },
  });

  // Job 3: In Progress (Anand - Bangles)
  const job3 = await prisma.jobCard.create({
    data: {
      jobNumber: "JOB-2026-0003",
      branchId: workshop.id,
      karigarId: createdKarigars[2].id,
      categoryId: catBangles.id,
      createdById: inventoryManager.id,
      status: JobCardStatus.IN_PROGRESS,
      targetCompletionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      agreedWastagePct: 0.90,
      notes: "Set of 4 traditional kadas with screw lock",
    },
  });

  await prisma.goldIssue.create({
    data: {
      jobCardId: job3.id,
      slipNumber: "ISS-2026-0003",
      sourceLocationId: locWorkshopFloor.id,
      grossWeight: 80.0,
      purityPct: 91.6,
      fineGoldWeight: 73.28,
      issueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Update Karigar 3's running balance
  await prisma.karigar.update({
    where: { id: createdKarigars[2].id },
    data: { runningBalanceFine: 73.28 },
  });

  // 8. Old Gold Purchase Records
  const ogp1 = await prisma.oldGoldPurchase.create({
    data: {
      purchaseNumber: "OGP-2026-0001",
      customerName: "Smt. Sunita Kulkarni",
      customerPhone: "+91 98190 44321",
      itemDescription: "22K Old Traditional Floral Necklace with enamel and stone work",
      grossWeight: 48.65,
      approvedDeduction: 3.15, // Enamel & stone deduction
      netEligibleWeight: 45.5,
      testedPurityPct: 89.2, // Tested via XRF Niton Spectrometer
      fineGoldWeight: 40.586,
      goldRatePerGram: 7350.0,
      exchangeValue: 298307.1,
      salesBillNumber: "BILL-2026-8891",
      testMethodNotes: "XRF Multi-point fluorescence testing done on clasp and centrepiece",
      holdingLocationId: locColabaOldGold.id,
      status: OldGoldStatus.EXCHANGED,
      staffId: oldGoldStaff.id,
    },
  });

  await prisma.exchangeTransaction.create({
    data: {
      exchangeNumber: "EX-2026-0001",
      oldGoldPurchaseId: ogp1.id,
      billNumber: "BILL-2026-8891",
      creditedAmount: 298307.1,
      notes: "Adjusted against Diamond Polki Choker Purchase",
    },
  });

  // 9. Inter-Branch Stock Transfer
  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: "TRF-2026-0001",
      sourceLocationId: locVaultSafe.id,
      destLocationId: locColabaDisplay.id,
      status: TransferStatus.RECEIVED,
      totalGrossWeight: 500.0,
      totalFineGoldWeight: 458.0,
      initiatedByUserId: inventoryManager.id,
      approvedByUserId: branchManager.id,
      initiatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: "Replenishment of festive stock for Colaba showroom",
    },
  });

  await prisma.stockTransferItem.create({
    data: {
      transferId: transfer.id,
      purityKarats: "22K_916",
      purityPct: 91.6,
      grossWeight: 500.0,
      fineGoldWeight: 458.0,
      description: "Assorted 22K Bridal Jewellery Consignment",
    },
  });

  // 10. Audit Log Records
  await prisma.auditLog.createMany({
    data: [
      {
        action: "GOLD_ISSUE_DISPATCHED",
        entityType: "JobCard",
        entityId: job1.id,
        userId: inventoryManager.id,
        details: JSON.stringify({ jobNumber: "JOB-2026-0001", grossWeight: 100.0, fineGoldWeight: 91.6, karigar: "Ramesh Baburao Soni" }),
      },
      {
        action: "EXCESS_WASTAGE_ALERT_GENERATED",
        entityType: "WastageAlert",
        entityId: "ALT-2026-0001",
        userId: inventoryManager.id,
        details: JSON.stringify({ jobNumber: "JOB-2026-0002", excessWastageGrams: 2.101, karigar: "Gopal Swarnakar" }),
      },
      {
        action: "OLD_GOLD_ASSESSMENT_VERIFIED",
        entityType: "OldGoldPurchase",
        entityId: ogp1.id,
        userId: oldGoldStaff.id,
        details: JSON.stringify({ purchaseNumber: "OGP-2026-0001", customer: "Smt. Sunita Kulkarni", exchangeValue: 298307.1 }),
      },
    ],
  });

  console.log("✅ Seed completed successfully with realistic GoldTrack ERP records.");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

