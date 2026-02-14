/**
 * Maps Goodreads genre tags to the 15 frontend book categories.
 *
 * The frontend (app/biblioteca/page.tsx) recognizes exactly these categories:
 *   Nonfiction, Psychology, History, Business, Self Help, Personal Development,
 *   Technology, Science, Biography, Health, Economics, Education,
 *   Artificial Intelligence, Games, Fiction
 *
 * Goodreads provides ~166 unique raw genre tags. This mapping normalizes them
 * into the frontend set so every book is filterable in the UI.
 */

const FRONTEND_CATEGORIES = [
  "Nonfiction",
  "Psychology",
  "History",
  "Business",
  "Self Help",
  "Personal Development",
  "Technology",
  "Science",
  "Biography",
  "Health",
  "Economics",
  "Education",
  "Artificial Intelligence",
  "Games",
  "Fiction",
] as const;

export type FrontendCategory = typeof FRONTEND_CATEGORIES[number];

/**
 * Goodreads genre → frontend category(ies).
 * Categories that already match a frontend name map to themselves.
 * Empty arrays mean "skip this tag" (e.g. format tags like Audiobook).
 */
const CATEGORY_MAP: Record<string, FrontendCategory[]> = {
  // --- Direct matches (Goodreads name === frontend name) ---
  "Nonfiction": ["Nonfiction"],
  "Psychology": ["Psychology"],
  "History": ["History"],
  "Business": ["Business"],
  "Self Help": ["Self Help"],
  "Personal Development": ["Personal Development"],
  "Technology": ["Technology"],
  "Science": ["Science"],
  "Biography": ["Biography"],
  "Health": ["Health"],
  "Economics": ["Economics"],
  "Education": ["Education"],
  "Artificial Intelligence": ["Artificial Intelligence"],
  "Games": ["Games"],
  "Fiction": ["Fiction"],

  // --- Typos / alternate spellings ---
  "Buisness": ["Business"],

  // --- Business & Economics cluster ---
  "Leadership": ["Business"],
  "Management": ["Business"],
  "Entrepreneurship": ["Business"],
  "Finance": ["Economics"],
  "Personal Finance": ["Economics"],
  "Money": ["Economics"],
  "Productivity": ["Business", "Personal Development"],

  // --- Psychology & Neuroscience cluster ---
  "Neuroscience": ["Psychology", "Science"],
  "Brain": ["Psychology", "Science"],
  "Psychiatry": ["Psychology", "Health"],
  "Psychoanalysis": ["Psychology"],
  "Mental Health": ["Psychology", "Health"],
  "Counselling": ["Psychology", "Health"],
  "Adhd": ["Psychology", "Health"],
  "Autistic Spectrum Disorder": ["Psychology", "Health"],

  // --- Science cluster ---
  "Biology": ["Science"],
  "Physics": ["Science"],
  "Mathematics": ["Science"],
  "Evolution": ["Science"],
  "Climate Change": ["Science"],
  "Popular Science": ["Science"],
  "Computer Science": ["Technology"],
  "Engineering": ["Technology"],
  "Computers": ["Technology"],
  "Programming": ["Technology"],
  "Internet": ["Technology"],
  "Hackers": ["Technology"],

  // --- History cluster ---
  "American History": ["History"],
  "Military History": ["History"],
  "World War II": ["History"],
  "Holocaust": ["History"],
  "Oral History": ["History"],
  "Food History": ["History"],
  "Art History": ["History"],
  "War": ["History"],

  // --- Biography / Memoir cluster ---
  "Memoir": ["Biography"],
  "Biography Memoir": ["Biography"],
  "Autobiography": ["Biography"],

  // --- Health cluster ---
  "Medical": ["Health"],
  "Medicine": ["Health"],

  // --- Education cluster ---
  "Teaching": ["Education"],
  "Textbooks": ["Education"],
  "College": ["Education"],
  "School": ["Education"],
  "Academic": ["Education"],
  "Research": ["Education"],

  // --- Self Help / Personal Development cluster ---
  "Inspirational": ["Self Help"],
  "Relationships": ["Self Help"],
  "Spirituality": ["Self Help"],
  "Parenting": ["Self Help"],

  // --- Fiction cluster ---
  "Historical Fiction": ["Fiction"],
  "Fantasy": ["Fiction"],
  "Horror": ["Fiction"],
  "Mystery": ["Fiction"],
  "Thriller": ["Fiction"],
  "Crime": ["Fiction"],
  "Gothic": ["Fiction"],
  "Short Stories": ["Fiction"],
  "Novels": ["Fiction"],
  "Military Fiction": ["Fiction"],
  "Love": ["Fiction"],
  "Magic": ["Fiction"],

  // --- Games cluster ---
  "Gaming": ["Games"],
  "Video Games": ["Games"],
  "Game Design": ["Games"],
  "Puzzles": ["Games"],

  // --- Nonfiction general cluster ---
  "Philosophy": ["Nonfiction"],
  "Sociology": ["Nonfiction"],
  "Politics": ["Nonfiction"],
  "Political Science": ["Nonfiction"],
  "Anthropology": ["Nonfiction"],
  "Social Science": ["Nonfiction"],
  "Social Justice": ["Nonfiction"],
  "Social Movements": ["Nonfiction"],
  "Cultural": ["Nonfiction"],
  "Cultural Studies": ["Nonfiction"],
  "Society": ["Nonfiction"],
  "Journalism": ["Nonfiction"],
  "Law": ["Nonfiction"],
  "Legal": ["Nonfiction"],
  "Feminism": ["Nonfiction"],
  "Gender": ["Nonfiction"],
  "LGBT": ["Nonfiction"],
  "Religion": ["Nonfiction"],
  "Metaphysics": ["Nonfiction"],
  "Logic": ["Nonfiction"],
  "Communication": ["Nonfiction"],
  "Activism": ["Nonfiction"],
  "Urban Planning": ["Nonfiction"],
  "Environment": ["Nonfiction"],
  "Sustainability": ["Nonfiction"],
  "Peak Oil": ["Nonfiction"],
  "Futurism": ["Nonfiction", "Technology"],
  "Geography": ["Nonfiction"],
  "Essays": ["Nonfiction"],
  "True Crime": ["Nonfiction"],
  "Criticism": ["Nonfiction"],
  "Literary Criticism": ["Nonfiction"],
  "Theory": ["Nonfiction"],
  "Reference": ["Nonfiction"],
  "Pop Culture": ["Nonfiction"],
  "Sexuality": ["Nonfiction"],

  // --- Arts & Culture ---
  "Art": ["Nonfiction"],
  "Music": ["Nonfiction"],
  "Film": ["Nonfiction"],
  "Design": ["Nonfiction"],
  "Fashion": ["Nonfiction"],
  "Writing": ["Nonfiction"],
  "Poetry": ["Nonfiction"],
  "Photography": ["Nonfiction"],

  // --- Food ---
  "Food": ["Nonfiction"],
  "Food and Drink": ["Nonfiction"],
  "Cookbooks": ["Nonfiction"],
  "Cooking": ["Nonfiction"],
  "Booze": ["Nonfiction"],

  // --- Sports ---
  "Sports": ["Nonfiction"],
  "Basketball": ["Nonfiction"],
  "Hockey": ["Nonfiction"],

  // --- Comics / Graphic Novels ---
  "Comic Book": ["Fiction"],
  "Comics": ["Fiction"],
  "Graphic Novels": ["Fiction"],
  "Graphic Novels Comics": ["Fiction"],
  "Bande Dessinée": ["Fiction"],
  "Marvel": ["Fiction"],
  "Star Wars": ["Fiction"],

  // --- Regional / format tags (no useful category signal) ---
  "Humor": ["Nonfiction"],
  "Comedy": ["Fiction"],
  "Cults": ["Nonfiction"],
  "Dogs": ["Nonfiction"],
  "Animals": ["Nonfiction"],

  // --- Country-specific (minimal signal) ---
  "China": ["Nonfiction"],
  "India": ["Nonfiction"],
  "France": ["Nonfiction"],
  "Canada": ["Nonfiction"],
  "Ireland": ["Nonfiction"],
  "Germany": ["Nonfiction"],
  "German Literature": ["Fiction"],
  "Irish Literature": ["Fiction"],
  "Rock N Roll": ["Nonfiction"],

  // --- Format / audience tags (skip - not a real category) ---
  "Audiobook": [],
  "Adult": [],
  "Childrens": [],
  "Middle Grade": [],
  "Anthologies": [],
  "Banned Books": [],
  "Books About Books": [],
  "Mythology": ["Nonfiction"],
  "Historical": ["History"],
  "Technical": ["Technology"],
  "Womens": [],
};

/**
 * Maps an array of Goodreads genre tags to frontend categories.
 * Unknown tags default to ["Nonfiction"] to avoid silent drops.
 */
export function mapToFrontendCategories(goodreadsCategories: string[]): string[] {
  const mapped = new Set<string>();

  for (const tag of goodreadsCategories) {
    const frontendCats = CATEGORY_MAP[tag];
    if (frontendCats !== undefined) {
      for (const cat of frontendCats) {
        mapped.add(cat);
      }
    } else {
      // Unknown tag — default to Nonfiction so the book isn't invisible
      mapped.add("Nonfiction");
    }
  }

  return Array.from(mapped);
}
