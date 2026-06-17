import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import admin from "firebase-admin";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "void_archive_db.json");

// Initialize Firebase Admin SDK using firebase-applet-config.json
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    const dbId = firebaseConfig.firestoreDatabaseId;
    firestoreDb = dbId ? (admin as any).firestore(dbId) : (admin as any).firestore();
    console.log("Firebase Firestore initialized with Project ID:", firebaseConfig.projectId, "Database ID:", dbId || "default");
  } else {
    console.error("firebase-applet-config.json not found, skipping cloud persistence initialization.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK:", err);
}

// Ensure old DB file is loaded and persistently stored to secure admin drafts and inventory
// If the DB file does not exist, it will be automatically formatted and pre-seeded on first run.

// Predefined set of clean Y2K indie/grunge alternative products
const DEFAULT_PRODUCTS = [
  {
    id: "prod-1",
    name: "SGB // ZIP-UP HOODIE SHIELD",
    description: "Об'ємне зіп-худі чорного кольору з масивним капюшоном, контрастними швами, кишенею-кенгуру та міцною металевою блискавкою.",
    price: 3400,
    image: "duster",
    category: "outerwear",
    sizes: ["S", "M", "L", "XL"],
    tags: ["y2k", "hoodie", "grunge"],
    stock: 9,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: -10,
    mannequinScale: 1.15
  },
  {
    id: "prod-2",
    name: "SGB // DISTRESSED SWEATER DECAY",
    description: "В'язаний светр вільного аутфіту зі спущеними петлями та фактурними порізами вздовж кантів у стилі нульових.",
    price: 2400,
    image: "sweater",
    category: "top",
    sizes: ["M", "L", "XL"],
    tags: ["distressed", "knitwear", "indie"],
    stock: 15,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: 15,
    mannequinScale: 1.05
  },
  {
    id: "prod-3",
    name: "SGB // LOW-RISE CARGO JEANS",
    description: "Широкі джинси мішкоподібного покрою з заниженою талією, накладними бічними кишенями та металевою фурнітурою.",
    price: 3600,
    image: "cargo",
    category: "bottom",
    sizes: ["S", "M", "L"],
    tags: ["denim", "cargo", "y2k"],
    stock: 7,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: 65,
    mannequinScale: 1.0
  },
  {
    id: "prod-4",
    name: "SGB // CHUNKY RETRO KICKS",
    description: "Важкі шкіряні кеди у стилі нульових років на посиленій амортизуючій підошві з широкими шнурками.",
    price: 4900,
    image: "boots",
    category: "shoes",
    sizes: ["40", "41", "42", "43", "44"],
    tags: ["shoes", "chunky", "indie"],
    stock: 6,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: 120,
    mannequinScale: 0.95
  },
  {
    id: "prod-5",
    name: "SGB // CHOKER CROSS COLLAR",
    description: "Чорний шкіряний матовий чокер з класичним срібним готичним хрестом.",
    price: 1200,
    image: "sunglasses",
    category: "accessories",
    sizes: ["OS"],
    tags: ["goth", "accessories"],
    stock: 22,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: -25,
    mannequinScale: 0.4
  },
  {
    id: "prod-6",
    name: "SGB // GRAPHIC PRINT MESH",
    description: "Напівпрозора сітчаста кофта з абстрактним димчастим темним принтом та подовженими рукавами.",
    price: 1800,
    image: "outerwear",
    category: "top",
    sizes: ["M", "L", "XL"],
    tags: ["mesh", "indie-sleaze"],
    stock: 11,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: -5,
    mannequinScale: 1.08
  },
  {
    id: "prod-7",
    name: "SGB // SKULL COTTON TSHIRT",
    description: "Футболка вільного крою із вицвілої важкої бавовни з великим графічним вінтажним принтом черепа.",
    price: 1900,
    image: "tee",
    category: "top",
    sizes: ["S", "M", "L", "XL"],
    tags: ["tshirt", "skull", "grunge"],
    stock: 18,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: 18,
    mannequinScale: 1.0
  },
  {
    id: "prod-8",
    name: "SGB // NYLON BODYPACK ZIP",
    description: "Ергономічна сумка на одне плече з широким регульованим лямочним ременем та кишенями на замках.",
    price: 2100,
    image: "bag",
    category: "accessories",
    sizes: ["OS"],
    tags: ["bag", "tech"],
    stock: 8,
    riddickRating: "COLLECTION 2026",
    mannequinYOffset: 30,
    mannequinScale: 0.7
  }
];

// Pre-seeded Ukrainian Cities for Nova Poshta & Ukrposhta calculations
const UKRAINIAN_CITIES = [
  { id: "c-1", name: "Київ", region: "Київська", deliveryCostBase: 70, days: 1 },
  { id: "c-2", name: "Львів", region: "Львівська", deliveryCostBase: 80, days: 1 },
  { id: "c-3", name: "Одеса", region: "Одеська", deliveryCostBase: 80, days: 1 },
  { id: "c-4", name: "Харків", region: "Харківська", deliveryCostBase: 85, days: 2 },
  { id: "c-5", name: "Дніпро", region: "Дніпропетровська", deliveryCostBase: 80, days: 1 },
  { id: "c-6", name: "Запоріжжя", region: "Запорізька", deliveryCostBase: 85, days: 2 },
  { id: "c-7", name: "Івано-Франківськ", region: "Івано-Франківська", deliveryCostBase: 80, days: 1 },
  { id: "c-8", name: "Тернопіль", region: "Тернопільська", deliveryCostBase: 80, days: 1 },
  { id: "c-9", name: "Луцьк", region: "Волинська", deliveryCostBase: 80, days: 1 },
  { id: "c-10", name: "Рівне", region: "Рівненська", deliveryCostBase: 80, days: 1 },
  { id: "c-11", name: "Чернівці", region: "Чернівецька", deliveryCostBase: 85, days: 2 },
  { id: "c-12", name: "Хмельницький", region: "Хмельницька", deliveryCostBase: 80, days: 1 },
  { id: "c-13", name: "Житомир", region: "Житомирська", deliveryCostBase: 75, days: 1 },
  { id: "c-14", name: "Вінниця", region: "Вінницька", deliveryCostBase: 75, days: 1 },
  { id: "c-15", name: "Черкаси", region: "Черкаська", deliveryCostBase: 75, days: 1 },
  { id: "c-16", name: "Кропивницький", region: "Кіровоградська", deliveryCostBase: 80, days: 1 },
  { id: "c-17", name: "Полтава", region: "Полтавська", deliveryCostBase: 80, days: 1 },
  { id: "c-18", name: "Суми", region: "Сумська", deliveryCostBase: 85, days: 2 },
  { id: "c-19", name: "Чернігів", region: "Чернігівська", deliveryCostBase: 75, days: 1 },
  { id: "c-20", name: "Миколаїв", region: "Миколаївська", deliveryCostBase: 80, days: 1 },
  { id: "c-21", name: "Херсон", region: "Херсонська", deliveryCostBase: 90, days: 2 },
  { id: "c-22", name: "Ужгород", region: "Закарпатська", deliveryCostBase: 90, days: 2 },
  { id: "c-23", name: "Бровари", region: "Київська", deliveryCostBase: 60, days: 1 },
  { id: "c-24", name: "Кривий Ріг", region: "Дніпропетровська", deliveryCostBase: 80, days: 1 },
  { id: "c-25", name: "Маріуполь", region: "Донецька", deliveryCostBase: 100, days: 3 },
  { id: "c-26", name: "Краматорськ", region: "Донецька", deliveryCostBase: 95, days: 2 },
  { id: "c-27", name: "Павлоград", region: "Дніпропетровська", deliveryCostBase: 80, days: 1 }
];

