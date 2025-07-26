# Beginner's Guide: Moving Your Website from Replit to Your Own Hosting

## What This Guide Does

Think of this like moving from a furnished apartment (Replit) to your own house (Railway). In the furnished apartment, everything was set up for you. In your own house, you have more control but need to set things up yourself.

This guide will help you move:
- Your website's code (like moving your furniture)
- Your database (like moving your filing cabinet with all your records)
- Your uploaded files (like moving your photo albums and documents)
- Any special features your site uses (like moving special equipment)

## What You'll Need

### Accounts (Free to Start)
1. **Railway Account** - This is where your website will live (like your new house)
   - Go to railway.app and sign up
2. **GitHub Account** - This stores your code (like a storage unit)
   - Go to github.com and sign up
3. **Database Account** (choose one):
   - **Railway's Database** - Built into Railway (easier for beginners)
   - **Supabase Account** - Separate database service (more features)
   - Go to supabase.com if you want to use Supabase
4. **Your Replit Account** - Where your site currently lives

### On Your Computer
1. **A Terminal/Command Prompt**
   - Windows: Press Windows+R, type `cmd`, press Enter
   - Mac: Press Cmd+Space, type `Terminal`, press Enter
2. **Node.js** - This runs JavaScript on your computer
   - Download from nodejs.org (get the LTS version)
   - Install it like any other program
3. **Git** - This helps move code around
   - Download from git-scm.com
   - Install with default options

## Understanding the Basics

### What is a Database?
Think of it like a super-organized filing cabinet. It stores all your website's information:
- User accounts
- Blog posts
- Images information (not the images themselves)
- Any data your website saves

### What are Environment Variables?
These are like secret passwords your website needs to work:
- Database passwords
- API keys (like passwords for external services)
- Other configuration settings

### What is Deployment?
This means making your website available on the internet. It's like opening your store for business.

## Step-by-Step Migration Process

### Part 1: Getting Your Code Ready

#### Step 1: Download Your Project to Your Computer

1. **Open your Replit project**
2. **Download your code:**
   - Click the three dots menu
   - Select "Download as ZIP"
   - Save it to your computer
3. **Extract the ZIP file:**
   - Right-click the downloaded file
   - Select "Extract All" or "Unzip"
   - Remember where you extracted it

#### Step 2: Open Terminal in Your Project Folder

1. **Open your terminal** (Command Prompt or Terminal)
2. **Navigate to your project:**
   ```
   cd "C:\Users\YourName\Downloads\my-project"
   ```
   (Replace with your actual path - use quotes if there are spaces)

#### Step 3: Install Missing Pieces

Your project needs some tools to work. Type these commands one at a time:

```
npm install
```
Wait for it to finish (you'll see lots of text scroll by - this is normal)

```
npm install postgres drizzle-orm
```
These are tools for working with databases.

### Part 2: Fixing Compatibility Issues

#### Why This Is Needed
Replit uses newer versions of things than Railway. It's like having a DVD that won't play in an older DVD player - we need to make it compatible.

#### Common Fixes You'll Need:

1. **Create a compatibility file** called `migration-fixes.md` to track what you change
2. **Look for errors** when you try to build your project locally
3. **Common issues:**
   - Date formatting differences
   - File path differences
   - Database connection differences

#### Technical Implementation: Node.js Version Compatibility

**Problem**: Replit uses Node.js 20+, Railway typically uses Node.js 18.x
**Issue**: `import.meta.dirname` is not available in Node.js < 20.11

**Fix for vite.config.ts:**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Get directory path with fallback for older Node.js versions
const getDirname = () => {
  try {
    // Try using import.meta.dirname (Node.js 20.11+)
    if (import.meta.dirname) {
      return import.meta.dirname;
    }
  } catch (e) {
    // Ignore error and fall through to alternative methods
  }
  
  try {
    // Fallback: Use import.meta.url with fileURLToPath
    if (import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      return path.dirname(__filename);
    }
  } catch (e) {
    console.warn('Failed to get dirname from import.meta.url:', e);
  }
  
  // Last resort: use process.cwd() 
  // This should work in Railway where the build runs from /app
  return process.cwd();
};

const __dirname = getDirname();

// Then replace all instances of import.meta.dirname with __dirname
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      // ... other aliases using __dirname
    },
  },
  // ... rest of config
});
```

#### Technical Implementation: Database Connection Type

**Problem**: Replit projects often use Neon's WebSocket-based PostgreSQL
**Issue**: Railway PostgreSQL doesn't support WebSocket connections

**Fix for server/db.ts:**
```typescript
// REMOVE these imports (Neon WebSocket approach):
// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// neonConfig.webSocketConstructor = ws;

