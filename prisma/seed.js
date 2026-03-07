import { prisma } from "../lib/prisma.js";
import { generateId } from "../utils/id.js";

const categories = [
  { name: "General Knowledge", icon: "brain" },
  { name: "Science", icon: "flask-conical" },
  { name: "Mathematics", icon: "calculator" },
  { name: "History", icon: "landmark" },
  { name: "Geography", icon: "globe" },
  { name: "Literature", icon: "book-open" },
  { name: "Art & Design", icon: "palette" },
  { name: "Music", icon: "music" },
  { name: "Sports", icon: "trophy" },
  { name: "Technology", icon: "monitor" },
  { name: "Movies & TV", icon: "clapperboard" },
  { name: "Food & Cooking", icon: "chef-hat" },
  { name: "Nature & Animals", icon: "paw-print" },
  { name: "Languages", icon: "languages" },
  { name: "Business & Finance", icon: "briefcase" },
  { name: "Health & Fitness", icon: "heart-pulse" },
  { name: "Politics", icon: "scale" },
  { name: "Philosophy", icon: "lightbulb" },
  { name: "Psychology", icon: "brain-circuit" },
  { name: "Pop Culture", icon: "star" },
  { name: "Other", icon: "grid-2x2" },
];

async function main() {
  console.log("Seeding categories...\n");

  for (const category of categories) {
    const result = await prisma.category.upsert({
      where: { name: category.name },
      update: { icon: category.icon },
      create: {
        id: generateId("cat"),
        name: category.name,
        icon: category.icon,
        createdAt: new Date(),
      },
    });

    console.log(`  ${result.name} -> ${result.icon}`);
  }

  console.log(`\nSeeded ${categories.length} categories successfully!`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