interface TelegramDraft {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  tags: string[];
  imageUrl?: string;
  simulated?: boolean;
  fileId?: string;
}

interface Database {
  products: typeof DEFAULT_PRODUCTS;
  orders: any[];
  telegramDrafts?: TelegramDraft[];
  telegramConfig?: {
    token: string;
    connected: boolean;
    adminChatId?: number;
  };
  visitorCounter?: number;
}

// Ensure local persistence
function readDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file, using empty:", err);
  }
  
  // Create first database
  const initial: Database = {
    products: DEFAULT_PRODUCTS,
    orders: [],
    telegramDrafts: [],
    telegramConfig: {
      token: "",
      connected: false
    }
  };
  writeDB(initial);
  return initial;
}

async function syncFromFirestore(db: Database): Promise<Database> {
  if (!firestoreDb) return db;
  try {
    console.log("Syncing database tables from Google Cloud Firestore...");

    // 1. Sync Products
    const productsSnapshot = await firestoreDb.collection("products").get();
    if (!productsSnapshot.empty) {
      const dbProducts: any[] = [];
      productsSnapshot.forEach((doc: any) => {
        dbProducts.push(doc.data());
      });
      db.products = dbProducts;
      console.log(`Loaded ${dbProducts.length} products from Firestore.`);
    } else {
      console.log("Firestore products collection is empty. Seeding defaults...");
      for (const p of db.products) {
        await firestoreDb.collection("products").doc(p.id).set(p);
      }
    }

    // 2. Sync Orders
    const ordersSnapshot = await firestoreDb.collection("orders").get();
    if (!ordersSnapshot.empty) {
      const dbOrders: any[] = [];
      ordersSnapshot.forEach((doc: any) => {
        dbOrders.push(doc.data());
      });
      db.orders = dbOrders;
      console.log(`Loaded ${dbOrders.length} orders from Firestore.`);
    } else if (db.orders && db.orders.length > 0) {
      console.log("Seeding existing local orders to Firestore...");
      for (const o of db.orders) {
        await firestoreDb.collection("orders").doc(o.id).set(o);
      }
    }

    // 3. Sync TelegramDrafts
    const draftsSnapshot = await firestoreDb.collection("telegramDrafts").get();
    if (!draftsSnapshot.empty) {
      const dbDrafts: any[] = [];
      draftsSnapshot.forEach((doc: any) => {
        dbDrafts.push(doc.data());
      });
      db.telegramDrafts = dbDrafts;
      console.log(`Loaded ${dbDrafts.length} telegram drafts from Firestore.`);
    } else if (db.telegramDrafts && db.telegramDrafts.length > 0) {
      console.log("Seeding existing local telegram drafts to Firestore...");
      for (const d of db.telegramDrafts) {
        await firestoreDb.collection("telegramDrafts").doc(d.id).set(d);
      }
    }

    // 4. Sync TelegramConfig
    const configDoc = await firestoreDb.collection("config").doc("telegramConfig").get();
    if (configDoc.exists) {
      db.telegramConfig = configDoc.data();
      console.log("Loaded telegram config from Firestore:", db.telegramConfig);
    } else if (db.telegramConfig) {
      await firestoreDb.collection("config").doc("telegramConfig").set(db.telegramConfig);
    }

    // 5. Sync VisitorCounter
    const counterDoc = await firestoreDb.collection("config").doc("visitorCounter").get();
    if (counterDoc.exists) {
      const data = counterDoc.data();
      db.visitorCounter = data.visitorCounter || 0;
      console.log("Loaded visitor counter from Firestore:", db.visitorCounter);
    } else if (typeof db.visitorCounter !== "undefined") {
      await firestoreDb.collection("config").doc("visitorCounter").set({ visitorCounter: db.visitorCounter });
    }

    // Capture the state locally
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error syncing from Firestore:", err);
  }
  return db;
}

async function uploadToStorage(base64OrBuffer: string | Buffer, filename: string, mimeType: string): Promise<string> {
  if (!firestoreDb) {
    console.warn("Storage upload skipped - Firestore/Firebase not initialized.");
    return "";
  }
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("firebase-applet-config.json not found, storage upload skipped.");
      return "";
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const bucketName = firebaseConfig.storageBucket;
    if (!bucketName) {
      console.warn("storageBucket not configured in firebase-applet-config.json, storage upload skipped.");
      return "";
    }

    const bucket = (admin as any).storage().bucket(bucketName);
    const file = bucket.file(`uploaded_photos/${filename}`);
    
    let buffer: Buffer;
    if (typeof base64OrBuffer === "string") {
      let cleanBase64 = base64OrBuffer;
      if (base64OrBuffer.startsWith("data:")) {
        cleanBase64 = base64OrBuffer.split(",")[1];
      }
      buffer = Buffer.from(cleanBase64, "base64");
    } else {
      buffer = base64OrBuffer;
    }

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file publicly accessible
    try {
      await file.makePublic();
    } catch (pubErr) {
      console.warn("Failed to set makePublic directly, fallback to default public URL", pubErr);
    }

    // Standard Google Cloud Storage/Firebase URL structure:
    const encodedPath = encodeURIComponent(`uploaded_photos/${filename}`);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
    console.log("Uploaded successfully to Firebase Storage. URL:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("Firebase Storage Upload Error:", err);
    return "";
  }
}

async function syncToFirestore(db: Database) {
  if (!firestoreDb) return;
  try {
    // Self-healing: Automatically migrate any bloated Base64 strings to lightweight Firebase Storage URLs
    for (const p of db.products as any[]) {
      if (p.image && p.image.startsWith("data:")) {
        try {
          const match = p.image.match(/^data:([^;]+);base64,/);
          const mime = match ? match[1] : "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          const filename = `product_migrated_${p.id}_${Date.now()}.${ext}`;
          console.log(`Migrating product ${p.id} image from base64 to Firebase Storage...`);
          const url = await uploadToStorage(p.image, filename, mime);
          if (url) {
            p.image = url;
          }
        } catch (migErr) {
          console.error(`Failed to migrate product ${p.id} image:`, migErr);
        }
      }
      if (p.telegramImage && p.telegramImage.startsWith("data:")) {
        try {
          const match = p.telegramImage.match(/^data:([^;]+);base64,/);
          const mime = match ? match[1] : "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          const filename = `product_migrated_tg_${p.id}_${Date.now()}.${ext}`;
          const url = await uploadToStorage(p.telegramImage, filename, mime);
          if (url) {
            p.telegramImage = url;
          }
        } catch (migErr) {
          console.error(`Failed to migrate product ${p.id} telegramImage:`, migErr);
        }
      }
    }

    if (db.telegramDrafts && Array.isArray(db.telegramDrafts)) {
      for (const d of db.telegramDrafts) {
        if (d.imageUrl && d.imageUrl.startsWith("data:")) {
          try {
            const match = d.imageUrl.match(/^data:([^;]+);base64,/);
            const mime = match ? match[1] : "image/jpeg";
            const ext = mime.split("/")[1] || "jpg";
            const filename = `draft_migrated_${d.id}_${Date.now()}.${ext}`;
            console.log(`Migrating draft ${d.id} image from base64 to Firebase Storage...`);
            const url = await uploadToStorage(d.imageUrl, filename, mime);
            if (url) {
              d.imageUrl = url;
            }
          } catch (migErr) {
            console.error(`Failed to migrate draft ${d.id} image:`, migErr);
          }
        }
      }
    }

    // 1. Sync Products (overwriting or aligning)
    const productsSnapshot = await firestoreDb.collection("products").get();
    const existingIds = new Set(db.products.map(p => p.id));
    
    // Delete removed products
    const deletePromises: Promise<any>[] = [];
    productsSnapshot.forEach((doc: any) => {
      if (!existingIds.has(doc.id)) {
        deletePromises.push(doc.ref.delete());
      }
    });
    await Promise.all(deletePromises);

    // Save/update existing products
    const productPromises = db.products.map(p => {
      return firestoreDb.collection("products").doc(p.id).set(p);
    });
    await Promise.all(productPromises);

    // 2. Sync Orders
    const ordersSnapshot = await firestoreDb.collection("orders").get();
    const existingOrderIds = new Set(db.orders.map(o => o.id));
    const deleteOrderPromises: Promise<any>[] = [];
    ordersSnapshot.forEach((doc: any) => {
      if (!existingOrderIds.has(doc.id)) {
        deleteOrderPromises.push(doc.ref.delete());
      }
    });
    await Promise.all(deleteOrderPromises);

    const orderPromises = db.orders.map(o => {
      return firestoreDb.collection("orders").doc(o.id).set(o);
    });
    await Promise.all(orderPromises);

    // 3. Sync TelegramDrafts
    const draftsSnapshot = await firestoreDb.collection("telegramDrafts").get();
    const existingDraftIds = new Set((db.telegramDrafts || []).map(d => d.id));
    const deleteDraftPromises: Promise<any>[] = [];
    draftsSnapshot.forEach((doc: any) => {
      if (!existingDraftIds.has(doc.id)) {
        deleteDraftPromises.push(doc.ref.delete());
      }
    });
    await Promise.all(deleteDraftPromises);

    const draftPromises = (db.telegramDrafts || []).map(d => {
      return firestoreDb.collection("telegramDrafts").doc(d.id).set(d);
    });
    await Promise.all(draftPromises);

    // 4. Sync TelegramConfig
    if (db.telegramConfig) {
      await firestoreDb.collection("config").doc("telegramConfig").set(db.telegramConfig);
    }

    // 5. Sync VisitorCounter
    if (typeof db.visitorCounter !== "undefined") {
      await firestoreDb.collection("config").doc("visitorCounter").set({ visitorCounter: db.visitorCounter });
    }

    console.log("Successfully synchronized all entities to Google Cloud Firestore.");
  } catch (err) {
    console.error("Error synchronizing to Firestore:", err);
  }
}

