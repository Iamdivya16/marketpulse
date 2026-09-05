-- CreateSchema
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "symbols" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'US',
    CONSTRAINT "symbols_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "snapshot_symbols" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "symbol_id" TEXT NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "volume" BIGINT NOT NULL,
    "avg_volume_20d" DECIMAL(18,2) NOT NULL,
    "sentiment_score" DECIMAL(8,4) NOT NULL,
    "news_count" INTEGER NOT NULL,
    "volatility_atr" DECIMAL(18,6) NOT NULL,
    CONSTRAINT "snapshot_symbols_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_bars" (
    "id" TEXT NOT NULL,
    "symbol_id" TEXT NOT NULL,
    "bar_date" DATE NOT NULL,
    "open" DECIMAL(18,6) NOT NULL,
    "high" DECIMAL(18,6) NOT NULL,
    "low" DECIMAL(18,6) NOT NULL,
    "close" DECIMAL(18,6) NOT NULL,
    "volume" BIGINT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "market_bars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_items" (
    "id" TEXT NOT NULL,
    "symbol_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sentiment" DECIMAL(8,4) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "symbols_ticker_key" ON "symbols"("ticker");
CREATE INDEX "watchlist_items_user_id_idx" ON "watchlist_items"("user_id");
CREATE UNIQUE INDEX "watchlist_items_user_id_symbol_id_key" ON "watchlist_items"("user_id", "symbol_id");
CREATE INDEX "user_snapshots_user_id_checked_at_idx" ON "user_snapshots"("user_id", "checked_at" DESC);
CREATE UNIQUE INDEX "snapshot_symbols_snapshot_id_symbol_id_key" ON "snapshot_symbols"("snapshot_id", "symbol_id");
CREATE INDEX "market_bars_symbol_id_bar_date_idx" ON "market_bars"("symbol_id", "bar_date" DESC);
CREATE UNIQUE INDEX "market_bars_symbol_id_bar_date_key" ON "market_bars"("symbol_id", "bar_date");
CREATE UNIQUE INDEX "news_items_external_id_key" ON "news_items"("external_id");
CREATE INDEX "news_items_symbol_id_published_at_idx" ON "news_items"("symbol_id", "published_at" DESC);

ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_snapshots" ADD CONSTRAINT "user_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "snapshot_symbols" ADD CONSTRAINT "snapshot_symbols_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "user_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "snapshot_symbols" ADD CONSTRAINT "snapshot_symbols_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_bars" ADD CONSTRAINT "market_bars_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