// ADD these imports (Standard PostgreSQL):
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Simple connection setup
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

#### Technical Implementation: Static File Serving

**Problem**: Vite builds to `dist/public` but Express serves from `dist`
**Issue**: Results in 404 errors for all routes

**Fix for server/vite.ts (or wherever static files are served):**
```typescript
export function serveStatic(app: Express) {
  // OLD: const distPath = path.resolve("dist");
  const distPath = path.resolve("dist", "public"); // NEW: Add "public"
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  
  // Catch-all route for client-side routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### Part 3: Moving Your Database

#### Step 1: Find Your Database Password in Replit

1. **In Replit, look for the padlock icon** (Secrets or Environment Variables)
2. **Find something called:**
   - `DATABASE_URL` or
   - `POSTGRES_URL` or
   - `DB_CONNECTION`
3. **Copy this entire line** - it looks like:
   ```
   postgresql://username:password@host.com:5432/database
   ```
   This is like the address and key to your filing cabinet.

#### Step 2: Create a Migration Folder

In your terminal:
```
mkdir migration-tools
```
This creates a folder to keep our migration files organized.

#### Step 3: Export Your Data

We need to create a backup of all your data. Think of it like making photocopies of everything in your filing cabinet.

#### Technical Implementation: Database Export Script

Create `migration-tools/01-export-replit-data.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPLIT_DATABASE_URL = process.env.REPLIT_DATABASE_URL;