function writeDB(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    // Background cloud replication
    syncToFirestore(db).catch(err => {
      console.error("Background Firestore sync failed:", err);
    });
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}

function convertLocalProductsAndDraftsToBase64(db: Database) {
  let changed = false;

  const toB64 = (filePath: string): string | null => {
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mime = "image/jpeg";
        if (ext === ".png") mime = "image/png";
        else if (ext === ".webp") mime = "image/webp";
        return `data:${mime};base64,${data.toString("base64")}`;
      } catch (e) {
        console.error(`Error reading for base64: ${filePath}`, e);
      }
    }
    return null;
  };

  if (db.products && Array.isArray(db.products)) {
    db.products.forEach((p: any) => {
      // Decode image paths
      if (p.image && !p.image.startsWith("data:") && !p.image.startsWith("http")) {
        let filename = path.basename(p.image.split('?')[0]);
        // If it was just a label like "duster"
        if (!filename.includes(".") && !p.image.startsWith("/")) {
          const cat = (p.category || "").toLowerCase();
          const sum = (p.id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          let idx = 21;
          if (cat.includes("bottom") || cat.includes("pant") || cat.includes("jean")) {
            const pants = [3, 9];
            idx = pants[sum % pants.length];
          } else if (cat.includes("accessories") || cat.includes("accessory") || cat.includes("choker") || cat.includes("bag")) {
            const accs = [5, 8, 21];
            idx = accs[sum % accs.length];
          } else if (cat.includes("shoes") || cat.includes("boot") || cat.includes("kick")) {
            const shoes = [21, 3];
            idx = shoes[sum % shoes.length];
          } else {
            const tops = [4, 6, 7, 8];
            idx = tops[sum % tops.length];
          }
          filename = `item_${idx}.jpg`;
        }

        let fullPath = path.join(process.cwd(), "public/goods", filename);
        if (!fs.existsSync(fullPath)) {
          fullPath = path.join(process.cwd(), "public/goods_processed", filename);
        }

        const b64 = toB64(fullPath);
        if (b64) {
          p.image = b64;
          changed = true;
        }
      }

      if (p.telegramImage && !p.telegramImage.startsWith("data:") && !p.telegramImage.startsWith("http")) {
        const filename = path.basename(p.telegramImage.split('?')[0]);
        let fullPath = path.join(process.cwd(), "public/goods", filename);
        if (!fs.existsSync(fullPath)) {
          fullPath = path.join(process.cwd(), "public/goods_processed", filename);
        }

        const b64 = toB64(fullPath);
        if (b64) {
          p.telegramImage = b64;
          changed = true;
        }
      }
    });
  }

  if (db.telegramDrafts && Array.isArray(db.telegramDrafts)) {
    db.telegramDrafts.forEach((d: any) => {
      if (d.imageUrl && !d.imageUrl.startsWith("data:") && !d.imageUrl.startsWith("http")) {
        const filename = path.basename(d.imageUrl.split('?')[0]);
        let fullPath = path.join(process.cwd(), "public/goods", filename);
        if (!fs.existsSync(fullPath)) {
          fullPath = path.join(process.cwd(), "public/goods_processed", filename);
        }

        const b64 = toB64(fullPath);
        if (b64) {
          d.imageUrl = b64;
          changed = true;
        }
      }
    });
  }

  if (changed) {
    console.log("Automatically converted local paths to base64 embedded assets inside void_archive_db.json");
    writeDB(db);
  }
}

function moveGoodsFileToProcessed(imageUrl: string) {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl.split('?')[0]);
  const srcPath = path.join(process.cwd(), "public/goods", filename);
  const destDir = path.join(process.cwd(), "public/goods_processed");
  const destPath = path.join(destDir, filename);

  if (fs.existsSync(srcPath)) {
    try {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(srcPath, destPath);
      console.log(`Physically relocated ${filename} to public/goods_processed`);
    } catch (err) {
      console.error(`Error moving file ${filename} to processed folder:`, err);
    }
  }
}

