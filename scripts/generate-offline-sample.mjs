import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "data", "offline");

const categories = [
  "food",
  "travel",
  "work",
  "home",
  "people",
  "shopping",
  "health",
  "nature",
  "daily",
  "education",
];

const wordSeeds = [
  ["der Apfel", "apple", "der", "Apfel", "A1", "food", "Ich esse einen Apfel.", "I eat an apple."],
  ["die Banane", "banana", "die", "Banane", "A1", "food", "Die Banane ist gelb.", "The banana is yellow."],
  ["das Brot", "bread", "das", "Brot", "A1", "food", "Ich kaufe Brot.", "I buy bread."],
  ["die Milch", "milk", "die", "Milch", "A1", "food", "Die Milch ist kalt.", "The milk is cold."],
  ["das Wasser", "water", "das", "Wasser", "A1", "food", "Kann ich Wasser haben?", "Can I have water?"],
  ["der Kaffee", "coffee", "der", "Kaffee", "A1", "food", "Ich trinke Kaffee am Morgen.", "I drink coffee in the morning."],
  ["die Suppe", "soup", "die", "Suppe", "A2", "food", "Die Suppe schmeckt gut.", "The soup tastes good."],
  ["der Reis", "rice", "der", "Reis", "A2", "food", "Wir kochen Reis.", "We cook rice."],
  ["die Kartoffel", "potato", "die", "Kartoffel", "A2", "food", "Die Kartoffel ist heiß.", "The potato is hot."],
  ["der Fisch", "fish", "der", "Fisch", "B1", "food", "Der Fisch ist frisch.", "The fish is fresh."],
  ["der Zug", "train", "der", "Zug", "A1", "travel", "Der Zug kommt um acht.", "The train arrives at eight."],
  ["der Flughafen", "airport", "der", "Flughafen", "A2", "travel", "Wir fahren zum Flughafen.", "We drive to the airport."],
  ["die Fahrkarte", "ticket", "die", "Fahrkarte", "A2", "travel", "Ich brauche eine Fahrkarte.", "I need a ticket."],
  ["das Hotel", "hotel", "das", "Hotel", "A1", "travel", "Das Hotel ist nah.", "The hotel is nearby."],
  ["die Reise", "trip", "die", "Reise", "B1", "travel", "Die Reise war schön.", "The trip was nice."],
  ["der Koffer", "suitcase", "der", "Koffer", "A2", "travel", "Mein Koffer ist schwer.", "My suitcase is heavy."],
  ["die Karte", "map", "die", "Karte", "A1", "travel", "Hast du eine Karte?", "Do you have a map?"],
  ["das Gleis", "platform / track", "das", "Gleis", "B2", "travel", "Der Zug fährt von Gleis 3.", "The train leaves from platform 3."],
  ["der Pass", "passport", "der", "Pass", "A2", "travel", "Vergiss deinen Pass nicht.", "Don't forget your passport."],
  ["die Verspätung", "delay", "die", "Verspätung", "B2", "travel", "Es gibt eine Verspätung.", "There is a delay."],
  ["die Arbeit", "work", "die", "Arbeit", "A1", "work", "Ich gehe zur Arbeit.", "I go to work."],
  ["der Kollege", "colleague", "der", "Kollege", "A2", "work", "Mein Kollege ist nett.", "My colleague is nice."],
  ["die Kollegin", "female colleague", "die", "Kollegin", "A2", "work", "Die Kollegin hilft mir.", "The colleague helps me."],
  ["das Büro", "office", "das", "Büro", "A1", "work", "Das Büro ist groß.", "The office is big."],
  ["der Chef", "boss", "der", "Chef", "A2", "work", "Der Chef ist im Meeting.", "The boss is in a meeting."],
  ["die Besprechung", "meeting", "die", "Besprechung", "B1", "work", "Die Besprechung beginnt um zehn.", "The meeting starts at ten."],
  ["der Vertrag", "contract", "der", "Vertrag", "B2", "work", "Ich unterschreibe den Vertrag.", "I sign the contract."],
  ["die Pause", "break", "die", "Pause", "A1", "work", "Wir machen Pause.", "We take a break."],
  ["der Termin", "appointment", "der", "Termin", "A2", "work", "Ich habe einen Termin.", "I have an appointment."],
  ["die Erfahrung", "experience", "die", "Erfahrung", "B1", "work", "Sie hat viel Erfahrung.", "She has a lot of experience."],
  ["das Haus", "house", "das", "Haus", "A1", "home", "Das Haus ist alt.", "The house is old."],
  ["die Wohnung", "apartment", "die", "Wohnung", "A1", "home", "Meine Wohnung ist klein.", "My apartment is small."],
  ["das Zimmer", "room", "das", "Zimmer", "A1", "home", "Das Zimmer ist hell.", "The room is bright."],
  ["die Küche", "kitchen", "die", "Küche", "A1", "home", "Die Küche ist sauber.", "The kitchen is clean."],
  ["das Bad", "bathroom", "das", "Bad", "A1", "home", "Das Bad ist neu.", "The bathroom is new."],
  ["der Schlüssel", "key", "der", "Schlüssel", "A2", "home", "Wo ist der Schlüssel?", "Where is the key?"],
  ["die Möbel", "furniture", "die", "Möbel", "B1", "home", "Die Möbel sind modern.", "The furniture is modern."],
  ["der Nachbar", "neighbor", "der", "Nachbar", "A2", "home", "Der Nachbar ist freundlich.", "The neighbor is friendly."],
  ["die Miete", "rent", "die", "Miete", "B2", "home", "Die Miete ist hoch.", "The rent is high."],
  ["das Licht", "light", "das", "Licht", "A1", "home", "Mach das Licht an.", "Turn on the light."],
  ["der Mann", "man", "der", "Mann", "A1", "people", "Der Mann liest.", "The man is reading."],
  ["die Frau", "woman", "die", "Frau", "A1", "people", "Die Frau arbeitet.", "The woman is working."],
  ["das Kind", "child", "das", "Kind", "A1", "people", "Das Kind spielt.", "The child is playing."],
  ["der Freund", "friend", "der", "Freund", "A1", "people", "Mein Freund wohnt in Berlin.", "My friend lives in Berlin."],
  ["die Familie", "family", "die", "Familie", "A1", "people", "Meine Familie ist groß.", "My family is big."],
  ["der Arzt", "doctor", "der", "Arzt", "A2", "health", "Der Arzt ist heute da.", "The doctor is here today."],
  ["die Apotheke", "pharmacy", "die", "Apotheke", "A2", "health", "Die Apotheke ist offen.", "The pharmacy is open."],
  ["der Schmerz", "pain", "der", "Schmerz", "B1", "health", "Ich habe Schmerzen.", "I have pain."],
  ["die Gesundheit", "health", "die", "Gesundheit", "B1", "health", "Gesundheit ist wichtig.", "Health is important."],
  ["der Baum", "tree", "der", "Baum", "A1", "nature", "Der Baum ist grün.", "The tree is green."],
  ["die Blume", "flower", "die", "Blume", "A1", "nature", "Die Blume ist schön.", "The flower is beautiful."],
];

