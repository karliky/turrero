import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import PDFMerger from 'pdf-merger-js';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import sharp from 'sharp';

// Utility functions
const readJsonFile = (filePath) => {
  const projectRoot = path.join(process.cwd(), '..');
  return JSON.parse(fs.readFileSync(path.join(projectRoot, filePath), 'utf-8'));
};

const normalizeImagePath = async (imagePath) => {
  if (!imagePath) return '';
  
  const projectRoot = path.join(process.cwd(), '..');
  const absolutePath = path.join(projectRoot, 'public', imagePath.replace(/^\.\//, ''));
  
  try {
    // Optimize image using sharp
    const imageBuffer = await sharp(absolutePath)
      .resize(400, 400, { // Max dimensions
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ // Convert to JPEG for better compression
        quality: 60,
        progressive: true
      })
      .toBuffer();
    
    const base64Image = imageBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.warn(`Failed to process image: ${absolutePath}`, error);
    return '';
  }
};

const getEnrichedTweetData = (enrichedTweets, id) => {
  return enrichedTweets.find(t => t.id === id);
};

const formatCategoryTitle = (category) => {
  return category
    .replace(/-/g, ' ')
    .split(' ')
    .map((word, index) => index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase())
    .join(' ');
};

const generateTurraHtml = async (thread, summary, categories) => {
  const mainTweet = thread[0];
  const enrichedTweets = readJsonFile('infrastructure/db/tweets_enriched.json');
  
  const renderEmbed = async (tweet) => {
    const enrichedData = getEnrichedTweetData(enrichedTweets, tweet.id);
    if (!enrichedData) return '';

    switch (enrichedData.type) {
      case 'card':
        const cardImage = enrichedData.img ? await normalizeImagePath(enrichedData.img) : '';
        return `
          <div class="card-embed">
            ${cardImage ? `
              <div class="image-container">
                <img src="${cardImage}" alt="${enrichedData.title || ''}" />
              </div>
            ` : ''}
            <div class="card-content">
              <h3 class="card-title">
                ${enrichedData.title || enrichedData.url}
              </h3>
              ${enrichedData.description ? `
                <p class="card-description">${enrichedData.description}</p>
              ` : ''}
              ${enrichedData.media ? `
                <p class="card-source">${enrichedData.media}</p>
              ` : ''}
            </div>
          </div>
        `;

      case 'media':
        const mediaImage = enrichedData.img ? await normalizeImagePath(enrichedData.img) : '';
        return mediaImage ? `
          <div class="media-container">
            <div class="image-container">
              <img src="${mediaImage}" alt="" />
            </div>
          </div>
        ` : '';

      case 'embed':
        return `
          <div class="tweet-embed">
            <div class="tweet-embed-header">
              <div class="tweet-embed-author">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#536471">
                  <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
                </svg>
                <span>${enrichedData.author}</span>
              </div>
            </div>
            <p class="tweet-embed-content">${enrichedData.tweet}</p>
          </div>
        `;

      default:
        return '';
    }
  };

  // Process all embeds concurrently
  const processedTweets = await Promise.all(thread.map(async tweet => {
    const embedHtml = await renderEmbed(tweet);
    return `
      <div class="tweet">
        <p>${tweet.tweet}</p>
        ${embedHtml}
      </div>
    `;
  }));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Georgia, 'Times New Roman', serif;
          width: 100%;
          margin: 0;
          padding: 20px; 
          box-sizing: border-box;
          column-count: 2;
          column-gap: 40px;
          column-rule: 1px solid #e5e7eb;
          line-height: 1.6;
        }
        
        .title, .metadata, .tweet, .turra-footer {
          break-inside: avoid;
        }
        
        .header {
          column-span: all;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #1a1a1a;
        }
        
        .title { 
          font-size: 32px; 
          color: #1a1a1a; 
          margin-bottom: 16px;
          font-weight: bold;
          letter-spacing: -0.5px;
        }
        
        .metadata { 
          color: #666; 
          font-size: 14px; 
          margin-bottom: 24px;
          font-style: italic;
        }
        
        p {
          margin: 0 0 16px;
          font-size: 16px;
          text-align: justify;
          hyphens: auto;
        }
        
        .card-embed, .media-container, .tweet-embed {
          max-width: 100%;
          margin: 16px 0;
        }
        
        .image-container img {
          max-width: 100%;
          height: auto;
        }
        
        .turra-footer {
          column-span: all;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 2px solid #1a1a1a;
          text-align: center;
        }
        
        .turra-footer a {
          color: #1da1f2;
          text-decoration: none;
          display: inline-block;
          margin-top: 8px;
          padding: 8px 16px;
          border: 1px solid #1da1f2;
          border-radius: 20px;
          transition: all 0.2s ease;
          font-style: normal;
        }
        .turra-footer a:hover {
          background-color: #1da1f2;
          color: white;
        }
        
        .tweet-embed {
          border: 1px solid #cfd9de;
          border-radius: 12px;
          padding: 12px;
          margin: 16px 0;
          background-color: #fff;
          break-inside: avoid;
        }
        
        .tweet-embed-header {
          margin-bottom: 8px;
        }
        
        .tweet-embed-author {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #536471;
          font-size: 15px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        .tweet-embed-content {
          font-size: 15px;
          line-height: 1.5;
          margin: 0;
          color: #0f1419;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${summary}</div>
        <div class="metadata">
          <div>Categorías: ${categories.map(formatCategoryTitle).join(', ')}</div>
          <div>Fecha: ${new Date(mainTweet.time).toLocaleDateString('es-ES')}</div>
        </div>
      </div>

      ${processedTweets.join('')}

      <div class="turra-footer">
        Final de la turra: ${summary}
        <br/>
        <a href="https://turrero.vercel.app/turra/${mainTweet.id}">Ver en El Turrero Post</a>
      </div>
    </body>
    </html>
  `;
};

const generateIndexHtml = (categories, tweetsMap, summaries) => {
  const categorizedTweets = {};
  
  tweetsMap.forEach(tweet => {
    const tweetCategories = tweet.categories.split(',').map(c => c.trim());
    const summary = summaries.find(s => s.id === tweet.id)?.summary || '';
    
    tweetCategories.forEach(category => {
      if (!categorizedTweets[category]) {
        categorizedTweets[category] = [];
      }
      categorizedTweets[category].push({ id: tweet.id, summary });
    });
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Georgia, 'Times New Roman', serif;
          margin: 0;
          padding: 40px;
          column-count: 2;
          column-gap: 40px;
          column-rule: 1px solid #e5e7eb;
        }

        .main-title {
          column-span: all;
          font-size: 32px;
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 2px solid #1a1a1a;
        }

        .category-section {
          break-inside: avoid;
          margin-bottom: 24px;
        }

        .category-title { 
          font-size: 18px;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        .turras-list {
          font-size: 12px;
          line-height: 1.4;
        }

        .turra-item {
          margin-bottom: 6px;
          color: #374151;
        }

        .category-count {
          font-size: 14px;
          color: #6b7280;
          font-weight: normal;
          margin-left: 4px;
        }
      </style>
    </head>
    <body>
      <h1 class="main-title">Índice de Turras</h1>
      ${categories.map(category => {
        const categoryTweets = categorizedTweets[category] || [];
        return `
          <div class="category-section">
            <h2 class="category-title">
              ${formatCategoryTitle(category)}
              <span class="category-count">(${categoryTweets.length})</span>
            </h2>
            <div class="turras-list">
              ${categoryTweets.map(tweet => `
                <div class="turra-item">
                  • ${tweet.summary}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </body>
    </html>
  `;
};

const ORDERED_CATEGORIES = [
    "resolución-de-problemas-complejos",
    "sistemas-complejos",
    "marketing",
    "estrategia",
    "factor-x",
    "sociología",
    "gestión-del-talento",
    "leyes-y-sesgos",
    "trabajo-en-equipo",
    "libros",
    "futurismo-de-frontera",
    "personotecnia",
    "orquestación-cognitiva",
    "gaming",
    "lectura-de-señales",
    "el-contexto-manda",
    "desarrollo-de-habilidades",
    "otras-turras-del-querer",
];

async function generateThreadPDF(browser, thread, summary, tweetCategories, tempDir) {
  const mainTweet = thread[0];
  const page = await browser.newPage();
  const html = await generateTurraHtml(thread, summary, tweetCategories);
  
  // Set viewport to ensure images are rendered
  await page.setViewport({
    width: 1200,
    height: 800
  });
  
  await page.setContent(html);
  
  // Wait for all images to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise((resolve, reject) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', reject);
        }))
    );
  });

  // Replace waitForTimeout with a small delay using setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  const pdfPath = path.join(tempDir, `${mainTweet.id}.pdf`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });
  
  await page.close();
  return pdfPath;
}

