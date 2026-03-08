-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "openingFloatCents" INTEGER NOT NULL DEFAULT 0,
    "closingCashCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "floorPlanId" TEXT,
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 1,
    "height" INTEGER NOT NULL DEFAULT 1,
    "openedAt" DATETIME,
    "assignedWaiterId" TEXT,
    "currentTabId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Table_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Table_assignedWaiterId_fkey" FOREIGN KEY ("assignedWaiterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Table_currentTabId_fkey" FOREIGN KEY ("currentTabId") REFERENCES "Tab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tableId" TEXT,
    "customerName" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "openedById" TEXT NOT NULL,
    "closedByShiftId" TEXT,
    "serviceChargeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "serviceChargeRateBps" INTEGER NOT NULL DEFAULT 1000,
    "vatRateBps" INTEGER NOT NULL DEFAULT 1600,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tab_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tab_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tab_closedByShiftId_fkey" FOREIGN KEY ("closedByShiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is86d" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "stockUnit" TEXT NOT NULL DEFAULT 'unit',
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tabId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "addedById" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "voidedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderItem_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tabId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "mpesaPhone" TEXT,
    "mpesaRef" TEXT,
    "processedById" TEXT NOT NULL,
    "shiftId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "reason" TEXT,
    "tabId" TEXT,
    "byId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Shift_userId_startedAt_idx" ON "Shift"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Table_label_key" ON "Table"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Table_currentTabId_key" ON "Table"("currentTabId");

-- CreateIndex
CREATE INDEX "Table_section_label_idx" ON "Table"("section", "label");

-- CreateIndex
CREATE INDEX "Tab_status_type_openedAt_idx" ON "Tab"("status", "type", "openedAt");

-- CreateIndex
CREATE INDEX "Tab_customerName_idx" ON "Tab"("customerName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "OrderItem_tabId_addedAt_idx" ON "OrderItem"("tabId", "addedAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_tabId_createdAt_idx" ON "Payment"("tabId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_byId_createdAt_idx" ON "StockMovement"("byId", "createdAt");
