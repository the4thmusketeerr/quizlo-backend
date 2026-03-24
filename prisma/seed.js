import bcrypt from "bcrypt";
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

const difficulties = ["Easy", "Medium", "Hard"];

const sampleQuizzes = [
  {
    title: "Ultimate General Knowledge",
    description: "A mix of questions to test your overall knowledge.",
    categoryName: "General Knowledge",
    questions: [
      {
        text: "What is the capital of Australia?",
        options: [
          { text: "Sydney", isCorrect: false },
          { text: "Melbourne", isCorrect: false },
          { text: "Canberra", isCorrect: true },
          { text: "Perth", isCorrect: false }
        ]
      },
      {
        text: "How many continents are there on Earth?",
        options: [
          { text: "5", isCorrect: false },
          { text: "6", isCorrect: false },
          { text: "7", isCorrect: true },
          { text: "8", isCorrect: false }
        ]
      },
      {
        text: "Which language has the most native speakers?",
        options: [
          { text: "English", isCorrect: false },
          { text: "Mandarin Chinese", isCorrect: true },
          { text: "Spanish", isCorrect: false },
          { text: "Hindi", isCorrect: false }
        ]
      },
      {
        text: "In what year did the Titanic sink?",
        options: [
          { text: "1912", isCorrect: true },
          { text: "1905", isCorrect: false },
          { text: "1898", isCorrect: false },
          { text: "1923", isCorrect: false }
        ]
      },
      {
        text: "What is the longest river in the world?",
        options: [
          { text: "Amazon River", isCorrect: false },
          { text: "Nile River", isCorrect: true },
          { text: "Yangtze River", isCorrect: false },
          { text: "Mississippi River", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Basic Science Trivia",
    description: "Test your knowledge of the universe, biology, and chemistry.",
    categoryName: "Science",
    questions: [
      {
        text: "What planet is closest to the Sun?",
        options: [
          { text: "Mercury", isCorrect: true },
          { text: "Venus", isCorrect: false },
          { text: "Earth", isCorrect: false },
          { text: "Mars", isCorrect: false }
        ]
      },
      {
        text: "What is the chemical symbol for Gold?",
        options: [
          { text: "Au", isCorrect: true },
          { text: "Ag", isCorrect: false },
          { text: "Fe", isCorrect: false },
          { text: "Pb", isCorrect: false }
        ]
      },
      {
        text: "Which gas is most abundant in the Earth's atmosphere?",
        options: [
          { text: "Oxygen", isCorrect: false },
          { text: "Carbon Dioxide", isCorrect: false },
          { text: "Nitrogen", isCorrect: true },
          { text: "Hydrogen", isCorrect: false }
        ]
      },
      {
        text: "What is the powerhouse of the cell?",
        options: [
          { text: "Nucleus", isCorrect: false },
          { text: "Mitochondria", isCorrect: true },
          { text: "Ribosome", isCorrect: false },
          { text: "Chloroplast", isCorrect: false }
        ]
      },
      {
        text: "How many bones are in the adult human body?",
        options: [
          { text: "206", isCorrect: true },
          { text: "195", isCorrect: false },
          { text: "215", isCorrect: false },
          { text: "250", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "World History",
    description: "Journey through time and test your historical knowledge.",
    categoryName: "History",
    questions: [
      {
        text: "Who was the first President of the United States?",
        options: [
          { text: "Thomas Jefferson", isCorrect: false },
          { text: "John Adams", isCorrect: false },
          { text: "George Washington", isCorrect: true },
          { text: "Abraham Lincoln", isCorrect: false }
        ]
      },
      {
        text: "In what year did World War II end?",
        options: [
          { text: "1940", isCorrect: false },
          { text: "1945", isCorrect: true },
          { text: "1950", isCorrect: false },
          { text: "1939", isCorrect: false }
        ]
      },
      {
        text: "Who was the ancient Egyptian queen famous for her relationships with Julius Caesar and Mark Antony?",
        options: [
          { text: "Nefertiti", isCorrect: false },
          { text: "Hatshepsut", isCorrect: false },
          { text: "Cleopatra", isCorrect: true },
          { text: "Ahhotep", isCorrect: false }
        ]
      },
      {
        text: "The Great Wall of China was primarily built to protect against which invaders?",
        options: [
          { text: "The Mongols", isCorrect: true },
          { text: "The Romans", isCorrect: false },
          { text: "The Persians", isCorrect: false },
          { text: "The Huns", isCorrect: false }
        ]
      },
      {
        text: "Which empire was ruled by Julius Caesar?",
        options: [
          { text: "Ottoman Empire", isCorrect: false },
          { text: "Roman Empire", isCorrect: true },
          { text: "Byzantine Empire", isCorrect: false },
          { text: "British Empire", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Sports Legends",
    description: "How well do you know your sports stars and history?",
    categoryName: "Sports",
    questions: [
      {
        text: "How many players are on a standard soccer team on the field?",
        options: [
          { text: "9", isCorrect: false },
          { text: "10", isCorrect: false },
          { text: "11", isCorrect: true },
          { text: "12", isCorrect: false }
        ]
      },
      {
        text: "In which sport is the 'Stanley Cup' awarded?",
        options: [
          { text: "Baseball", isCorrect: false },
          { text: "Basketball", isCorrect: false },
          { text: "Ice Hockey", isCorrect: true },
          { text: "American Football", isCorrect: false }
        ]
      },
      {
        text: "Who holds the record for the most Olympic gold medals?",
        options: [
          { text: "Usain Bolt", isCorrect: false },
          { text: "Michael Phelps", isCorrect: true },
          { text: "Carl Lewis", isCorrect: false },
          { text: "Mark Spitz", isCorrect: false }
        ]
      },
      {
        text: "What color is the 'yellow card' in soccer?",
        options: [
          { text: "Yellow", isCorrect: true },
          { text: "Red", isCorrect: false },
          { text: "Green", isCorrect: false },
          { text: "Blue", isCorrect: false }
        ]
      },
      {
        text: "Every how many years are the Summer Olympics held?",
        options: [
          { text: "2", isCorrect: false },
          { text: "4", isCorrect: true },
          { text: "6", isCorrect: false },
          { text: "8", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Tech Giants & Gadgets",
    description: "Computers, internet, and the companies that made them.",
    categoryName: "Technology",
    questions: [
      {
        text: "Who is the co-founder of Microsoft alongside Bill Gates?",
        options: [
          { text: "Steve Jobs", isCorrect: false },
          { text: "Paul Allen", isCorrect: true },
          { text: "Steve Wozniak", isCorrect: false },
          { text: "Larry Page", isCorrect: false }
        ]
      },
      {
        text: "What does 'HTTP' stand for?",
        options: [
          { text: "HyperText Transfer Protocol", isCorrect: true },
          { text: "HyperText Transmission Process", isCorrect: false },
          { text: "Hyperlink Transfer Technology", isCorrect: false },
          { text: "HyperText Transfer Program", isCorrect: false }
        ]
      },
      {
        text: "In what year did the first iPhone launch?",
        options: [
          { text: "2005", isCorrect: false },
          { text: "2007", isCorrect: true },
          { text: "2009", isCorrect: false },
          { text: "2010", isCorrect: false }
        ]
      },
      {
        text: "Which company owns the Android operating system?",
        options: [
          { text: "Apple", isCorrect: false },
          { text: "Microsoft", isCorrect: false },
          { text: "Google", isCorrect: true },
          { text: "Samsung", isCorrect: false }
        ]
      },
      {
        text: "What unit of measurement is equal to 1,024 Megabytes?",
        options: [
          { text: "Kilobyte", isCorrect: false },
          { text: "Gigabyte", isCorrect: true },
          { text: "Terabyte", isCorrect: false },
          { text: "Petabyte", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Music Masters",
    description: "From classical to modern hits.",
    categoryName: "Music",
    questions: [
      {
        text: "Who is known as the 'King of Pop'?",
        options: [
          { text: "Elvis Presley", isCorrect: false },
          { text: "Prince", isCorrect: false },
          { text: "Michael Jackson", isCorrect: true },
          { text: "Frank Sinatra", isCorrect: false }
        ]
      },
      {
        text: "Which band released the album 'Abbey Road'?",
        options: [
          { text: "The Rolling Stones", isCorrect: false },
          { text: "The Who", isCorrect: false },
          { text: "The Beatles", isCorrect: true },
          { text: "Pink Floyd", isCorrect: false }
        ]
      },
      {
        text: "How many strings does a standard guitar have?",
        options: [
          { text: "4", isCorrect: false },
          { text: "5", isCorrect: false },
          { text: "6", isCorrect: true },
          { text: "7", isCorrect: false }
        ]
      },
      {
        text: "What is the highest female voice type?",
        options: [
          { text: "Alto", isCorrect: false },
          { text: "Mezzo-soprano", isCorrect: false },
          { text: "Soprano", isCorrect: true },
          { text: "Contralto", isCorrect: false }
        ]
      },
      {
        text: "Who composed the 'Four Seasons'?",
        options: [
          { text: "Beethoven", isCorrect: false },
          { text: "Mozart", isCorrect: false },
          { text: "Vivaldi", isCorrect: true },
          { text: "Bach", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Pop Culture Blast",
    description: "Movies, celebrities, and trending moments.",
    categoryName: "Pop Culture",
    questions: [
      {
        text: "What is the name of the fictional city where Batman lives?",
        options: [
          { text: "Metropolis", isCorrect: false },
          { text: "Gotham City", isCorrect: true },
          { text: "Star City", isCorrect: false },
          { text: "Central City", isCorrect: false }
        ]
      },
      {
        text: "Which artist had a hit song with 'Shape of You'?",
        options: [
          { text: "Justin Bieber", isCorrect: false },
          { text: "Shawn Mendes", isCorrect: false },
          { text: "Ed Sheeran", isCorrect: true },
          { text: "Charlie Puth", isCorrect: false }
        ]
      },
      {
        text: "In the movie 'The Matrix', what pill does Neo take?",
        options: [
          { text: "Red Pill", isCorrect: true },
          { text: "Blue Pill", isCorrect: false },
          { text: "Green Pill", isCorrect: false },
          { text: "Yellow Pill", isCorrect: false }
        ]
      },
      {
        text: "Who wrote the 'Harry Potter' series?",
        options: [
          { text: "J.R.R. Tolkien", isCorrect: false },
          { text: "Stephen King", isCorrect: false },
          { text: "J.K. Rowling", isCorrect: true },
          { text: "George R.R. Martin", isCorrect: false }
        ]
      },
      {
        text: "What was the first feature-length animated movie released by Disney?",
        options: [
          { text: "Cinderella", isCorrect: false },
          { text: "Pinocchio", isCorrect: false },
          { text: "Snow White and the Seven Dwarfs", isCorrect: true },
          { text: "Dumbo", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "World Geography Wonders",
    description: "Explore the physical features of our planet.",
    categoryName: "Geography",
    questions: [
      {
        text: "What is the tallest mountain in the world?",
        options: [
          { text: "K2", isCorrect: false },
          { text: "Mount Everest", isCorrect: true },
          { text: "Mount Kilimanjaro", isCorrect: false },
          { text: "Mount Denali", isCorrect: false }
        ]
      },
      {
        text: "Which of these is not a continent?",
        options: [
          { text: "Antarctica", isCorrect: false },
          { text: "Europe", isCorrect: false },
          { text: "Russia", isCorrect: true },
          { text: "South America", isCorrect: false }
        ]
      },
      {
        text: "What is the smallest country in the world by land area?",
        options: [
          { text: "Monaco", isCorrect: false },
          { text: "San Marino", isCorrect: false },
          { text: "Liechtenstein", isCorrect: false },
          { text: "Vatican City", isCorrect: true }
        ]
      },
      {
        text: "Which desert is the largest hot desert in the world?",
        options: [
          { text: "Sahara Desert", isCorrect: true },
          { text: "Arabian Desert", isCorrect: false },
          { text: "Gobi Desert", isCorrect: false },
          { text: "Kalahari Desert", isCorrect: false }
        ]
      },
      {
        text: "Which ocean is the largest by surface area?",
        options: [
          { text: "Atlantic Ocean", isCorrect: false },
          { text: "Indian Ocean", isCorrect: false },
          { text: "Pacific Ocean", isCorrect: true },
          { text: "Arctic Ocean", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Classic Literature",
    description: "Test your knowledge of famous books and authors.",
    categoryName: "Literature",
    questions: [
      {
        text: "Who wrote 'Romeo and Juliet'?",
        options: [
          { text: "Charles Dickens", isCorrect: false },
          { text: "William Shakespeare", isCorrect: true },
          { text: "Jane Austen", isCorrect: false },
          { text: "Mark Twain", isCorrect: false }
        ]
      },
      {
        text: "What is the name of the captain in 'Moby Dick'?",
        options: [
          { text: "Captain Nemo", isCorrect: false },
          { text: "Captain Hook", isCorrect: false },
          { text: "Captain Ahab", isCorrect: true },
          { text: "Captain Flint", isCorrect: false }
        ]
      },
      {
        text: "Who is the protagonist of '1984' by George Orwell?",
        options: [
          { text: "Winston Smith", isCorrect: true },
          { text: "John the Savage", isCorrect: false },
          { text: "Guy Montag", isCorrect: false },
          { text: "Holden Caulfield", isCorrect: false }
        ]
      },
      {
        text: "Which Greek poet is credited with writing the 'Iliad' and the 'Odyssey'?",
        options: [
          { text: "Sophocles", isCorrect: false },
          { text: "Euripides", isCorrect: false },
          { text: "Homer", isCorrect: true },
          { text: "Virgil", isCorrect: false }
        ]
      },
      {
        text: "In which book does the character 'Aslan' appear?",
        options: [
          { text: "The Lord of the Rings", isCorrect: false },
          { text: "The Chronicles of Narnia", isCorrect: true },
          { text: "Harry Potter", isCorrect: false },
          { text: "His Dark Materials", isCorrect: false }
        ]
      }
    ]
  },
  {
    title: "Art & Masterpieces",
    description: "Questions about famous paintings and their creators.",
    categoryName: "Art & Design",
    questions: [
      {
        text: "Who painted the 'Mona Lisa'?",
        options: [
          { text: "Vincent van Gogh", isCorrect: false },
          { text: "Pablo Picasso", isCorrect: false },
          { text: "Leonardo da Vinci", isCorrect: true },
          { text: "Claude Monet", isCorrect: false }
        ]
      },
      {
        text: "Which artist is famous for cutting off part of his own ear?",
        options: [
          { text: "Salvador Dalí", isCorrect: false },
          { text: "Vincent van Gogh", isCorrect: true },
          { text: "Rembrandt", isCorrect: false },
          { text: "Jackson Pollock", isCorrect: false }
        ]
      },
      {
        text: "What art movement is Salvador Dalí associated with?",
        options: [
          { text: "Impressionism", isCorrect: false },
          { text: "Cubism", isCorrect: false },
          { text: "Surrealism", isCorrect: true },
          { text: "Renaissance", isCorrect: false }
        ]
      },
      {
        text: "Where is the painting 'The Last Supper' located?",
        options: [
          { text: "Paris", isCorrect: false },
          { text: "Rome", isCorrect: false },
          { text: "Milan", isCorrect: true },
          { text: "Florence", isCorrect: false }
        ]
      },
      {
        text: "Which famous statue was sculpted by Michelangelo?",
        options: [
          { text: "The Thinker", isCorrect: false },
          { text: "Venus de Milo", isCorrect: false },
          { text: "David", isCorrect: true },
          { text: "Christ the Redeemer", isCorrect: false }
        ]
      }
    ]
  }
];

async function main() {
  console.log("🌱 Seeding categories...\n");

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

    console.log(`  📂 ${result.name} -> ${result.icon}`);
  }

  console.log(`\n🎉 Seeded ${categories.length} categories successfully!`);
  
  console.log("\n👤 Seeding system user...\n");
  
  const hashedPassword = await bcrypt.hash("quizloSeedPassword123!", 10);
  
  const systemUser = await prisma.user.upsert({
    where: { email: "system@quizlo.com" },
    update: {},
    create: {
      id: generateId("usr"),
      firstName: "Quizlo",
      lastName: "System",
      username: "quizlo_official",
      email: "system@quizlo.com",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  console.log(`  ✅ System user ready: ${systemUser.username}`);

  // ── Dev Test Users ────────────────────────────────────────────────────────
  // Password for ALL test users: TestPassword123!
  console.log("\n👥 Seeding dev test users...\n");

  const testPassword = await bcrypt.hash("TestPassword123!", 10);

  const testUsers = [
    {
      // Level 1 — Novice (fresh account, 0 XP)
      firstName: "Alex",
      lastName:  "Novice",
      username:  "alex_novice",
      email:     "alex@test.com",
      xp:        0,
      level:     1,
      streak:    0,
    },
    {
      // Level 5 — Scholar (Beginner tier, 700 XP)
      firstName: "Sam",
      lastName:  "Scholar",
      username:  "sam_scholar",
      email:     "sam@test.com",
      xp:        700,
      level:     5,
      streak:    7,
    },
    {
      // Level 15 — Sage (Silver tier, 11 000 XP)
      firstName: "Jordan",
      lastName:  "Sage",
      username:  "jordan_sage",
      email:     "jordan@test.com",
      xp:        11_000,
      level:     15,
      streak:    30,
    },
  ];

  for (const u of testUsers) {
    const result = await prisma.user.upsert({
      where: { email: u.email },
      update: { xp: u.xp, level: u.level, streak: u.streak },
      create: {
        id:        generateId("usr"),
        firstName: u.firstName,
        lastName:  u.lastName,
        username:  u.username,
        email:     u.email,
        password:  testPassword,
        xp:        u.xp,
        level:     u.level,
        streak:    u.streak,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(
      `  ✅ ${result.username} (Level ${result.level}, ${result.xp} XP) — ${result.email}`
    );
  }
  console.log(`\n  🔑 All test user passwords: TestPassword123!`);
  // ─────────────────────────────────────────────────────────────────────────

  
  console.log("\n🧠 Seeding sample quizzes...\n");
  
  // Get all categories to reference their IDs
  const allCategories = await prisma.category.findMany();
  
  for (const quizData of sampleQuizzes) {
    const category = allCategories.find(c => c.name === quizData.categoryName);
    
    if (!category) {
      console.warn(`⚠️ Category '${quizData.categoryName}' not found. Skipping quiz.`);
      continue;
    }
    
    // Pick a random difficulty
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    // Calculate a reasonable time allocated (e.g., 15 seconds per question)
    const timeAllocated = quizData.questions.length * 15;

    // Check if the quiz already exists to prevent duplicates on multiple runs
    // We'll search by title
    const existingQuiz = await prisma.quiz.findFirst({
      where: { title: quizData.title, creatorId: systemUser.id }
    });
    
    if (existingQuiz) {
      // Update the existing quiz with the new timeAllocated value
      await prisma.quiz.update({
        where: { id: existingQuiz.id },
        data: { timeAllocated: timeAllocated }
      });
      console.log(`  ♻️ Quiz '${quizData.title}' already exists. Updated timeAllocated to ${timeAllocated}s.`);
      continue;
    }
    
    // Construct nested creation object
    const createdQuiz = await prisma.quiz.create({
      data: {
        id: generateId("quiz"),
        title: quizData.title,
        description: quizData.description,
        difficulty: randomDifficulty,
        timeAllocated: timeAllocated,
        categoryId: category.id,
        creatorId: systemUser.id,
        isPrivate: false,
        isDraft: false,
        creationMode: "Manual",
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: {
          create: quizData.questions.map((q, index) => ({
            id: generateId("ques"),
            text: q.text,
            type: "Mcq",
            order: index + 1,
            createdAt: new Date(),
            answerOptions: {
              create: q.options.map((opt, optIndex) => ({
                id: generateId("opt"),
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: optIndex + 1,
              }))
            }
          }))
        }
      }
    });
    
    console.log(`  ✅ Created quiz: '${createdQuiz.title}' (${createdQuiz.difficulty})`);
  }
  
  console.log(`\n🎉 Seed completed successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