while (wordSeeds.length < 50) {
  const i = wordSeeds.length;
  const cat = categories[i % categories.length];
  wordSeeds.push([
    `das Wort${i}`,
    `word ${i}`,
    "das",
    `Wort${i}`,
    i < 15 ? "A1" : i < 30 ? "A2" : i < 42 ? "B1" : "B2",
    cat,
    `Beispiel ${i}.`,
    `Example ${i}.`,
  ]);
}

const words = wordSeeds.slice(0, 50).map((row, idx) => ({
  id: `ow-${String(idx + 1).padStart(3, "0")}`,
  german: row[0],
  english: row[1],
  article: row[2],
  base: row[3],
  level: row[4],
  category: row[5],
  exampleDe: row[6],
  exampleEn: row[7],
  illustrationId: row[5],
}));

const sentenceSeeds = [
  ["Ich habe Hunger.", "I am hungry.", "A1", "daily", "haben + Akkusativ"],
  ["Wo ist der Bahnhof?", "Where is the train station?", "A1", "travel", "Wo-Frage + ist"],
  ["Ich arbeite von Montag bis Freitag.", "I work from Monday to Friday.", "A2", "work", "Zeitangabe mit bis"],
  ["Kannst du mir helfen?", "Can you help me?", "A1", "daily", "Modalverb können + Dativ"],
  ["Das Wetter ist heute schön.", "The weather is nice today.", "A1", "nature", "sein + Adjektiv"],
  ["Ich möchte einen Kaffee bestellen.", "I would like to order a coffee.", "A2", "food", "möchten + Infinitiv"],
  ["Sie fährt morgen nach München.", "She is driving to Munich tomorrow.", "A2", "travel", "fahren + nach + Dativ"],
  ["Wir treffen uns um halb sieben.", "We meet at half past six.", "A2", "daily", "Reflexiv treffen + Zeit"],
  ["Er hat gestern viel gelernt.", "He learned a lot yesterday.", "B1", "education", "Perfekt: haben + Partizip II"],
  ["Die Prüfung war schwieriger als erwartet.", "The exam was harder than expected.", "B2", "education", "Komparativ + als"],
  ["Ich wohne seit zwei Jahren in Hamburg.", "I have lived in Hamburg for two years.", "B1", "home", "wohnen + seit + Dativ"],
  ["Könnten Sie das bitte wiederholen?", "Could you please repeat that?", "A2", "daily", "Höflichkeitsform Könnten"],
  ["Mein Bruder ist Arzt.", "My brother is a doctor.", "A1", "people", "Beruf ohne Artikel nach sein"],
  ["Im Supermarkt kaufe ich Gemüse.", "At the supermarket I buy vegetables.", "A1", "shopping", "Im + Dativ"],
  ["Der Zug hat Verspätung.", "The train is delayed.", "B2", "travel", "Verspätung haben"],
  ["Ich nehme die Tabletten dreimal täglich.", "I take the tablets three times daily.", "B1", "health", "nehmen + Akkusativ"],
  ["Das Buch liegt auf dem Tisch.", "The book is on the table.", "A1", "home", "auf + Dativ (Wo?)"],
  ["Wie viel kostet das?", "How much does it cost?", "A2", "shopping", "Wie viel + kosten"],
  ["Ich lerne jeden Tag Deutsch.", "I learn German every day.", "A1", "education", "Präsens: lernen"],
  ["Sie hat heute frei.", "She has the day off today.", "B1", "work", "frei haben (idiom)"],
];

const sentences = sentenceSeeds.map((row, idx) => ({
  id: `os-${String(idx + 1).padStart(3, "0")}`,
  german: row[0],
  english: row[1],
  level: row[2],
  category: row[3],
  grammarNotes: row[4],
  illustrationId: row[3],
}));

const manifest = {
  version: 1,
  wordCount: words.length,
  sentenceCount: sentences.length,
  updatedAt: new Date().toISOString().slice(0, 10),
};

const bundle = { manifest, words, sentences };

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "bundle.json"), JSON.stringify(bundle, null, 2));
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${words.length} words, ${sentences.length} sentences to ${outDir}`);
