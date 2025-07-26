# Supabase Connection Troubleshooting

## Two Types of Connections

Supabase provides two connection strings:

1. **Direct Connection** (Port 5432)
   - Format: `postgresql://postgres.[project-ref]:password@db.[project-ref].supabase.co:5432/postgres`
   - Use for: Local development, long-running connections

2. **Connection Pooler** (Port 6543)
   - Format: `postgresql://postgres.[project-ref]:password@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Use for: Serverless functions, Railway deployments

## Getting Your Connection String

1. Go to your Supabase project dashboard
2. Click Settings (gear icon) → Database
3. Find the "Connection string" section
4. You'll see tabs for:
   - **URI** - This is what you need
   - **PSQL** - Command line format
   - **JDBC** - Java format
   - etc.

5. Make sure to select:
   - **Mode**: Session (not Transaction)
   - **Pool Mode**: Session

## Password Encoding Rules

For the password in the connection string:
- `,` (comma) - NO encoding needed
- `*` → `%2A`
- `!` → `%21`
- `<` → `%3C`
- `>` → `%3E`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`
- `;` → `%3B`
- `=` → `%3D`
- `?` → `%3F`
- `[` → `%5B`
- `]` → `%5D`

## Common Issues

1. **SASL/SCRAM errors**: Usually means wrong password or encoding
2. **Connection refused**: Wrong host/port
3. **SSL required**: Need to enable SSL in connection
4. **Timeout**: Network issues or wrong region

## Testing Your Connection

Use the test-connection.js script to verify your connection before running migrations.