async function exportReplitData() {
  console.log('🚀 Starting Replit data export...\n');
  
  if (!REPLIT_DATABASE_URL) {
    console.error('❌ Please set REPLIT_DATABASE_URL environment variable');
    process.exit(1);
  }

  try {
    // Connect to Replit database
    const replitDb = postgres(REPLIT_DATABASE_URL);
    const db = drizzle(replitDb, { schema });
    
    // Create export directory
    const exportDir = path.join(__dirname, 'replit-export');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Export each table
    const tables = Object.entries(schema).filter(([key, value]) => 
      // Filter to only get table schemas
      value && typeof value === 'object' && !key.includes('Relations')
    );
    
    for (const [tableName, tableSchema] of tables) {
      console.log(`📊 Exporting ${tableName}...`);
      
      try {
        const data = await db.select().from(tableSchema as any);
        const filePath = path.join(exportDir, `${tableName}.json`);
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ Exported ${data.length} records from ${tableName}`);
      } catch (error) {
        console.error(`❌ Error exporting ${tableName}:`, error);
      }
    }
    
    // Create metadata file
    const metadata = {
      exportDate: new Date().toISOString(),
      source: 'Replit',
      tables: tables.map(([name]) => name),
      version: '1.0'
    };
    
    await fs.writeFile(
      path.join(exportDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('\n✅ Database export completed!');
    await replitDb.end();
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportReplitData();
```

**Run the export:**
```bash
# Windows
set REPLIT_DATABASE_URL=your-database-url-from-replit
npx tsx migration-tools/01-export-replit-data.ts

# Mac/Linux
export REPLIT_DATABASE_URL=your-database-url-from-replit
npx tsx migration-tools/01-export-replit-data.ts
```

### Part 4: Moving Your Files

#### Step 1: Find What Files You Have

Common folders to look for:
- `uploads/` - Where uploaded images/documents live
- `public/` - Static files like logos
- Any other folders with user-uploaded content

#### Step 2: Create a Backup

**In Replit's Shell** (the command line in Replit):
```
zip -r backup.zip uploads/ public/
```
This creates a single file with all your uploads.

#### Step 3: Download the Backup

1. **Find `backup.zip` in Replit's file list**
2. **Right-click and download it**
3. **Save it to your computer**

### Part 5: Setting Up Railway

#### Step 1: Create Your Railway Project

1. **Log into Railway**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Connect your GitHub account** (follow the prompts)

#### Step 2: Add a Database

**Option A: Use Railway's Database (Easier)**
1. **In your Railway project, click "New"**
2. **Select "Database"**
3. **Choose "PostgreSQL"**
4. **Wait 2-3 minutes for it to set up**

**Option B: Use Supabase (More Features)**
1. **Log into Supabase**
2. **Create a new project**
3. **Wait for it to set up (5-10 minutes)**
4. **Go to Settings → Database**
5. **Copy the connection string**

#### Step 3: Get Your New Database Address

**If using Railway's Database:**
1. **Click on your database in Railway**
2. **Go to "Variables" tab**
3. **Look for `DATABASE_PUBLIC_URL`**
4. **Copy this - you'll need it soon**

**If using Supabase:**
1. **You already have it from Step 2**
2. **It starts with `postgresql://` and ends with `.supabase.com`**

### Part 6: Importing Your Data

#### Step 1: Create the Database Structure

First, we need to create empty "filing cabinets" in the new location:

```
set DATABASE_URL=your-railway-database-url
npm run db:push
```

This creates all the tables (like folders in a filing cabinet) but they're empty.

#### Step 2: Import Your Data

Now we fill those empty tables with your data:

#### Technical Implementation: Database Import Script with Date Fix

Create `migration-tools/03-import-to-railway.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAILWAY_DATABASE_URL = process.env.DATABASE_URL;

// CRITICAL: Fix date fields that come as strings from JSON
function fixDateFields(data: any[], dateFields: string[]): any[] {
  return data.map(record => {
    const fixed = { ...record };
    for (const field of dateFields) {
      if (fixed[field] && typeof fixed[field] === 'string') {
        fixed[field] = new Date(fixed[field]);
      }
    }
    return fixed;
  });
}

async function importToRailway() {
  console.log('🚀 Starting data import to Railway/Supabase...\n');
  
  if (!RAILWAY_DATABASE_URL) {
    console.error('❌ Please set DATABASE_URL environment variable');
    process.exit(1);
  }

  try {
    const railwayDb = postgres(RAILWAY_DATABASE_URL);
    const db = drizzle(railwayDb, { schema });
    
    const exportDir = path.join(__dirname, 'replit-export');
    
    // Define import order and date fields for each table
    const importOrder = [
      // Independent tables first
      { name: 'users', table: schema.users, dateFields: [] },
      { name: 'admins', table: schema.admins, dateFields: ['createdAt'] },
      { name: 'projects', table: schema.projects, dateFields: ['date', 'createdAt'] },
      { name: 'blogPosts', table: schema.blogPosts, dateFields: ['date', 'createdAt'] },
      { name: 'contactSubmissions', table: schema.contactSubmissions, dateFields: ['createdAt'] },
      // Add more tables with their date fields
      // Dependent tables last (those with foreign keys)
    ];
    
    for (const { name, table, dateFields } of importOrder) {
      const filePath = path.join(exportDir, `${name}.json`);
      
      try {
        console.log(`📊 Importing ${name}...`);
        let data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        
        if (data.length === 0) {
          console.log(`⏭️  No data to import for ${name}`);
          continue;
        }
        
        // Fix date fields
        data = fixDateFields(data, dateFields);
        
        // Import in batches
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          await db.insert(table).values(batch);
          console.log(`  ✅ Imported ${Math.min(i + batchSize, data.length)}/${data.length} records`);
        }
        
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`⏭️  Skipping ${name} (no export file found)`);
        } else {
          console.error(`❌ Error importing ${name}:`, error.message);
        }
      }
    }
    
    // Update sequences for tables with auto-increment IDs
    console.log('\n🔧 Updating sequences...');
    for (const { name } of importOrder) {
      try {
        await railwayDb.unsafe(
          `SELECT setval('${name}_id_seq', COALESCE((SELECT MAX(id) FROM ${name}), 1))`
        );
      } catch (error) {
        // Ignore if table doesn't have an id sequence
      }
    }
    
    console.log('\n✅ Database import completed!');
    await railwayDb.end();
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importToRailway();
```

**Run the import:**
```bash
npx tsx migration-tools/03-import-to-railway.ts
```

### Part 7: Deploying Your Website

#### Step 1: Connect Environment Variables

1. **In Railway, go to your app (not the database)**
2. **Click "Variables"**
3. **Add variables:**
   - Click "New Variable"
   - Add each secret from Replit
   - For database, use "Add Reference" and select your database

#### Technical Implementation: Railway Environment Variables

**Required Variables:**
- `DATABASE_URL` - Add as reference to your PostgreSQL database
- Any API keys from Replit (OPENAI_API_KEY, SENDGRID_API_KEY, etc.)
- `NODE_ENV` = `production`
- `PORT` - Railway sets this automatically

**Important**: Use the internal `DATABASE_URL` for the deployed app, not `DATABASE_PUBLIC_URL`

#### Step 2: Upload Your Code

In your terminal:
```
git add .
git commit -m "Initial deployment to Railway"
git push origin main
```

Think of this as:
- `git add .` = Pack everything into boxes
- `git commit` = Label the boxes
- `git push` = Send the boxes to GitHub (and Railway picks them up)

#### Step 3: Watch It Deploy

1. **Go to Railway dashboard**
2. **You'll see "Deploying..."**
3. **Wait 3-5 minutes**
4. **Click "View Logs" if you want to watch**

### Part 8: Uploading Your Files

After deployment, you need to upload your files:

1. **Extract your backup.zip**
2. **Copy the folders to your project**
   ```
   # Extract backup.zip to migration-tools/replit-files/
   # Then copy:
   # - migration-tools/replit-files/uploads/ → ./uploads/
   # - migration-tools/replit-files/public/ → ./public/
   ```
3. **Deploy again with the files:**
   ```
   git add .
   git commit -m "Add uploaded files"
   git push origin main
   ```

#### Technical Implementation: Special Features (Vector Databases, etc.)

If your project uses special features like ChromaDB, Pinecone, or other vector databases:

**For local vector databases (like ChromaDB):**
1. Include the database folder in your backup
2. Update initialization paths to use absolute paths
3. Example fix:
   ```typescript
   // OLD: const client = new ChromaClient({ path: './chroma_db' });
   // NEW: 
   import path from 'path';
   const dbPath = path.resolve(process.cwd(), 'chroma_db');
   const client = new ChromaClient({ path: dbPath });
   ```

**For cloud vector databases:**
1. Just update the API keys in environment variables
2. No data migration needed

#### Technical Implementation: Supabase Connection Types

**Important**: Supabase provides different connection strings for different use cases:

1. **Direct Connection** (Port 5432)
   ```
   postgresql://postgres:password@db.PROJECT_REF.supabase.co:5432/postgres
   ```
   - Use for: Local development, long-running processes
   - Username format: `postgres` (no project ref)

2. **Transaction Pooler** (Port 6543)
   ```
   postgresql://postgres.PROJECT_REF:password@aws-0-region.pooler.supabase.com:6543/postgres
   ```
   - Use for: Serverless functions, Railway deployments
   - Username format: `postgres.PROJECT_REF` (with project ref and dot)
   - **Most common source of connection errors**

3. **Session Pooler** (Port 6543)
   - Similar to transaction pooler but different mode
   - Better for applications with persistent connections

**Common Issues:**
- Using wrong username format (`postgres` vs `postgres.PROJECT_REF`)
- Mixing connection types (direct URL with pooler credentials)
- Not encoding special characters in passwords

**Recommended Approach:**
Use PG environment variables to avoid URL parsing issues entirely.

## Troubleshooting Common Problems

### "Page Not Found" or 404 Errors
- Check that your build succeeded in Railway logs
- Verify your start command is correct
- Make sure files are in the right folders
- **Technical**: Check that static file serving points to the correct build output directory

### No Data Showing Up
- Check environment variables are set
- Verify database import succeeded
- Look for error messages in browser (press F12)
- **Technical**: Check for WebSocket connection errors if migrating from Neon

### Images Not Loading
- Ensure files were uploaded
- Check file paths match database records
- Verify permissions are correct
- **Technical**: Ensure the uploads directory is included in git and deployed

### Cache Issues in Admin Panels
**Technical Fix**: After creating/updating content, invalidate all relevant caches:
```typescript
// In your mutation's onSuccess:
queryClient.invalidateQueries({ queryKey: ["/api/resource"] });
queryClient.invalidateQueries({ queryKey: ["/api/admin/resource"] }); // Don't forget admin endpoints!
```

### Database Connection Errors

#### "SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing"
- **Cause**: Wrong password or authentication method
- **Fix**: Verify password is correct and properly encoded
- **Alternative**: Use PG environment variables instead of DATABASE_URL

#### "DATABASE_URL must be set" despite .env file existing
- **Cause**: dotenv not loading environment variables
- **Fix**: Add `import dotenv from 'dotenv'; dotenv.config();` at top of config files

#### "listen ENOTSUP: operation not supported on socket 0.0.0.0:5000"
- **Cause**: Windows doesn't support binding to 0.0.0.0 with reusePort
- **Fix**: Use localhost for development, 0.0.0.0 only for production

### Replit-Specific Service Errors

#### "Environment variable REPLIT_DOMAINS not provided"
- **Cause**: Replit authentication still enabled
- **Fix**: Replace replitAuth with simpleAuth for development

#### Required API keys blocking development
- **Cause**: Services fail if API keys missing
- **Fix**: Make services optional in development with null checks

### Migration Success Indicators

You know the migration succeeded when:
- ✅ `npm run db:push` completes without errors
- ✅ `npm run dev` starts server successfully
- ✅ Server shows "serving on http://localhost:5000"
- ✅ No database connection errors in console
- ✅ Can access application in browser
- ✅ API endpoints respond correctly

## Important Tips for Beginners

1. **Take breaks** - This process can take several hours
2. **Save everything** - Keep copies of all exports and backups
3. **Test gradually** - Check each part works before moving on
4. **Ask for help** - Railway has good documentation and community
5. **Keep notes** - Write down what you did for future reference

## What Success Looks Like

You know you've succeeded when:
- ✅ Your website loads on Railway's URL
- ✅ You can log in with existing accounts
- ✅ All your data appears correctly
- ✅ Images and uploads work
- ✅ All features function as before

## Getting Help

If you get stuck:
1. **Check Railway's docs**: docs.railway.app
2. **Ask in Railway's Discord**: They're helpful with beginners
3. **Google the exact error message**: Others have probably had the same issue
4. **Take a screenshot**: This helps when asking for help

## Final Notes

Moving from Replit to Railway gives you:
- **More control** over your hosting
- **Better performance** potential
- **Lower costs** at scale
- **Professional deployment** experience

But it also means:
- **More responsibility** for maintenance
- **Need to understand** more concepts
- **Occasional troubleshooting** required

This is a normal part of growing as a website owner. Every developer has gone through this learning process!

## Appendix: Complete Technical Checklist

For developers implementing this migration:

- [ ] Fix Node.js compatibility issues (import.meta.dirname)
- [ ] Change database connection from WebSocket to standard PostgreSQL
- [ ] Update static file serving paths
- [ ] Create export script with proper schema detection
- [ ] Create import script with date field conversion
- [ ] Set up proper environment variables in Railway
- [ ] Test all API endpoints after deployment
- [ ] Verify file uploads are accessible
- [ ] Check cache invalidation in admin panels
- [ ] Update any absolute paths to use path.resolve()
- [ ] Ensure all sequences are updated after import
- [ ] Install dotenv and configure environment variable loading
- [ ] Fix Windows-incompatible npm scripts
- [ ] URL-encode database passwords with special characters
- [ ] Replace Replit authentication with development bypass
- [ ] Fix server binding issues (0.0.0.0 vs localhost)
- [ ] Make optional services (like Anthropic) development-friendly
- [ ] Update database connection to support both URL and PG variables

### Additional Windows-Specific Issues

#### Environment Variables Not Loading
If DATABASE_URL is undefined despite being in .env:
1. Install dotenv: `npm install dotenv`
2. Add `import dotenv from 'dotenv'; dotenv.config();` at the start of config files
3. Create server/config.ts to load env vars before other imports

#### NPM Scripts Failing on Windows
Replace Unix-style env setting:
```json
// Bad (Unix only):
"dev": "NODE_ENV=development tsx server/index.ts"

// Good (Cross-platform):
"dev": "tsx server/index.ts"
```

#### Special Characters in Passwords
**Two Solutions Available:**

**Option 1: URL Encoding (Traditional)**
- `*` becomes `%2A`, `!` becomes `%21`, `<` becomes `%3C`, etc.
- Create encode-password.js helper script
- Run: `node encode-password.js "your-password"`
- Use the encoded version in DATABASE_URL

**Option 2: PG Environment Variables (Recommended)**
```env
PGDATABASE=postgres
PGHOST=aws-0-region.pooler.supabase.com
PGPORT=6543
PGUSER=postgres.project_ref
PGPASSWORD="raw-password-no-encoding"
```
This avoids all URL encoding issues.

#### Replacing Replit Authentication
Replit projects often use Replit's built-in auth. For local development:

**Create server/simpleAuth.ts:**
```typescript
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";

export async function setupAuth(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
  }));
  console.log('[Auth] Development mode - authentication bypassed');
}

export function isAuthenticated(req: any, res: Response, next: NextFunction) {
  req.user = {
    claims: { sub: 'dev-user-123', email: 'dev@example.com' }
  };
  next();
}
```

**Update routes.ts:**
```typescript
// Change: import { setupAuth, isAuthenticated } from "./replitAuth";
// To:     import { setupAuth, isAuthenticated } from "./simpleAuth";
```

#### Server Binding Issues on Windows
**Problem**: `listen ENOTSUP: operation not supported on socket 0.0.0.0:5000`

**Fix server/index.ts:**
```typescript
const port = process.env.PORT || 5000;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const serverOptions: any = { port, host };

// Only use reusePort in production (Linux/Railway)
if (process.env.NODE_ENV === 'production') {
  serverOptions.reusePort = true;
}

server.listen(serverOptions, () => {
  console.log(`serving on http://${host}:${port}`);
});
```

#### Making Optional Services Development-Friendly
**Problem**: Required API keys (like ANTHROPIC_API_KEY) blocking development

**Fix in service constructors:**
```typescript
constructor() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Service] API key not set - feature disabled in development');
    this.client = null;
    return;
  }
  this.client = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async serviceMethod() {
  if (!this.client) {
    return { message: 'Service disabled in development' };
  }
  // Normal service logic
}
```