// Worker thread code
if (!isMainThread) {
  const { threads, tempDir, workerId } = workerData;
  
  (async () => {
    let browser;
    try {
      console.log(`[Worker ${workerId}] Starting browser...`);
      browser = await puppeteer.launch();
      const pdfPaths = [];
      
      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        console.log(`[Worker ${workerId}] Processing ${i + 1}/${threads.length} - Thread ID: ${thread.thread[0].id}`);
        
        try {
          const pdfPath = await generateThreadPDF(
            browser,
            thread.thread,
            thread.summary,
            thread.categories,
            tempDir
          );
          pdfPaths.push(pdfPath);
        } catch (error) {
          console.error(`[Worker ${workerId}] Failed to process thread ${thread.thread[0].id}:`, error);
          // Continue with next thread instead of crashing the worker
        }
      }
      
      console.log(`[Worker ${workerId}] Closing browser...`);
      await browser.close();
      parentPort.postMessage({ workerId, pdfPaths });
    } catch (error) {
      console.error(`[Worker ${workerId}] Critical error:`, error);
      if (browser) {
        await browser.close().catch(console.error);
      }
      process.exit(1);
    }
  })().catch(error => {
    console.error(`[Worker ${workerId}] Fatal error:`, error);
    process.exit(1);
  });
}

