import os
import re
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_mail import Mail, Message

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret")

# Mail config via env vars
app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER", "")
app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME", "")
app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD", "")
app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_DEFAULT_SENDER", "noreply@college.edu")

mail = Mail(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

PROFANE_WORDS = {
    "idiot",
    "stupid",
    "dumb",
    "fool",
    "shit",
    "crap",
    "bastard",
    "damn",
    "asshole",
    "bitch",
    "nonsense",
    "trash",
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            blocked INTEGER DEFAULT 0,
            muted INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            contact TEXT NOT NULL,
            email TEXT,
            description TEXT,
            item_date TEXT,
            owner_id INTEGER,
            status TEXT DEFAULT 'open',
            photo_path TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
        """
    )
    # Lightweight migrations for existing DBs
    try:
        cur.execute("ALTER TABLE users ADD COLUMN muted INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cur.execute("ALTER TABLE items ADD COLUMN photo_path TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cur.execute("ALTER TABLE items ADD COLUMN item_date TEXT")
    except sqlite3.OperationalError:
        pass
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            claimer_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(id),
            FOREIGN KEY(claimer_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(id),
            FOREIGN KEY(sender_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            reporter_id INTEGER NOT NULL,
            reason TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(message_id) REFERENCES messages(id),
            FOREIGN KEY(reporter_id) REFERENCES users(id)
        )
        """
    )
    conn.commit()

    # Ensure a default admin exists
    cur.execute("SELECT id FROM users WHERE email = ?", ("admin@college.edu",))
    row = cur.fetchone()
    if not row:
        cur.execute(
            "INSERT INTO users (name, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
            (
                "Admin",
                "admin@college.edu",
                generate_password_hash("admin123"),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
    conn.close()


def contains_profanity(text: str) -> bool:
    if not text:
        return False
    tokens = re.findall(r"\w+", text.lower())
    return any(token in PROFANE_WORDS for token in tokens)


def is_spam(user_id: int, item_id: int) -> bool:
    window = datetime.utcnow() - timedelta(seconds=30)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COUNT(*) AS cnt
        FROM messages
        WHERE sender_id = ? AND item_id = ? AND created_at >= ?
        """,
        (user_id, item_id, window.isoformat()),
    )
    cnt = cur.fetchone()["cnt"]
    conn.close()
    return cnt >= 5


def send_email(to_addr: str, subject: str, body: str):
    if not app.config.get("MAIL_SERVER") or not to_addr:
        return
    try:
        msg = Message(subject=subject, recipients=[to_addr], body=body)
        mail.send(msg)
    except Exception:
        # Avoid crashing app if email fails
        pass


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (uid,))
    user = cur.fetchone()
    conn.close()
    return user


def require_admin():
    user = current_user()
    if not user or not user["is_admin"]:
        abort(403)
    return user


def can_chat(user, item_id: int) -> bool:
    if not user:
        return False
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT owner_id FROM items WHERE id = ?", (item_id,))
    item = cur.fetchone()
    if not item:
        conn.close()
        return False
    if item["owner_id"] == user["id"]:
        conn.close()
        return True
    cur.execute(
        "SELECT claimer_id FROM claims WHERE item_id = ? ORDER BY created_at ASC LIMIT 1",
        (item_id,),
    )
    row = cur.fetchone()
    has_claim = row is not None and row["claimer_id"] == user["id"]
    conn.close()
    return has_claim


@app.route("/")
def home():
    return render_template("index.html", user=current_user())


@app.route("/lost")
def lost():
    return render_template("lost.html", user=current_user())


@app.route("/found")
def found():
    return render_template("found.html", user=current_user())


@app.route("/items")
def items():
    return render_template("items.html", user=current_user())


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cur.fetchone()
        conn.close()
        if user and not user["blocked"] and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            return redirect(url_for("home"))
        return render_template("login.html", user=current_user(), error="Invalid credentials or blocked.")
    return render_template("login.html", user=current_user())


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html", user=current_user())
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    if not name or not email or not password:
        return render_template("register.html", user=current_user(), error="All fields required.")
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (name, email, generate_password_hash(password), datetime.utcnow().isoformat()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return render_template("register.html", user=current_user(), error="Email already exists.")
    conn.close()
    return redirect(url_for("login"))


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("home"))


@app.route("/admin")
def admin():
    require_admin()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    users_count = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM items")
    items_count = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM claims")
    claims_count = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) AS cnt FROM reports")
    reports_count = cur.fetchone()["cnt"]
    conn.close()
    return render_template(
        "admin.html",
        user=current_user(),
        users_count=users_count,
        items_count=items_count,
        claims_count=claims_count,
        reports_count=reports_count,
    )


@app.route("/admin/users")
def admin_users():
    require_admin()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users ORDER BY created_at DESC")
    users = cur.fetchall()
    conn.close()
    return render_template("admin_users.html", user=current_user(), users=users)


@app.route("/admin/items")
def admin_items():
    require_admin()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()
    conn = get_db()
    cur = conn.cursor()
    query = "SELECT * FROM items"
    where = []
    params = []
    if start_date:
        where.append("(item_date >= ?)")
        params.append(start_date)
    if end_date:
        where.append("(item_date <= ?)")
        params.append(end_date)
    if where:
        query += " WHERE " + " AND ".join(where)
    query += " ORDER BY created_at DESC"
    cur.execute(query, params)
    items = cur.fetchall()
    conn.close()
    return render_template(
        "admin_items.html",
        user=current_user(),
        items=items,
        start_date=start_date,
        end_date=end_date,
    )


@app.route("/admin/claims")
def admin_claims():
    require_admin()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT claims.*, items.name AS item_name, users.name AS claimer_name
        FROM claims
        LEFT JOIN items ON claims.item_id = items.id
        LEFT JOIN users ON claims.claimer_id = users.id
        ORDER BY claims.created_at DESC
        """
    )
    claims = cur.fetchall()
    conn.close()
    return render_template("admin_claims.html", user=current_user(), claims=claims)


@app.route("/admin/reports")
def admin_reports():
    require_admin()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT reports.*, messages.body AS message_body, users.name AS reporter_name
        FROM reports
        LEFT JOIN messages ON reports.message_id = messages.id
        LEFT JOIN users ON reports.reporter_id = users.id
        ORDER BY reports.created_at DESC
        """
    )
    reports = cur.fetchall()
    conn.close()
    return render_template("admin_reports.html", user=current_user(), reports=reports)


@app.route("/admin/block_user", methods=["POST"])
def admin_block_user():
    require_admin()
    user_id = request.form.get("user_id")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET blocked = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin"))


@app.route("/admin/mute_user", methods=["POST"])
def admin_mute_user():
    require_admin()
    user_id = request.form.get("user_id")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET muted = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin"))


@app.route("/admin/unmute_user", methods=["POST"])
def admin_unmute_user():
    require_admin()
    user_id = request.form.get("user_id")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET muted = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin"))


@app.route("/admin/delete_item", methods=["POST"])
def admin_delete_item():
    require_admin()
    item_id = request.form.get("item_id")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM items WHERE id = ?", (item_id,))
    cur.execute("DELETE FROM claims WHERE item_id = ?", (item_id,))
    cur.execute("DELETE FROM messages WHERE item_id = ?", (item_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin"))


@app.route("/admin/delete_message", methods=["POST"])
def admin_delete_message():
    require_admin()
    message_id = request.form.get("message_id")
    if not message_id:
        abort(400)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM reports WHERE message_id = ? LIMIT 1", (message_id,))
    if not cur.fetchone():
        conn.close()
        abort(403)
    cur.execute("DELETE FROM messages WHERE id = ?", (message_id,))
    cur.execute("DELETE FROM reports WHERE message_id = ?", (message_id,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin"))


@app.route("/api/items", methods=["GET", "POST"])
def api_items():
    user = current_user()
    if request.method == "POST":
        if not user:
            return jsonify({"error": "login_required"}), 401
        if "multipart/form-data" in request.content_type:
            item_type = request.form.get("type")
            name = request.form.get("name", "").strip()
            contact = request.form.get("contact", "").strip()
            email = request.form.get("email", "").strip()
            description = request.form.get("description", "").strip()
            item_date = request.form.get("item_date", "").strip()
            photo = request.files.get("photo")
        else:
            data = request.get_json(force=True)
            item_type = data.get("type")
            name = data.get("name", "").strip()
            contact = data.get("contact", "").strip()
            email = data.get("email", "").strip()
            description = data.get("description", "").strip()
            item_date = (data.get("item_date") or "").strip()
            photo = None

        if item_type not in ("lost", "found") or not name or not contact:
            return jsonify({"error": "invalid"}), 400
        if contains_profanity(name) or contains_profanity(description):
            return jsonify({"error": "profanity_detected"}), 400

        photo_path = None
        if photo and photo.filename:
            filename = secure_filename(photo.filename)
            ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            filename = f"{ts}_{filename}"
            save_path = os.path.join(UPLOAD_DIR, filename)
            photo.save(save_path)
            photo_path = f"/static/uploads/{filename}"

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO items (type, name, contact, email, description, item_date, owner_id, photo_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_type,
                name,
                contact,
                email,
                description,
                item_date,
                user["id"],
                photo_path,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})

    q = request.args.get("q", "").strip()
    item_type = request.args.get("type", "all")
    conn = get_db()
    cur = conn.cursor()
    base = "SELECT items.*, users.name AS owner_name FROM items LEFT JOIN users ON items.owner_id = users.id"
    where = []
    params = []
    if item_type in ("lost", "found"):
        where.append("items.type = ?")
        params.append(item_type)
    if q:
        where.append("(items.name LIKE ? OR items.description LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if where:
        base += " WHERE " + " AND ".join(where)
    base += " ORDER BY items.created_at DESC"
    cur.execute(base, params)
    rows = cur.fetchall()
    items = []
    for row in rows:
        item = dict(row)
        item["is_owner"] = bool(user and item.get("owner_id") == user["id"])
        if user:
            cur.execute(
                "SELECT claimer_id FROM claims WHERE item_id = ? ORDER BY created_at ASC LIMIT 1",
                (item["id"],),
            )
            claim = cur.fetchone()
            item["has_claim"] = claim is not None and claim["claimer_id"] == user["id"]
        else:
            claim = None
            item["has_claim"] = False
        item["can_chat"] = item["is_owner"] or item["has_claim"]
        items.append(item)
    conn.close()
    return jsonify({"items": items})


@app.route("/api/claim", methods=["POST"])
def api_claim():
    user = current_user()
    if not user:
        return jsonify({"error": "login_required"}), 401
    data = request.get_json(force=True)
    item_id = data.get("item_id")
    if not item_id:
        return jsonify({"error": "invalid"}), 400
    conn = get_db()
    cur = conn.cursor()
    # Only allow one active claimer per item
    cur.execute("SELECT claimer_id FROM claims WHERE item_id = ? ORDER BY created_at ASC LIMIT 1", (item_id,))
    existing = cur.fetchone()
    if existing:
        if existing["claimer_id"] == user["id"]:
            conn.close()
            return jsonify({"ok": True})
        conn.close()
        return jsonify({"error": "already_claimed"}), 409
    # Prevent duplicate claims by same user
    cur.execute("SELECT 1 FROM claims WHERE item_id = ? AND claimer_id = ?", (item_id, user["id"]))
    if cur.fetchone():
        conn.close()
        return jsonify({"ok": True})
    cur.execute(
        "INSERT INTO claims (item_id, claimer_id, created_at) VALUES (?, ?, ?)",
        (item_id, user["id"], datetime.utcnow().isoformat()),
    )
    conn.commit()

    # Email item owner
    cur.execute("SELECT email FROM items WHERE id = ?", (item_id,))
    row = cur.fetchone()
    if row and row["email"]:
        send_email(
            row["email"],
            "Someone claimed your item",
            f"A user has claimed item #{item_id}. Please login to chat and verify ownership.",
        )

    conn.close()
    return jsonify({"ok": True})


@app.route("/api/chat/messages", methods=["GET", "POST"])
def api_chat_messages():
    user = current_user()
    if not user:
        return jsonify({"error": "login_required"}), 401
    if user["muted"]:
        return jsonify({"error": "muted"}), 403

    if request.method == "POST":
        data = request.get_json(force=True)
        item_id = data.get("item_id")
        body = data.get("body", "").strip()
        if not item_id or not body:
            return jsonify({"error": "invalid"}), 400
        if not can_chat(user, int(item_id)):
            return jsonify({"error": "not_allowed"}), 403
        if contains_profanity(body):
            return jsonify({"error": "profanity_detected"}), 400
        if is_spam(user["id"], item_id):
            return jsonify({"error": "spam_detected"}), 429

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (item_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)",
            (item_id, user["id"], body, datetime.utcnow().isoformat()),
        )
        message_id = cur.lastrowid
        conn.commit()

        # Email item owner if sender is not owner
        cur.execute("SELECT owner_id, email FROM items WHERE id = ?", (item_id,))
        item = cur.fetchone()
        if item and item["email"] and item["owner_id"] != user["id"]:
            send_email(
                item["email"],
                "New message about your item",
                "You received a new chat message. Please login to view and respond.",
            )

        conn.close()
        socketio.emit(
            "message",
            {"id": message_id, "item_id": item_id, "sender": user["name"], "body": body},
            room=f"item-{item_id}",
        )
        return jsonify({"ok": True, "id": message_id})

    item_id = request.args.get("item_id")
    if not item_id:
        return jsonify({"messages": []})
    if not can_chat(user, int(item_id)):
        return jsonify({"error": "not_allowed"}), 403
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT messages.*, users.name AS sender_name
        FROM messages
        LEFT JOIN users ON messages.sender_id = users.id
        WHERE messages.item_id = ?
        ORDER BY messages.created_at ASC
        """,
        (item_id,),
    )
    messages = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify({"messages": messages})


@app.route("/api/chat/report", methods=["POST"])
def api_chat_report():
    user = current_user()
    if not user:
        return jsonify({"error": "login_required"}), 401
    data = request.get_json(force=True)
    message_id = data.get("message_id")
    reason = data.get("reason", "Reported")
    if not message_id:
        return jsonify({"error": "invalid"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO reports (message_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?)",
        (message_id, user["id"], reason, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@socketio.on("join")
def on_join(data):
    item_id = data.get("item_id")
    if item_id:
        user = current_user()
        if user and can_chat(user, int(item_id)):
            join_room(f"item-{item_id}")
            emit("status", {"message": "joined"})
        else:
            emit("status", {"message": "not_allowed"})


@socketio.on("leave")
def on_leave(data):
    item_id = data.get("item_id")
    if item_id:
        leave_room(f"item-{item_id}")
        emit("status", {"message": "left"})


if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
