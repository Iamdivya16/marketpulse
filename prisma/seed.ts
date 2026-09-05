import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SYMBOLS = [
  { ticker: "AAPL", name: "Apple Inc" },
  { ticker: "MSFT", name: "Microsoft Corp" },
  { ticker: "NVDA", name: "NVIDIA Corp" },
  { ticker: "TSLA", name: "Tesla Inc" },
  { ticker: "AMZN", name: "Amazon.com Inc" },
];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@marketpulse.app" },
    update: {},
    create: {
      email: "demo@marketpulse.app",
      passwordHash,
    },
  });

  for (const entry of DEMO_SYMBOLS) {
    const symbol = await prisma.symbol.upsert({
      where: { ticker: entry.ticker },
      update: { name: entry.name },
      create: {
        ticker: entry.ticker,
        name: entry.name,
        exchange: "US",
      },
    });

    await prisma.watchlistItem.upsert({
      where: {
        userId_symbolId: {
          userId: user.id,
          symbolId: symbol.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        symbolId: symbol.id,
      },
    });
  }

  console.log("Seed complete:");
  console.log("  Email: demo@marketpulse.app");
  console.log("  Password: password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