async function main() {
  console.log('📚 Reading JSON files...');
  const tweetsMap = readJsonFile('infrastructure/db/tweets_map.json');
  const tweets = readJsonFile('infrastructure/db/tweets.json');
  const summaries = readJsonFile('infrastructure/db/tweets_summary.json');
  
  const categories = ORDERED_CATEGORIES;
  
  // Sort tweets by date (newest first) within each category
  const categorizedTweets = {};
  categories.forEach(category => {
    const categoryTweetIds = tweetsMap
      .filter(tweet => tweet.categories.split(',').map(c => c.trim()).includes(category))
      .map(tweet => tweet.id);

    const categoryThreads = tweets
      .filter(thread => categoryTweetIds.includes(thread[0].id))
      .sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());

    categorizedTweets[category] = categoryThreads;
  });

  console.log(`📊 Found ${tweets.length} threads across ${categories.length} categories`);

  // Create temp directory
  const tempDir = path.join(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
    console.log('📁 Created temporary directory');
  }

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch();
  const merger = new PDFMerger();

  // Generate index PDF
  console.log('📑 Generating index PDF...');
  const indexPage = await browser.newPage();
  await indexPage.setContent(generateIndexHtml(categories, tweetsMap, summaries));
  await indexPage.pdf({
    path: path.join(tempDir, 'index.pdf'),
    format: 'A4'
  });

  merger.add(path.join(tempDir, 'index.pdf'));

  console.log('📊 Creating worker threads...');
  const numCPUs = cpus().length;
  const allThreads = categories.flatMap(category => 
    categorizedTweets[category].map(thread => ({
      thread,
      summary: summaries.find(s => s.id === thread[0].id)?.summary || '',
      categories: tweetsMap.find(t => t.id === thread[0].id)?.categories.split(',') || []
    }))
  );

  // Split threads among workers
  const threadsPerWorker = Math.ceil(allThreads.length / numCPUs);
  const workerPromises = [];
  let processedCount = 0;
  const totalThreads = allThreads.length;

  console.log(`📊 Creating ${numCPUs} worker threads for ${totalThreads} total threads...`);
  
  for (let i = 0; i < numCPUs; i++) {
    const workerThreads = allThreads.slice(i * threadsPerWorker, (i + 1) * threadsPerWorker);
    if (workerThreads.length === 0) continue;

    console.log(`[Main] Worker ${i + 1} assigned ${workerThreads.length} threads`);
    
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { 
        threads: workerThreads, 
        tempDir,
        workerId: i + 1 
      }
    });

    // Add a 10-minute timeout for each worker
    const workerPromise = Promise.race([
      new Promise((resolve, reject) => {
        worker.on('message', ({ workerId, pdfPaths }) => {
          processedCount += workerThreads.length;
          console.log(`[Worker ${workerId}] ✅ Completed all ${workerThreads.length} threads`);
          console.log(`📄 Total Progress: ${processedCount}/${totalThreads} threads (${Math.round(processedCount/totalThreads*100)}%)`);
          resolve(pdfPaths);
        });
        worker.on('error', (error) => {
          console.error(`[Worker ${i + 1}] ❌ Error:`, error);
          reject(error);
        });
        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`[Worker ${i + 1}] ❌ Stopped with code ${code}`);
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Worker ${i + 1} timed out after 10 minutes`)), 600000)
      )
    ]).catch(error => {
      console.error(`[Worker ${i + 1}] Failed:`, error);
      worker.terminate();
      return []; // Return empty array of PDFs on failure
    });

    workerPromises.push(workerPromise);
  }

  // Wait for all workers to complete
  console.log('⏳ Generating PDFs in parallel...');
  const workerResults = await Promise.all(workerPromises);
  const allPdfPaths = workerResults.flat();

  // Merge PDFs
  console.log('📎 Merging all PDFs...');
  
  // Add index first
  await merger.add(path.join(tempDir, 'index.pdf'));
  
  // Add all thread PDFs
  for (const pdfPath of allPdfPaths) {
    await merger.add(pdfPath);
  }

  // Save the merged PDF
  const outputPath = path.join(process.cwd(), '..', 'public', `turras.pdf`);
  await merger.save(outputPath);

  // Cleanup
  console.log('🧹 Cleaning up...');
  await browser.close();
  fs.rmSync(tempDir, { recursive: true });
  
  console.log(`✅ PDF generated successfully at ${outputPath}`);
  console.log(`Estaré aquí mismo.`);
  process.exit(0);
}

// Only run main() in the main thread
if (isMainThread) {
  main().catch(console.error);
} 