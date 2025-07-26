# Supabase Setup Instructions for KanoLens

## 1. Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in to your account
3. Click "New project"
4. Fill in:
   - Project name: `kanolens` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest to you
5. Click "Create new project" and wait 2-3 minutes for setup

## 2. Get Database Connection String

1. Once your project is created, go to Settings (gear icon) → Database
2. Under "Connection string" section, click on the "URI" tab
3. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the database password you created

**IMPORTANT: If your password contains special characters**, you must URL-encode it:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `!` becomes `%21`
- `&` becomes `%26`
- `*` becomes `%2A`
- `+` becomes `%2B`
- `:` becomes `%3A`
- `;` becomes `%3B`
- `=` becomes `%3D`
- `?` becomes `%3F`

Example: If your password is `MyP@ss#123!`, it becomes `MyP%40ss%23123%21`

**Note about Connection Pooler**: If you see a connection string with `pooler.supabase.com` and port `6543`, that's the connection pooler. For local development, you can use either:
- Direct connection: `db.[YOUR-PROJECT-REF].supabase.co:5432`
- Pooler connection: `aws-0-[REGION].pooler.supabase.com:6543` (better for serverless/Railway)

## 3. Set Up Local Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase connection string:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
   ```

3. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_openai_key
   ```

4. Generate a session secret (you can use any random string):
   ```
   SESSION_SECRET=any_random_string_here_32_chars_or_more
   ```

## 4. Push Database Schema to Supabase

Run the following command to create all tables in your Supabase database:

```bash
npm run db:push
```

This will create all the necessary tables:
- users
- sessions
- analysisSessions
- chatMessages
- documents
- agentEvaluations
- userFeedback
- promptVersions
- adminUsers

## 5. Verify Setup

1. Go back to your Supabase dashboard
2. Click on "Table Editor" in the left sidebar
3. You should see all the tables listed above
4. The tables will be empty (no data) but ready to use

## 6. Test Local Development

Run the development server:

```bash
npm run dev
```

The application should start without database connection errors.

## Troubleshooting

### "DATABASE_URL must be set" error
- Make sure your `.env` file exists and contains the DATABASE_URL
- Restart your development server after creating/editing `.env`

### "Connection refused" or timeout errors
- Check that your Supabase project is active (not paused)
- Verify the connection string is correct
- Ensure you're using the correct password

### Schema push fails
- Make sure you have the latest npm packages: `npm install`
- Check that your DATABASE_URL is properly formatted
- Try running `npx drizzle-kit push` directly to see detailed errors

## Next Steps

Once your database is set up:
1. The application will use Supabase for all data storage
2. You can use Supabase's dashboard to view and manage data
3. Authentication will need to be updated (currently uses Replit Auth)
4. You're ready to test and refine the application locally