async function sendTelegramNotification(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log(`[Telegram Simulation] Config not set in environment. Message content:\n${text}`);
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    if (!response.ok) {
      console.error("Telegram Bot Message Send Failed:", await response.text());
    } else {
      console.log("Telegram notification sent successfully.");
    }
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Dynamic, custom-themed Gothic/Y2K alternative visual placeholder generator for empty (0-byte) image uploads
  const serveGoodsFile = (req: any, res: any) => {
    const filename = req.params.filename;
    let filePath = path.join(process.cwd(), "public/goods", filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), "public/goods_processed", filename);
    }
    
    let usePlaceholder = false;
    if (!fs.existsSync(filePath)) {
      usePlaceholder = true;
    } else {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        usePlaceholder = true;
      }
    }

    if (usePlaceholder) {
      // Lazy load DB dynamically to get correct metadata
      const currentDb = readDB();
      const matchedDraft = (currentDb.telegramDrafts || []).find((d: any) => d.imageUrl && (d.imageUrl.includes(filename) || d.imageUrl.includes(encodeURIComponent(filename))));
      const matchedProduct = (currentDb.products || []).find((p: any) => 
        (p.image && (p.image.includes(filename) || p.image.includes(encodeURIComponent(filename)))) || 
        (p.telegramImage && (p.telegramImage.includes(filename) || p.telegramImage.includes(encodeURIComponent(filename))))
      );

      const name = matchedDraft?.name || matchedProduct?.name || filename;
      const category = matchedDraft?.category || matchedProduct?.category || "outerwear";

      const cleanCategory = (category || "unknown").toUpperCase();
      const cleanName = (name || "SECUM SPECIAL").toUpperCase().replace(/\.[^/.]+$/, "").replace(/_/g, " ");

      // Category icon decoding
      let categoryIcon = "🧥";
      if (cleanCategory.includes("TOP") || cleanCategory.includes("SHIRT") || cleanCategory.includes("TEE")) categoryIcon = "👕";
      if (cleanCategory.includes("BOTTOM") || cleanCategory.includes("JEAN") || cleanCategory.includes("PANT")) categoryIcon = "👖";
      if (cleanCategory.includes("SHOE") || cleanCategory.includes("BOOT") || cleanCategory.includes("KICK") || cleanCategory.includes("PLATFORM")) categoryIcon = "🥾";
      if (cleanCategory.includes("ACCESSOR") || cleanCategory.includes("BAG") || cleanCategory.includes("GLASS") || cleanCategory.includes("CHOKER")) categoryIcon = "🕶";

      const digitMatch = filename.match(/\d+/);
      const cleanId = digitMatch ? digitMatch[0] : "0" + Math.floor(Math.random() * 900 + 100);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#121212" />
      <stop offset="100%" stop-color="#050505" />
    </radialGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#222222" stroke-width="0.5" />
    </pattern>
  </defs>
  
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />
  
  <path d="M 40 440 L 40 100 Q 200 40 360 L 360 440 Z" fill="none" stroke="#222222" stroke-width="1.5" />
  <path d="M 50 430 L 50 110 Q 200 55 350 L 350 430 Z" fill="none" stroke="#8a0303" stroke-width="0.75" opacity="0.5" />
  
  <g opacity="0.12" transform="translate(200, 220) scale(1.6)">
    <path d="M -4 -30 L 4 -30 L 4 -10 L 24 -10 L 24 -2 L 4 -2 L 4 30 L -4 30 L -4 -2 L -24 -2 L -24 -10 L -4 -10 Z" fill="#8a0303" />
  </g>
  
  <g transform="translate(200, 190) scale(1.8)">
    <circle cx="0" cy="0" r="22" fill="#020202" stroke="#333333" stroke-width="1" />
    <circle cx="0" cy="0" r="19" fill="none" stroke="#8a0303" stroke-dasharray="3 2" stroke-width="0.5" opacity="0.8" />
    <text x="0" y="3" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="#cccccc">${categoryIcon}</text>
  </g>
  
  <text x="200" y="280" font-family="monospace" font-size="8" fill="#8a0303" font-weight="900" letter-spacing="4" text-anchor="middle">✙ SECUM // ARCHIVE // CONCEPT ✙</text>
  <text x="200" y="305" font-family="monospace" font-weight="950" font-size="11" fill="#ffffff" letter-spacing="1" text-anchor="middle">${cleanName}</text>
  <text x="200" y="325" font-family="monospace" font-size="8" fill="#666666" letter-spacing="2" text-anchor="middle">CATEGORY // ${cleanCategory}</text>
  
  <line x1="140" y1="350" x2="260" y2="350" stroke="#222222" stroke-width="1" />
  
  <text x="55" y="415" font-family="monospace" font-size="6.5" fill="#444444">CODE: SECUM_${cleanId}</text>
  <text x="345" y="415" font-family="monospace" font-size="6.5" fill="#444444" text-anchor="end">✙ ALT CLOTHING CAD ✙</text>
</svg>`;

      res.setHeader("Content-Type", "image/svg+xml");
      return res.status(200).send(svg);
    }

    return res.sendFile(filePath);
  };

  app.get("/goods/:filename", serveGoodsFile);
  app.get("/public/goods/:filename", serveGoodsFile);
  app.get("/goods_processed/:filename", serveGoodsFile);
  app.get("/public/goods_processed/:filename", serveGoodsFile);

  // Initialize DB helper
  let dbObj = readDB();

  // Async load state from Google Cloud Firestore
  dbObj = await syncFromFirestore(dbObj);

  // Convert local paths to Base64 after loading from local or Firestore
  convertLocalProductsAndDraftsToBase64(dbObj);

  // Shared Gemini client setup using recommended structure and User-Agent
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }



  // Gemini image and prompt classifier
  async function analyzeImageWithGemini(base64Data: string, mimeType: string, userCaption: string) {
    if (!ai || base64Data === "MOCK_BASE64") {
      return getFallbackAIGeneratedProduct(userCaption);
    }
    try {
      const prompt = `
        You are the primary digital garment scanner and data modeler for SGB Apparel Co.
        An image has been uploaded representing a clothes item.
        
        Perform an EXTREMELY DEEP AND DETAILED VISUAL ANALYSIS of the item in the photo to classify it perfectly.
        
        Detailed Classification Instructions:
        1. Classify the item from the photo and generate a clean, descriptive catalog name strictly in Ukrainian, in lowercase (e.g., "буткат джинси сині", "топік сірий в смужку", "оверсайз зіп-худі чорне", "замшеві кеди чорні на платформі").
           - Under no circumstances use English upper-case or "SGB // " prefixes for the name field. It MUST be purely in lowercase, natural, human-crafted Ukrainian language based on the item's colors, fit, and style.
        2. Write an EXTREMELY DRY, SIMPLE AND SHORT physical description of the garment in Ukrainian (strictly maximum 1-2 short sentences / 10 words maximum).
           - Do NOT include any technical lists, bullet points, raw specifications, fabrics density, stitching types, or parameters inside the description. Keep it extremely plain.
           - Examples of acceptable descriptions: "Буткат джинси", "Оверсайз зіп-худі чорного кольору", "Демісезонна куртка з хутряним коміром", "Ребристий трикотажний лонгслів".
           - ONLY describe standout/prominent alternative/Y2K visual details in very rare cases (e.g., "кофточка в смужку y2k" or "шорти з металевими кільцями та шпильками").
           - STRICT CONSTRAINT ON ADJECTIVES: Strictly forbid any creative, designy, gothic, poetic, promotional, premium, or aesthetic buzzwords (e.g., do NOT use dark, void, mystic, gothic, vampire, savior, rebel, shadows, sacred, premium, luxury, alternative, grunge, high-fashion, high-quality, Y2K, vintage, unique).
        3. Determine Category mapping strictly to one of: "outerwear", "top", "bottom", "shoes", or "accessories".
           CRITICAL CATEGORIZATION DECISION DIRECTIVES:
           - "outerwear": ALL jackets, coats, bombers, windbreakers, puffers, blazers, cardigans, heavy shearling/fleece jackets, zip-up warm hoodies. If there is a full front zipper or button closure and it is designed to be worn over tops or keeps you warm outside, it MUST be mapped to "outerwear". Never classify any jacket or coat as "accessories" or "top".
           - "top": T-shirts, regular hoodies (pullovers without front full-zipper), long-sleeves, sweaters, vests, shirts, crop tops.
           - "bottom": Jeans, pants, cargos, trousers, shorts, joggers, skirts.
           - "shoes": Boots, sneakers, slippers, footwear.
           - "accessories": Bags, hats, caps, beanies, glasses, chokers, belts, chains, jewelry, socks. NEVER map any actual clothing garment (top, bottoms, outerwear/jackets) to accessories just because you are unsure!
        4. Determine Gender cut/style: is it men's wear ("чоловічий крій"), women's wear ("жіночий крій"), or unisex ("унісекс")? Translate this into tags.
        5. Suggest a rational retail price in Ukrainian Hryvnia (UAH) as a round integer (multiples of 50 or 100, e.g., 2900 or 3400).
        6. Recommend a realistic size array (e.g., ["S", "M", "L", "XL"] for regular items, shoes sizing like ["40", "41", "42", "43", "44"] or ["OS"] for accessories).
        7. Assign detailed style and type tags from Ukrainian and English to allow precise filtering (e.g., ["штани", "оверсайз", "чоловіче", "жіноче", "унісекс", "топи", "шорти", "взуття", "утилітарний", "вуличний", "oversize", "utility", "minimalism", "casual", "unisex", "pants", "shorts", "hoodie", "top", "menswear", "womenswear"]).
        
        STRICT RULE: Do NOT append any phrase like 'imported from Telegram', 'imported from photo', or 'photo_*.jpg' or any metadata to the end of the name or description. Both fields must remain perfectly clean, plain, and human-crafted in appearance.

        Optional notes/caption from the user uploading the image override or assist values if they contain explicit price, details, or size:
        "${userCaption}"
        
        Return the response strictly as a valid JSON matching this schema:
        {
          "name": string,
          "description": string,
          "category": string,
          "price": number,
          "sizes": [string],
          "tags": [string]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              price: { type: Type.INTEGER },
              sizes: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "description", "category", "price", "sizes", "tags"]
          }
        }
      });

      const responseText = response.text ? response.text.trim() : "{}";
      return JSON.parse(responseText);
    } catch (err) {
      console.error("Gemini Telegram analysis failed, using fallback:", err);
      return getFallbackAIGeneratedProduct(userCaption);
    }
  }

  function getFallbackAIGeneratedProduct(userCaption: string) {
    const captionLower = (userCaption || "").toLowerCase();
    let price = 2900;
    const matchPrice = captionLower.match(/(\d+)/);
    if (matchPrice) {
      price = Number(matchPrice[1]);
    }
    
    let sizes = ["S", "M", "L", "XL"];
    if (captionLower.includes("os") || captionLower.includes("оу") || captionLower.includes("size")) {
      sizes = ["OS"];
    } else if (captionLower.includes("взу") || captionLower.includes("чере") || captionLower.includes("кед") || captionLower.includes("крос")) {
      sizes = ["40", "41", "42", "43", "44"];
    }
    
    let category = "outerwear";
    if (captionLower.includes("шт") || captionLower.includes("джи") || captionLower.includes("кар")) {
      category = "bottom";
    } else if (captionLower.includes("фут") || captionLower.includes("май") || captionLower.includes("све") || captionLower.includes("лон") || captionLower.includes("худі") || captionLower.includes("худи")) {
      category = "top";
    } else if (captionLower.includes("взу") || captionLower.includes("чере") || captionLower.includes("кед") || captionLower.includes("крос")) {
      category = "shoes";
    } else if (captionLower.includes("оку") || captionLower.includes("сук") || captionLower.includes("сум") || captionLower.includes("лан") || captionLower.includes("рем")) {
      category = "accessories";
    }
    
    let name = "зіп-худі чорне оверсайз";
    if (category === "bottom") name = "буткат джинси сині";
    else if (category === "top") name = "топік сірий в смужку";
    else if (category === "shoes") name = "черевики замшеві чорні";
    else if (category === "accessories") name = "тактичний ремінь нейлоновий";

    const descTemplates = [
      "Вільний силует, щільна бавовна.",
      "Оверсайз крой з еластичними манжетами.",
      "Зносостійкий матеріал з металевою фурнітурою."
    ];
    let description = descTemplates[Math.floor(Math.random() * descTemplates.length)];
    if (userCaption) {
      description = userCaption.trim();
    }

    return {
      name,
      description,
      category,
      price,
      sizes,
      tags: ["oversize", "utility", "minimalism", "casual"]
    };
  }



  app.post("/api/telegram-drafts/:id/price", (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
    const drafts = dbObj.telegramDrafts || [];
    const draft = drafts.find((d: any) => d.id === id);
    if (draft) {
      draft.price = Number(price);
      writeDB(dbObj);
      res.json(draft);
    } else {
      res.status(404).json({ error: "Draft not found" });
    }
  });

  app.post("/api/process-goods", async (req, res) => {
    try {
      const goodsDir = path.join(process.cwd(), "public/goods");
      if (!fs.existsSync(goodsDir)) {
        fs.mkdirSync(goodsDir, { recursive: true });
        return res.json({ message: "Created empty goods dir. No files to process.", processedCount: 0, drafts: [] });
      }

      const files = fs.readdirSync(goodsDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
      });

      if (files.length === 0) {
        return res.json({ message: "No static files found in public/goods path.", processedCount: 0, drafts: [] });
      }

      dbObj.telegramDrafts = dbObj.telegramDrafts || [];
      dbObj.products = dbObj.products || [];

      const newlyProcessed: any[] = [];

      for (const file of files) {
        // Prevent duplicate imports by checking if any draft/product refers to this file
        const isAlreadyDrafted = dbObj.telegramDrafts.some((d: any) => 
          (d.imageUrl && (d.imageUrl.includes(file) || d.imageUrl.includes(encodeURIComponent(file))))
        );
        const isAlreadyPublished = dbObj.products.some((p: any) => 
          (p.image && (p.image.includes(file) || p.image.includes(encodeURIComponent(file)))) ||
          (p.telegramImage && (p.telegramImage.includes(file) || p.telegramImage.includes(encodeURIComponent(file))))
        );

        if (isAlreadyDrafted || isAlreadyPublished) {
          continue; // skip already processed image
        }

        const filePath = path.join(goodsDir, file);
        const stats = fs.statSync(filePath);
        const fileHash = file.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

        let parsed: any = null;

        // Try utilizing real Gemini API.
        if (stats.size > 0 && ai && process.env.GEMINI_API_KEY) {
          try {
            // Delay by 4000ms sequentially to strictly secure a highly precise, deep AI scan per item
            // preventing prompt 429 Rate Limit issues on mass imports
            await new Promise(r => setTimeout(r, 4200));

            const base64Data = fs.readFileSync(filePath, { encoding: "base64" });
            const pMime = file.endsWith(".png") ? "image/png" : "image/jpeg";

            // Scan using our ultra-premium customized specifications engine
            parsed = await analyzeImageWithGemini(base64Data, pMime, "Преміум деконструйований одяг SGB SECUM.");
          } catch (gemIniErr) {
            console.error(`Gemini failed to analyze ${file}:`, gemIniErr);
          }
        }

        // High-quality gothic Y2K fallback generators for 0-byte placeholders or failed states
        if (!parsed) {
          const fallbackNames = [
            "зіп-худі чорне оверсайз",
            "рвані джинси дестроєр",
            "сітчастий лонгслів чорний",
            "готична портупея з кільцями",
            "кеди масивні чорні",
            "зимовий бомбер оверсайз",
            "тактична куртка вітровка",
            "широкі штани карго",
            "оверсайз футболка з принтом",
            "в'язаний светр дистрес"
          ];

          const fallbackDescriptions = [
            "Об'ємне важке зіп-худі вільного силуету з фресковими принтами та контрастним вишивним швом. Преміум бавовна.",
            "Денім з унікальним ручним дестроєм, срібними заклепками та фірмовою деструкцією країв у стилі нульових.",
            "Текстурована напівпрозора сітка з димчасто-чорним готичним принтом. Створено для поєднання з важким металом.",
            "Широкі альтернативні штани-карго вільного крою з ременями, металевими кільцями та шнурівкою."
          ];

          const fallbackCategories = ["outerwear", "top", "bottom", "shoes", "accessories"];

          const name = fallbackNames[fileHash % fallbackNames.length];
          const description = fallbackDescriptions[fileHash % fallbackDescriptions.length];
          const price = 1500 + (fileHash % 31) * 100; // 1500 to 4500
          const category = fallbackCategories[fileHash % fallbackCategories.length];
          const sizes = (fileHash % 2 === 0) ? ["S", "M", "L"] : ["M", "L", "XL"];
          const tags = ["secum", "import", "alternative"];

          parsed = { name, description, price, category, sizes, tags };
        }

        // Convert to storage URL immediately for persistence
        let base64Image = `/goods/${file}`;
        try {
          const fileContent = fs.readFileSync(filePath);
          const fileMime = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
          const storageUrl = await uploadToStorage(fileContent, `imported_${Date.now()}_${file}`, fileMime);
          if (storageUrl) {
            base64Image = storageUrl;
          } else {
            base64Image = `data:${fileMime};base64,${fileContent.toString("base64")}`;
          }
        } catch (e) {
          console.error(`Error encoding image during folder import: ${file}`, e);
        }

        const newDraft = {
          id: "draft-imported-" + Date.now() + "-" + fileHash,
          name: (parsed.name || "Невідомий виріб").toUpperCase(),
          description: parsed.description || "Концептуальний виріб альтернативного стилю SGB SECUM.",
          price: Number(parsed.price) || 2800,
          imageUrl: base64Image,
          category: parsed.category || "outerwear",
          sizes: parsed.sizes && Array.isArray(parsed.sizes) ? parsed.sizes : ["OS"],
          tags: parsed.tags && Array.isArray(parsed.tags) ? parsed.tags : ["secum-goods"],
          simulated: true,
          telegramChatId: "goods-folder-import",
          createdAt: new Date().toISOString()
        };

        dbObj.telegramDrafts.unshift(newDraft);
        newlyProcessed.push(newDraft);

        // Physically transfer processed photo out of public/goods to public/goods_processed
        const destDir = path.join(process.cwd(), "public/goods_processed");
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const destPath = path.join(destDir, file);
        try {
          fs.renameSync(filePath, destPath);
          console.log(`Relocated processed file ${file} from goods to goods_processed`);
        } catch (renameErr) {
          console.error(`Failed to physically move processed file: ${file}`, renameErr);
        }
      }

      if (newlyProcessed.length > 0) {
        writeDB(dbObj);
      }

      res.status(200).json({
        success: true,
        message: `Обробка завершена! Додано +${newlyProcessed.length} нових чернеток.`,
        processedCount: newlyProcessed.length,
        drafts: newlyProcessed
      });

    } catch (generalErr: any) {
      console.error("General error in process-goods:", generalErr);
      res.status(500).json({ error: generalErr.message || "Bulk processing error" });
    }
  });

  app.post("/api/upload-bulk-drafts", async (req, res) => {
    try {
      const { images } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Немає зображень для завантаження." });
      }

      dbObj.telegramDrafts = dbObj.telegramDrafts || [];
      const newlyProcessed: any[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const base64 = item.base64;
        if (!base64) continue;

        let mimeType = "image/jpeg";
        if (base64.startsWith("data:")) {
          const match = base64.match(/^data:([^;]+);base64,/);
          if (match) {
            mimeType = match[1];
          }
        }
        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");

        let parsed: any = null;
        if (ai && process.env.GEMINI_API_KEY) {
          try {
            // Slight delay to prevent immediate 429 rate limit
            if (i > 0) {
              await new Promise(r => setTimeout(r, 1200));
            }
            parsed = await analyzeImageWithGemini(cleanBase64, mimeType, "Завантажено користувачем через bulk drag'n'drop.");
          } catch (gemErr) {
            console.error("Gemini bulk element failed:", gemErr);
          }
        }

        if (!parsed) {
          parsed = getFallbackAIGeneratedProduct("Завантажено користувачем " + (item.name || "bulk"));
        }

        let finalImageUrl = base64;
        try {
          const match = base64.match(/^data:([^;]+);base64,/);
          const mime = match ? match[1] : "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          const filename = `bulk_upload_${Date.now()}_${i}.${ext}`;
          const url = await uploadToStorage(base64, filename, mime);
          if (url) {
            finalImageUrl = url;
          }
        } catch (e) {
          console.error("Failed to upload bulk item to storage", e);
        }

        const newDraft = {
          id: "draft-bulk-" + Date.now() + "-" + i,
          telegramChatId: 7777,
          fileId: "bulk-file-" + Date.now() + "-" + i,
          name: (parsed.name || "Невідомий виріб").toUpperCase(),
          description: parsed.description || "Річ без опису",
          price: Number(parsed.price) || 2800,
          category: parsed.category || "outerwear",
          imageUrl: finalImageUrl,
          sizes: parsed.sizes && Array.isArray(parsed.sizes) ? parsed.sizes : ["S", "M", "L", "XL"],
          tags: parsed.tags && Array.isArray(parsed.tags) ? parsed.tags : ["secum-bulk"],
          simulated: true,
          createdAt: new Date().toISOString()
        };

        dbObj.telegramDrafts.unshift(newDraft);
        newlyProcessed.push(newDraft);
      }

      writeDB(dbObj);

      res.status(200).json({
        success: true,
        message: `Успішно завантажено та оброблено за допомогою ШІ ${newlyProcessed.length} товарів!`,
        drafts: newlyProcessed
      });

    } catch (err: any) {
      console.error("General error in bulk-upload-drafts:", err);
      res.status(500).json({ error: err.message || "Bulk upload error" });
    }
  });

  app.get("/api/telegram-drafts", (req, res) => {
    res.json(dbObj.telegramDrafts || []);
  });

  app.delete("/api/telegram-drafts/:id", (req, res) => {
    const { id } = req.params;
    dbObj.telegramDrafts = (dbObj.telegramDrafts || []).filter((d: any) => d.id !== id);
    writeDB(dbObj);
    res.json({ success: true, message: "Draft deleted" });
  });

  app.post("/api/telegram-drafts/simulate", async (req, res) => {
    const { base64, caption, templateType } = req.body;
    
    let targetBase64 = base64;
    let mimeType = "image/jpeg";
    
    if (templateType && !base64) {
      mimeType = "image/png";
      targetBase64 = "MOCK_BASE64"; 
    }

    try {
      const analysis = await analyzeImageWithGemini(targetBase64, mimeType, caption || "");
      
      const draftId = "draft-" + Date.now();
      let finalImageUrl = `/src/assets/images/gothic_vampire_fresco_1781371444695.jpg`;
      if (base64 && base64 !== "MOCK_BASE64") {
        const match = base64.match(/^data:([^;]+);base64,/);
        const mime = match ? match[1] : "image/jpeg";
        const ext = mime.split("/")[1] || "jpg";
        const filename = `draft_simulate_${Date.now()}.${ext}`;
        const url = await uploadToStorage(base64, filename, mime);
        if (url) {
          finalImageUrl = url;
        } else {
          finalImageUrl = base64;
        }
      }
        
      const newDraft = {
        id: draftId,
        telegramChatId: 7777,
        fileId: templateType ? `mock-${templateType}-${Date.now()}` : "custom-file-mock",
        name: analysis.name,
        description: analysis.description,
        price: Number(analysis.price) || 2800,
        category: analysis.category || "outerwear",
        sizes: analysis.sizes || ["S", "M", "L", "XL"],
        tags: analysis.tags || ["alt"],
        imageUrl: finalImageUrl,
        createdAt: new Date().toLocaleDateString("uk-UA") + " " + new Date().toLocaleTimeString("uk-UA"),
        simulated: true
      };

      dbObj.telegramDrafts = dbObj.telegramDrafts || [];
      dbObj.telegramDrafts.unshift(newDraft);
      writeDB(dbObj);

      res.status(201).json(newDraft);
    } catch (err) {
      console.error("Simulation Gemini analysis error:", err);
      res.status(500).json({ error: "Analysis connection failed" });
    }
  });

  app.post("/api/telegram-drafts/:id/publish", (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, sizes, tags } = req.body;

    const draftIndex = (dbObj.telegramDrafts || []).findIndex((d: any) => d.id === id);
    if (draftIndex === -1) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const draft = dbObj.telegramDrafts[draftIndex];

    let draftImgUrl = draft.imageUrl;
    if (draftImgUrl && (draftImgUrl.includes("/goods/") || draftImgUrl.includes("/src/goods/") || draftImgUrl.includes("/public/goods/") || draftImgUrl.includes("goods/"))) {
      moveGoodsFileToProcessed(draftImgUrl);
      const fn = path.basename(draftImgUrl.split('?')[0]);
      draftImgUrl = `/goods_processed/${fn}`;
    }

    const finalProduct = {
      id: "prod-" + Date.now(),
      name: (name || draft.name),
      description: description || draft.description,
      price: Number(price || draft.price),
      image: draftImgUrl || category || draft.category || "outerwear",
      telegramImage: draftImgUrl, 
      category: category || draft.category || "outerwear",
      sizes: sizes && Array.isArray(sizes) ? sizes : (draft.sizes || ["OS"]),
      tags: tags && Array.isArray(tags) ? tags : (draft.tags || ["telegram"]),
      stock: 12,
      riddickRating: "TG_BOT_CLASSIFIED",
      mannequinYOffset: 15,
      mannequinScale: 1.0
    };

    dbObj.products.push(finalProduct);
    dbObj.telegramDrafts.splice(draftIndex, 1); // remove from drafts
    writeDB(dbObj);

    res.status(201).json(finalProduct);
  });



  // API Endpoints: Products
  app.get("/api/products", (req, res) => {
    res.json(dbObj.products);
  });

  app.post("/api/products", async (req, res) => {
    const { name, description, price, category, sizes, tags, stock, riddickRating, image } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalImageUrl = image || category || "outerwear";
    if (image && image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,/);
      const mime = match ? match[1] : "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const filename = `product_${Date.now()}.${ext}`;
      const url = await uploadToStorage(image, filename, mime);
      if (url) {
        finalImageUrl = url;
      }
    }

    const newProduct = {
      id: "prod-" + Date.now(),
      name: name,
      description: description || "",
      price: Number(price),
      image: finalImageUrl,
      category,
      sizes: sizes && Array.isArray(sizes) ? sizes : ["OS"],
      tags: tags && Array.isArray(tags) ? tags : ["alt"],
      stock: Number(stock) || 10,
      riddickRating: riddickRating || "STREET_PROOF",
      mannequinYOffset: 15,
      mannequinScale: 1.0
    };

    dbObj.products.push(newProduct);
    writeDB(dbObj);
    res.status(201).json(newProduct);
  });

  app.post("/api/products/import-bulk", async (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Missing products array" });
    }

    const importedProducts = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      let finalImageUrl = p.image || p.category || "outerwear";
      
      if (p.image && p.image.startsWith("data:")) {
        try {
          const match = p.image.match(/^data:([^;]+);base64,/);
          const mime = match ? match[1] : "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          const filename = `product_imported_${Date.now()}_${i}.${ext}`;
          const url = await uploadToStorage(p.image, filename, mime);
          if (url) {
            finalImageUrl = url;
          }
        } catch (e) {
          console.error("Failed uploading bulk image:", e);
        }
      }

      const newProduct = {
        id: "prod-" + (Date.now() + i),
        name: p.name || `Imported Item ${i + 1}`,
        description: p.description || "",
        price: Number(p.price) || 0,
        image: finalImageUrl,
        category: p.category || "top",
        sizes: p.sizes && Array.isArray(p.sizes) ? p.sizes : ["S", "M", "L", "XL"],
        tags: p.tags && Array.isArray(p.tags) ? p.tags : ["imported"],
        stock: Number(p.stock) || 12,
        riddickRating: p.riddickRating || "STREET_PROOF",
        mannequinYOffset: 15,
        mannequinScale: 1.0
      };

      dbObj.products.push(newProduct);
      importedProducts.push(newProduct);
    }

    writeDB(dbObj);
    res.status(201).json(importedProducts);
  });

  app.post("/api/products/analyze-image", async (req, res) => {
    const { base64, caption } = req.body;
    if (!base64) {
      return res.status(400).json({ error: "Missing base64 image data" });
    }

    let mimeType = "image/jpeg";
    if (base64.startsWith("data:")) {
      const match = base64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
      }
    }

    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");

    try {
      const analysis = await analyzeImageWithGemini(cleanBase64, mimeType, caption || "");
      res.json(analysis);
    } catch (err) {
      console.error("Direct image analyze error:", err);
      res.status(500).json({ error: "Не вдалося розпізнати зображення через ШІ." });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    dbObj.products = dbObj.products.filter(p => p.id !== id);
    writeDB(dbObj);
    res.json({ success: true, message: "Product deleted" });
  });

  // Register sequential visitor IDs (1, 2, 3...)
  app.post("/api/visitors/register", (req, res) => {
    if (typeof dbObj.visitorCounter === "undefined") {
      dbObj.visitorCounter = 0;
    }
    dbObj.visitorCounter += 1;
    writeDB(dbObj);
    res.json({ visitorNum: dbObj.visitorCounter });
  });

  // Track product viewing with Visitor ID details
  app.post("/api/track/view-product", (req, res) => {
    const { visitorNum, productName, price } = req.body;
    const trackingMsg = `Захід №${visitorNum || 'unknown'}: Перегляд товару "${productName}" (${price} UAH)`;
    sendTelegramNotification(trackingMsg);
    res.json({ success: true });
  });

  // Track category viewing with Visitor ID details
  app.post("/api/track/view-category", (req, res) => {
    const { visitorNum, category } = req.body;
    const trackingMsg = `Захід №${visitorNum || 'unknown'}: Перегляд категорії "${category}"`;
    sendTelegramNotification(trackingMsg);
    res.json({ success: true });
  });

  // Backup compatibility route
  app.post("/api/products/:id/view", (req, res) => {
    res.json({ success: true });
  });

  // API Endpoints: Orders / CRM
  app.get("/api/orders", (req, res) => {
    res.json(dbObj.orders);
  });

  app.post("/api/orders", (req, res) => {
    const { customer, items, totalPrice, shippingCost } = req.body;
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing order components" });
    }

    // Assign dynamic order status and a tracking code (simulated actual Nova Poshta track-number)
    const orderNumber = "NP-" + Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = "204" + Math.floor(50000000000 + Math.random() * 49999999999);

    const newOrder = {
      id: "ord-" + Date.now(),
      orderNumber,
      customer,
      items,
      totalPrice: Number(totalPrice),
      shippingCost: Number(shippingCost) || 85,
      status: "new",
      trackingNumber,
      date: new Date().toLocaleDateString("uk-UA") + " " + new Date().toLocaleTimeString("uk-UA")
    };

    // Decrease stocks
    items.forEach((item: any) => {
      const match = dbObj.products.find(p => p.id === item.productId);
      if (match) {
        match.stock = Math.max(0, match.stock - item.quantity);
      }
    });

    dbObj.orders.unshift(newOrder);
    writeDB(dbObj);

    // Send dry, concise order notification to Telegram Bot
    const deliveryLabels: Record<string, string> = {
      nova_poshta_office: "Нова Пошта (Відділення)",
      nova_poshta_locker: "Нова Пошта (Поштомат)",
      ukrposhta: "Укрпошта",
      self_pickup: "Самовивіз"
    };

    const paymentLabels: Record<string, string> = {
      card_online: "Картка онлайн",
      cash_on_delivery: "Накладений платіж",
      crypto_ton: "Криптовалюта (TON)"
    };

    let orderMsg = `📦 ЗАМОВЛЕННЯ ${orderNumber}\n\n`;
    orderMsg += `Ім'я: ${customer.fullName || ""}\n`;
    orderMsg += `Телефон: ${customer.phone || ""}\n`;
    if (customer.email) orderMsg += `Email: ${customer.email}\n`;
    if (customer.telegram) orderMsg += `Telegram: ${customer.telegram}\n`;
    
    if (customer.deliveryMethod !== "self_pickup") {
      if (customer.region) orderMsg += `Область: ${customer.region}\n`;
      orderMsg += `Місто: ${customer.city || ""}\n`;
      if (customer.postalCode) orderMsg += `Індекс: ${customer.postalCode}\n`;
    }
    
    orderMsg += `Доставка: ${deliveryLabels[customer.deliveryMethod] || customer.deliveryMethod}\n`;
    if (customer.addressDetails) {
      orderMsg += `Адреса/Відділення: ${customer.addressDetails}\n`;
    }
    
    orderMsg += `Оплата: ${paymentLabels[customer.paymentMethod] || customer.paymentMethod}\n\n`;
    
    orderMsg += `Товари:\n`;
    items.forEach((it: any) => {
      orderMsg += `- ${it.productName} [${it.size}] x${it.quantity} (${it.price} UAH)\n`;
    });
    
    orderMsg += `\nДоставка: ${newOrder.shippingCost} UAH\n`;
    orderMsg += `Сума: ${newOrder.totalPrice} UAH`;

    sendTelegramNotification(orderMsg);

    res.status(201).json(newOrder);
  });

  app.patch("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const orderIndex = dbObj.orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (status) dbObj.orders[orderIndex].status = status;
    if (trackingNumber) dbObj.orders[orderIndex].trackingNumber = trackingNumber;

    writeDB(dbObj);
    res.json(dbObj.orders[orderIndex]);
  });

  // Nova Poshta Lookup endpoints
  app.get("/api/novaposhta/cities", (req, res) => {
    const q = (req.query.q || "").toString().toLowerCase().trim();
    if (!q) {
      return res.json(UKRAINIAN_CITIES.slice(0, 10)); // return top cities
    }

    const filtered = UKRAINIAN_CITIES.filter(
      c => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
    );
    res.json(filtered);
  });

  app.get("/api/novaposhta/branches/:cityId", (req, res) => {
    const { cityId } = req.params;
    const city = UKRAINIAN_CITIES.find(c => c.id === cityId);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    // Generate dynamic branch office lists and postomats list based on the city name to look 100% authentic
    const branches = [];
    const isBig = ["Київ", "Львів", "Одеса", "Харків", "Дніпро"].includes(city.name);
    const officeCount = isBig ? 45 : 12;
    const postomatCount = isBig ? 80 : 20;

    for (let i = 1; i <= officeCount; i++) {
      branches.push({
        id: `branch-${cityId}-${i}`,
        type: "office",
        name: `Відділення №${i}: вул. ${isBig ? 'Шевченка' : 'Лесі Українки'}, ${i * 3 + 2}`,
        description: `До 30 кг, Пн-Нд`
      });
    }

    for (let i = 1; i <= postomatCount; i++) {
      branches.push({
        id: `postomat-${cityId}-${i}`,
        type: "locker",
        name: `Поштомат №${4000 + i}: вул. ${isBig ? 'Бандери' : 'Коновальця'}, ${i * 2 + 1} (АТБ / Сільпо)`,
        description: `До 20 кг, працює цілодобово`
      });
    }

    res.json(branches);
  });

  app.post("/api/novaposhta/calculate", (req, res) => {
    const { cityId, deliveryMethod, items } = req.body;
    const city = UKRAINIAN_CITIES.find(c => c.id === cityId);
    if (!city) {
      return res.json({ shippingCost: 80 });
    }

    let base = city.deliveryCostBase;

    // Adjust based on method
    if (deliveryMethod === "nova_poshta_locker") {
      base -= 10; // Locker is slightly cheaper in Ukraine
    } else if (deliveryMethod === "ukrposhta") {
      base = Math.floor(base * 0.65); // Ukrposhta is cheaper
    } else if (deliveryMethod === "self_pickup") {
      return res.json({ shippingCost: 0, days: 0 });
    }

    // Adjust based on weight (outerwear adds price, accessories normal)
    let weightAdd = 0;
    if (items && Array.isArray(items)) {
      items.forEach((item: any) => {
        const prod = dbObj.products.find(p => p.id === item.productId);
        if (prod) {
          if (prod.category === "outerwear" || prod.category === "shoes") {
            weightAdd += 15 * item.quantity;
          } else {
            weightAdd += 5 * item.quantity;
          }
        }
      });
    }

    res.json({
      shippingCost: base + weightAdd,
      days: city.days
    });
  });

  // Neural Stylist Recommendations using Gemini SDK
  app.post("/api/recommend", async (req, res) => {
    const { cartItems, tags, limit } = req.body;

    if (!ai) {
      // Elegant styled fallback system if GEMINI_API_KEY is not defined yet
      const fallbackTips = [
        "Поєднай архітектурний дрантя-каркас DECAY з тактичними брюками SIGIL для створення готичного силуету.",
        "Додай сонцезахисні окуляри SGL EYE WEAR до пальта CODEX, спираючись на геометричну асиметрію.",
        "Рекомендується орієнтуватися на вертикальні пропорції з використанням взуття NEO CLAW."
      ];
      return res.json({
        tips: fallbackTips,
        recommendedTags: ["#void-look", "#sacral-geometry", "#memento-noire", "#gothic-line"],
        suggestedProductIds: ["prod-1", "prod-3", "prod-5"]
      });
    }

    try {
      const pNames = (cartItems || []).map((i: any) => i.product.name).join(", ");
      const pTags = (tags || []).join(", ");

      const prompt = `
        User has items in cart: [${pNames}] and is browsing look categories with tags: [${pTags}].
        Analyze their style vibe and create a chilling, high-fashion styling forecast/recommendation.
        Use short, cyberpunk, neo-gothic terminology (Riddick movie atmosphere, cold, cyber-punk, 2010s high-alt).
        Generate exactly 3 styling points/tips in Ukrainian, plus a list of 4 aesthetic styling hashtags, and 2 product IDs from this catalogue that best complete their capsule:
        Available items to recommend:
        - prod-1 (CODEX // V1 LEATHER DUSTER)
        - prod-2 (DECAY // S1 GRID SWEATER)
        - prod-3 (SIGIL // R1 GORP CARGO)
        - prod-4 (NEO // CLAW PLATFORMS)
        - prod-5 (SGL // EYE WEAR VISOR)
        - prod-6 (ECHO // L2 GRUNGE HOODIE)
        - prod-7 (STATIC // ASYMMETRIC TEE)
        - prod-8 (CYBER // SLING BELT BAG)

        Return response as a strictly valid JSON matching this schema:
        {
          "tips": [string, string, string],
          "recommendedTags": [string, string, string, string],
          "suggestedProductIds": [string, string]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 highly stylistic outfit tips in Ukrainian matching gothic cyber aesthetics"
              },
              recommendedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 aesthetic hashtags"
              },
              suggestedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 2 recommended product ids from the available list"
              }
            },
            required: ["tips", "recommendedTags", "suggestedProductIds"]
          }
        }
      });

      const responseText = response.text ? response.text.trim() : "{}";
      const resultObj = JSON.parse(responseText);
      res.json(resultObj);

    } catch (err) {
      console.error("Gemini recommendation error:", err);
      res.status(500).json({ error: "Neural link down", details: String(err) });
    }
  });

  // Vite development or production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VOID // Server powering port ${PORT}`);
  });
}

startServer();
