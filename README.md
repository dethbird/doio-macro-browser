# DOIO Macro Browser

A web application for managing and viewing macros for the DOIO macropad, organized by application and profile.

## Requirements

- PHP 8.1+
- Composer
- Node.js 18+
- SQLite3
- Apache with mod_rewrite (or nginx)

## Setup

### 1. Install PHP dependencies

```bash
composer install
```

### 2. Install frontend dependencies and build

```bash
cd ui
npm install
npm run build
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set your APP_PASSWORD
```

### 4. Initialize the database

```bash
php bin/init-db.php
```

### 5. Set database permissions

The web server needs write access to the SQLite database and its directory:

```bash
chmod 777 var
chmod 666 var/database.sqlite
```

Alternatively, change ownership to the web server user:

```bash
chown www-data:www-data var var/database.sqlite
```

### 6. Configure web server

Point your web server's document root to the `public/` directory.

For Apache, ensure `mod_rewrite` is enabled and `.htaccess` files are allowed:

```apache
<Directory /path/to/doio-macro-browser/public>
    AllowOverride All
    Require all granted
</Directory>
```

## Development

### Rebuild frontend after changes

```bash
cd ui
npm run build
```

### Frontend dev server (optional)

For development with hot reload:

```bash
cd ui
npm run dev
```

## Project Structure

```
├── bin/                  # CLI scripts
│   └── init-db.php       # Database initialization
├── database/
│   └── schema.sql        # SQLite schema
├── public/               # Web root
│   ├── index.php         # Slim application entry point
│   ├── .htaccess         # Apache rewrite rules
│   └── assets/           # Built frontend assets
├── templates/            # Twig templates
├── ui/                   # React frontend source
│   └── src/
├── var/                  # Runtime data
│   └── database.sqlite   # SQLite database
└── vendor/               # Composer dependencies
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/healthcheck` | Health check |
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create application |
| GET | `/api/applications/{id}` | Get application |
| GET | `/api/applications/{id}/profiles` | List profiles for application |
| GET | `/api/applications/{id}/profiles/{pid}` | Get profile with JSON |
