# Mini CRM Dashboard

A small web app to track business enquiries (leads). You can add, edit, delete, search and filter leads, and change their status. Data is saved in a database, so it stays after a refresh.

**Live link:** (add your Render link here)

## Features
- Overview cards: total, new and converted leads
- Add, edit and delete leads (name, email, phone, business name, status)
- Search by name or email, filter by status, change status from the table
- Loading message, empty-state message, clear error messages
- Form validation in the browser and again on the server
- Responsive layout (table on desktop, cards on mobile)

## Tech stack and why
- **Frontend:** HTML, CSS, JavaScript. No framework needed for a small dashboard, and every line is easy to explain.
- **Backend:** Python Flask. Simple routes, easy to read.
- **Database:** Supabase (PostgreSQL). Free, hosted, and has a simple Python client.
- **Hosting:** Render (free web service).

## Run it locally
1. Clone the repo and open the folder.
2. Create a virtual environment and install packages:
   ```
   python -m venv venv
   venv\Scripts\activate        (Windows)
   source venv/bin/activate     (Mac/Linux)
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in your Supabase URL and key.
4. Set up the database (below).
5. Start the app: `python app.py` and open http://127.0.0.1:5000

## Database setup
1. Create a free project at supabase.com.
2. Open **SQL Editor**, paste the contents of `schema.sql`, and click **Run**.
3. Go to **Project Settings > API** and copy the **Project URL** and the **service_role** key into `.env`.
   (The key stays on the server only. Never put it in frontend code or push `.env` to GitHub.)

## API
| Method | Route | What it does |
|--------|-------|--------------|
| GET | /api/leads?search=&status= | List leads |
| POST | /api/leads | Add a lead |
| PUT | /api/leads/<id> | Edit a lead or change status |
| DELETE | /api/leads/<id> | Delete a lead |
| GET | /api/stats | Total, new, converted counts |

## Deploy on Render
1. Push the code to GitHub.
2. Render > New > Web Service > pick the repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Add `SUPABASE_URL` and `SUPABASE_KEY` under Environment.

## Challenges I faced
(Write your own here. Ideas: making the table work on mobile, validating on both client and server, handling empty and error states, keeping the secret key safe.)
