import os
import uuid
import logging
import hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import httpx
import requests
import bcrypt
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Header, Query, Request, Response
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI(redirect_slashes=True)

@app.get("/favicon.ico", include_in_schema=False)
async def root_favicon():
    return Response(status_code=204)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.?(vercel\.app|radeyaphoto\.my\.id)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

api_router = APIRouter(prefix="/api")

ADMIN_WHATSAPP = os.environ.get("ADMIN_WHATSAPP", "628211251570")
ADMIN_EMAIL = "hello.radeya@gmail.com"
ADMIN_PASSWORD_DEFAULT = os.environ.get("ADMIN_PASSWORD", "braggart666")

# Konfigurasi Notion
NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
NOTION_DATABASE_ID = os.environ.get("NOTION_DATABASE_ID")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "gradphoto"
storage_key = None

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "pdf": "application/pdf"}

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Radeyaphoto Studio")

async def send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None):
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": f"{EMAIL_FROM_NAME} <admin@radeyaphoto.my.id>",
        "to": [to],
        "subject": subject,
        "html": html
    }
    if reply_to:
        payload["reply_to"] = reply_to

    async with httpx.AsyncClient(timeout=30) as c:
        resp = await c.post(url, headers=headers, json=payload)
    
    if resp.status_code >= 400:
        logger.error(f"Resend API Error: {resp.text}")
        raise HTTPException(status_code=502, detail=f"Gagal mengirim email: {resp.text}")
    
    return resp.json().get("id")

async def send_capi_purchase(booking: dict, fbc: str = "", fbp: str = ""):
    pixel_id = os.environ.get("META_PIXEL_ID")
    access_token = os.environ.get("META_ACCESS_TOKEN")
    if not pixel_id or not access_token:
        logger.warning("Meta Pixel ID atau Access Token CAPI belum disetel di .env")
        return

    url = f"https://graph.facebook.com/v19.0/{pixel_id}/events"
    
    email_hash = hashlib.sha256(booking.get("email", "").strip().lower().encode('utf-8')).hexdigest() if booking.get("email") else None
    phone_hash = hashlib.sha256("".join(filter(str.isdigit, booking.get("whatsapp", ""))).encode('utf-8')).hexdigest() if booking.get("whatsapp") else None
    external_id_hash = hashlib.sha256(booking.get("invoice_number", "").strip().encode('utf-8')).hexdigest() if booking.get("invoice_number") else None

    user_data = {
        "em": [email_hash] if email_hash else [],
        "ph": [phone_hash] if phone_hash else [],
        "external_id": [external_id_hash] if external_id_hash else []
    }

    if fbc:
        user_data["fbc"] = fbc
    if fbp:
        user_data["fbp"] = fbp

    payload = {
        "data": [
            {
                "event_name": "Purchase",
                "event_time": int(datetime.now(timezone.utc).timestamp()),
                "action_source": "website",
                "event_source_url": f"https://booking.radeyaphoto.my.id/invoice/{booking['booking_id']}",
                "user_data": user_data,
                "custom_data": {
                    "currency": "IDR",
                    "value": float(booking.get("amount_paid", 0)),
                    "order_id": booking.get("invoice_number"),
                    "package_id": booking.get("package_id"),
                    "university": booking.get("university")
                }
            }
        ],
        "access_token": access_token
    }

    async with httpx.AsyncClient(timeout=10) as client_http:
        try:
            resp = await client_http.post(url, json=payload)
            if resp.status_code >= 400:
                logger.error(f"CAPI Error: {resp.text}")
            else:
                logger.info(f"CAPI Purchase berhasil dikirim untuk invoice {booking.get('invoice_number')}!")
        except Exception as e:
            logger.error(f"Gagal koneksi ke CAPI Meta: {e}")

async def send_to_notion(booking_data: dict, pkg_name: str, drive_link: str = ""):
    if not NOTION_API_KEY or not NOTION_DATABASE_ID:
        logger.warning("Notion API Key atau Database ID belum disetel.")
        return
        
    url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    
    properties = {
        "Nama": {"title": [{"text": {"content": booking_data["full_name"]}}]},
        "Invoice": {"rich_text": [{"text": {"content": booking_data["invoice_number"]}}]},
        "WhatsApp": {"rich_text": [{"text": {"content": booking_data["whatsapp"]}}]},
        "Instagram": {"rich_text": [{"text": {"content": booking_data["instagram"]}}]},
        "Kampus": {"rich_text": [{"text": {"content": booking_data["university"]}}]},
        "Paket": {"select": {"name": pkg_name}},
        "Tanggal": {"date": {"start": booking_data["shoot_date"]}},
        "Lokasi Foto": {"rich_text": [{"text": {"content": booking_data["location"]}}]}
    }

    if drive_link:
        properties["Google Drive"] = {"url": drive_link}

    payload = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": properties
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                logger.error(f"Notion API Error: {resp.text}")
            else:
                logger.info("Berhasil mengirim data booking & Link Drive ke Notion!")
        except Exception as e:
            logger.error(f"Gagal koneksi ke Notion: {e}")

async def update_notion_booking(booking_data: dict, pkg_name: str):
    if not NOTION_API_KEY or not NOTION_DATABASE_ID:
        return
    url_query = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    url_patch = "https://api.notion.com/v1/pages/"
    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url_query, headers=headers, json={
            "filter": {
                "property": "Invoice",
                "rich_text": {"equals": booking_data["invoice_number"]}
            }
        })
        results = resp.json().get("results", [])
        
        properties = {
            "Tanggal": {"date": {"start": booking_data["shoot_date"]}},
            "Lokasi Foto": {"rich_text": [{"text": {"content": booking_data["location"]}}]}
        }

        if results:
            await client.patch(f"{url_patch}{results[0]['id']}", headers=headers, json={"properties": properties})
            logger.info(f"Notion data untuk {booking_data['invoice_number']} berhasil diupdate.")
        else:
            await send_to_notion(booking_data, pkg_name)

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class LoginPayload(BaseModel):
    email: str
    password: str

class PackageIn(BaseModel):
    name: str
    price: float
    duration_minutes: int = 60
    description: Optional[str] = ""
    dp_amount: float = 0
    active: bool = True

class Package(PackageIn):
    package_id: str

class PhotographerIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    fee_per_session: float = 0
    active: bool = True

class Photographer(PhotographerIn):
    photographer_id: str

class BookingUpdate(BaseModel):
    status: Optional[Literal["pending", "confirmed", "completed", "cancelled"]] = None
    photographer_id: Optional[str] = None
    amount_paid: Optional[float] = None
    payment_type: Optional[Literal["dp", "full"]] = None
    photographer_fee: Optional[float] = None
    photographer_paid: Optional[bool] = None
    notes: Optional[str] = None
    extra_charge: Optional[float] = None
    extra_note: Optional[str] = None
    shoot_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None

class ClientPaymentConfirm(BaseModel):
    amount_paid: float
    proof_file_id: str

class PriveIn(BaseModel):
    amount: float
    notes: Optional[str] = "Keperluan pribadi"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**{k: user.get(k) for k in ["user_id", "email", "name", "picture"]})

@api_router.post("/auth/login")
async def login_password(body: LoginPayload, response: Response):
    if body.email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Email admin tidak dikenali.")
    
    user = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Akun admin belum diinisialisasi.")
    
    try:
        password_bytes = body.password.encode('utf-8')[:72]
        stored_hash_bytes = user["password_hash"].encode('utf-8')
        if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
            raise HTTPException(status_code=401, detail="Password salah.")
    except Exception:
        raise HTTPException(status_code=401, detail="Password salah.")

    st = f"tok_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": st,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso()
    })
    response.set_cookie("session_token", st, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "session_token": st}

@api_router.get("/auth/me", response_model=User)
async def auth_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}

@api_router.get("/packages", response_model=List[Package])
async def list_packages(only_active: bool = False):
    q = {"active": True} if only_active else {}
    docs = await db.packages.find(q, {"_id": 0}).sort("price", 1).to_list(500)
    return docs

@api_router.post("/packages", response_model=Package)
async def create_package(body: PackageIn, request: Request):
    await get_current_user(request)
    doc = {"package_id": f"pkg_{uuid.uuid4().hex[:10]}", **body.model_dump()}
    await db.packages.insert_one(dict(doc))
    return doc

@api_router.put("/packages/{package_id}", response_model=Package)
async def update_package(package_id: str, body: PackageIn, request: Request):
    await get_current_user(request)
    r = await db.packages.update_one({"package_id": package_id}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Paket tidak ditemukan")
    return await db.packages.find_one({"package_id": package_id}, {"_id": 0})

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str, request: Request):
    await get_current_user(request)
    await db.packages.delete_one({"package_id": package_id})
    return {"ok": True}

@api_router.get("/photographers", response_model=List[Photographer])
async def list_photographers():
    return await db.photographers.find({}, {"_id": 0}).sort("name", 1).to_list(500)

@api_router.post("/photographers", response_model=Photographer)
async def create_photographer(body: PhotographerIn, request: Request):
    await get_current_user(request)
    doc = {"photographer_id": f"pho_{uuid.uuid4().hex[:10]}", **body.model_dump()}
    await db.photographers.insert_one(dict(doc))
    return doc

@api_router.put("/photographers/{photographer_id}", response_model=Photographer)
async def update_photographer(photographer_id: str, body: PhotographerIn, request: Request):
    await get_current_user(request)
    r = await db.photographers.update_one({"photographer_id": photographer_id}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Fotografer tidak ditemukan")
    return await db.photographers.find_one({"photographer_id": photographer_id}, {"_id": 0})

@api_router.delete("/photographers/{photographer_id}")
async def delete_photographer(photographer_id: str, request: Request):
    await get_current_user(request)
    await db.photographers.delete_one({"photographer_id": photographer_id})
    return {"ok": True}

@api_router.post("/upload/proof")
async def upload_proof(file: UploadFile = File(...)):
    ext = (file.filename or "img.jpg").split(".")[-1].lower()
    if ext not in MIME_TYPES:
        raise HTTPException(400, "Format file harus JPG, PNG, WEBP atau PDF")
    data = await file.read()
    if len(data) > 6 * 1024 * 1024:
        raise HTTPException(400, "Ukuran file maksimal 6MB")
    path = f"{APP_NAME}/proofs/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or MIME_TYPES[ext]
    result = put_object(path, data, content_type)
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    await db.files.insert_one({
        "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"file_id": file_id, "storage_path": result["path"], "content_type": content_type}

@api_router.get("/files/{file_id}")
async def download_file(file_id: str):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File tidak ditemukan")
    data, ct = get_object(rec["storage_path"])
    return FastResponse(content=data, media_type=rec.get("content_type", ct))

@api_router.post("/prive")
async def add_prive(body: PriveIn, request: Request):
    await get_current_user(request)
    doc = {
        "prive_id": f"prv_{uuid.uuid4().hex[:10]}",
        "amount": float(body.amount),
        "notes": body.notes,
        "created_at": now_iso()
    }
    await db.prive_records.insert_one(doc)
    return {"ok": True, "message": "Prive berhasil dicatat"}

@api_router.get("/prive")
async def list_prive(request: Request):
    await get_current_user(request)
    return await db.prive_records.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.delete("/prive/{prive_id}")
async def delete_prive(prive_id: str, request: Request):
    await get_current_user(request)
    await db.prive_records.delete_one({"prive_id": prive_id})
    return {"ok": True}

def gcal_link(b: dict) -> str:
    from urllib.parse import quote_plus
    d = b["shoot_date"].replace("-", "")
    s = b["start_time"].replace(":", "") + "00"
    e = b["end_time"].replace(":", "") + "00"
    text = quote_plus(f"Foto Graduation - {b['full_name']}")
    
    wa_num = "".join(filter(str.isdigit, b['whatsapp']))
    if wa_num.startswith("0"):
        wa_num = "62" + wa_num[1:]
    wa_url = f"https://wa.me/{wa_num}"
    
    ig_handle = b['instagram'].strip().lstrip('@')
    ig_url = f"https://instagram.com/{ig_handle}"

    details = quote_plus(
        f"=== DETAIL BOOKING RADEYAPHOTO ===\n\n"
        f"No. Invoice: {b.get('invoice_number', '-')}\n"
        f"Nama Klien: {b['full_name']}\n"
        f"Universitas: {b['university']}\n"
        f"Program Studi: {b['study']}\n\n"
        f"WhatsApp: {wa_url}\n"
        f"Instagram: {ig_url}\n\n"
        f"Paket: {b['package_name']} (Rp {b.get('package_price', 0):,.0f})\n"
        f"Extra Charge: Rp {b.get('extra_charge', 0):,.0f}\n"
        f"Catatan Klien: {b.get('notes', '-')}\n\n"
        f"Fotografer: {b.get('photographer_name') or 'Belum Ditugaskan'}"
    )
    
    loc = quote_plus(b["location"])
    return f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={text}&dates={d}T{s}/{d}T{e}&details={details}&location={loc}&ctz=Asia/Jakarta"

async def next_invoice_number() -> str:
    count = await db.bookings.count_documents({})
    return f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{count + 1:04d}"

@api_router.post("/bookings")
async def create_booking(
    full_name: str = Form(...), email: str = Form(...), instagram: str = Form(...),
    whatsapp: str = Form(...), university: str = Form(...), study: str = Form(...),
    package_id: str = Form(...), shoot_date: str = Form(...), location: str = Form(...),
    start_time: str = Form(...), end_time: str = Form(...),
    payment_type: Literal["dp", "full"] = Form(...), amount_paid: float = Form(...),
    proof_file_id: str = Form(...), notes: Optional[str] = Form(""),
    fbc: str = Form(""), fbp: str = Form(""),
):
    pkg = await db.packages.find_one({"package_id": package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(400, "Paket tidak ditemukan")
    booking_id = f"bk_{uuid.uuid4().hex[:12]}"
    
    actual_payment_type = "full" if float(amount_paid) >= pkg["price"] else payment_type
    balance_due_calc = max(pkg["price"] - float(amount_paid), 0)
    cleaned_notes = (notes or "").strip()
    
    doc = {
        "booking_id": booking_id, "invoice_number": await next_invoice_number(),
        "full_name": full_name, "email": str(email), "instagram": instagram, "whatsapp": whatsapp,
        "university": university, "study": study,
        "package_id": package_id, "package_name": pkg["name"], "package_price": pkg["price"],
        "extra_charge": 0.0, "extra_note": "",
        "shoot_date": shoot_date, "location": location, "start_time": start_time, "end_time": end_time,
        "payment_type": actual_payment_type, "amount_paid": float(amount_paid),
        "balance_due": balance_due_calc,
        "proof_file_id": proof_file_id, "notes": cleaned_notes,
        "drive_link": "", "status": "pending", "photographer_id": None, "photographer_name": None,
        "photographer_fee": 0.0, "photographer_paid": False,
        "invoice_sent": False, "created_at": now_iso(),
    }
    await db.bookings.insert_one(dict(doc))
    
    try:
        await send_capi_purchase(doc, fbc=fbc, fbp=fbp)
    except Exception as e:
        logger.error(f"Gagal kirim CAPI: {e}")

    sheet_synced = False
    drive_link = ""
    try:
        sheet_url = "https://script.google.com/macros/s/AKfycbzeRuDOGTgYNquypvAqPuvSoLKx1JRcCkDrVjohYdWmEo3dtKD5X46ruMkYV4d7VIHU/exec"
        sheet_payload = {
            "invoice_number": doc['invoice_number'],
            "full_name": full_name,
            "email": str(email),
            "instagram": instagram,
            "whatsapp": whatsapp,
            "university": university,
            "study": study,
            "package_name": pkg['name'],
            "shoot_date": shoot_date,
            "time_slot": f"{start_time} - {end_time}",
            "location": location,
            "payment_type": "DP" if actual_payment_type == "dp" else "Full Payment",
            "amount_paid": float(amount_paid),
            "notes": cleaned_notes if cleaned_notes else "-",
            "status": "pending"
        }
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as sheet_client:
            resp = await sheet_client.post(sheet_url, json=sheet_payload)
            content_type = resp.headers.get("content-type", "")
            if resp.status_code < 400 and "application/json" in content_type:
                sheet_synced = True
                res_data = resp.json()
                logger.info(f"RESPON APPS SCRIPT: {res_data}")
                drive_link = res_data.get("drive_link", "")
            else:
                logger.error(f"Sheet API error atau redirect terdeteksi ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        logger.error(f"Gagal kirim ke spreadsheet/drive: {e}")

    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"sheet_synced": sheet_synced, "drive_link": drive_link}}
    )
    doc["sheet_synced"] = sheet_synced
    doc["drive_link"] = drive_link

    try:
        await send_to_notion(doc, pkg["name"], drive_link=drive_link)
    except Exception as e:
        logger.error(f"Gagal kirim ke Notion: {e}")

    doc["gcal_link"] = gcal_link(doc)
    from urllib.parse import quote
    
    invoice_web_url = f"https://booking.radeyaphoto.my.id/invoice/{booking_id}"
    msg = (f"*BOOKING FOTO GRADUATION*\n\nNama: {full_name}\nEmail: {email}\nIG: {instagram}\nWA: {whatsapp}\n"
           f"Universitas: {university}\nProdi: {study}\n\nPaket: {pkg['name']} (Rp {pkg['price']:,.0f})\n"
           f"Tanggal: {shoot_date}\nJam: {start_time} - {end_time}\nLokasi: {location}\n"
           f"Catatan: {cleaned_notes if cleaned_notes else '-'}\n\n"
           f"Pembayaran: {'DP' if actual_payment_type == 'dp' else 'Full Payment'} - Rp {float(amount_paid):,.0f}\n"
           f"Sisa Pembayaran: Rp {balance_due_calc:,.0f}\n"
           f"No. Invoice: {doc['invoice_number']}\n\n"
           f"⚠️ *Batas waktu pelunasan paling lambat H-1*\n"
           f"Bisa ditransfer ke: *BCA 2952093623 a/n Yulviana Kusnia*\n\n"
           f"📄 *Link Invoice:* {invoice_web_url}\n\n"
           f"Bukti transfer sudah saya upload. Mohon konfirmasi booking saya. Terima kasih!")
    doc["whatsapp_link"] = f"https://wa.me/{ADMIN_WHATSAPP}?text={quote(msg)}"
    return doc

@api_router.get("/bookings")
async def list_bookings(
    request: Request, 
    status: Optional[str] = None, 
    payment_type: Optional[str] = None,
    photographer_id: Optional[str] = None, 
    month: Optional[str] = None, 
    q: Optional[str] = None
):
    await get_current_user(request)
    query = {}
    if status and status != "all":
        query["status"] = status
    if payment_type and payment_type != "all":
        query["payment_type"] = payment_type
    if photographer_id and photographer_id != "all":
        query["photographer_id"] = photographer_id
    
    if month and month != "all":
        query["shoot_date"] = {"$regex": f"^{month}"}

    if q:
        query["$or"] = [{"full_name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}},
                        {"university": {"$regex": q, "$options": "i"}}, {"invoice_number": {"$regex": q, "$options": "i"}}]
    
    docs = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        d["gcal_link"] = gcal_link(d)
    return docs

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    d = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Booking tidak ditemukan")
    
    pkg_price = float(d.get("package_price", 0))
    extra = float(d.get("extra_charge", 0))
    paid = float(d.get("amount_paid", 0))
    total_tagihan = pkg_price + extra
    d["balance_due"] = max(total_tagihan - paid, 0)
    
    d["gcal_link"] = gcal_link(d)
    return d

@api_router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, body: BookingUpdate, request: Request):
    await get_current_user(request)
    cur = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Booking tidak ditemukan")
    
    body_dict = body.model_dump()
    upd = {k: v for k, v in body_dict.items() if v is not None}
    
    if "photographer_id" in body_dict:
        pho_id = body_dict["photographer_id"]
        if not pho_id or pho_id == "none" or pho_id == "" or pho_id == "null":
            upd["photographer_id"] = None
            upd["photographer_name"] = None
            upd["photographer_fee"] = 0.0
            upd["photographer_paid"] = False
        else:
            pho = await db.photographers.find_one({"photographer_id": pho_id}, {"_id": 0})
            upd["photographer_name"] = pho["name"] if pho else None
            if pho and ("photographer_fee" not in upd or upd["photographer_fee"] == 0):
                upd["photographer_fee"] = pho.get("fee_per_session", 0)
                
    package_price = float(cur.get("package_price", 0))
    extra_charge = float(upd.get("extra_charge", cur.get("extra_charge", 0)))
    paid_amount = float(upd.get("amount_paid", cur.get("amount_paid", 0)))
    
    total_tagihan = package_price + extra_charge
    upd["balance_due"] = max(total_tagihan - paid_amount, 0)
    
    if "payment_type" not in upd:
        upd["payment_type"] = "full" if paid_amount >= total_tagihan else "dp"

    await db.bookings.update_one({"booking_id": booking_id}, {"$set": upd})
    d = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    try:
        sheet_url = "https://script.google.com/macros/s/AKfycbzeRuDOGTgYNquypvAqPuvSoLKx1JRcCkDrVjohYdWmEo3dtKD5X46ruMkYV4d7VIHU/exec"
        payload = {
            "invoice_number": d['invoice_number'],
            "full_name": d['full_name'],
            "email": d['email'],
            "instagram": d['instagram'],
            "whatsapp": d['whatsapp'],
            "university": d['university'],
            "study": d['study'],
            "package_name": d['package_name'],
            "shoot_date": d['shoot_date'],
            "time_slot": f"{d['start_time']} - {d['end_time']}",
            "location": d['location'],
            "payment_type": "DP" if d['payment_type'] == 'dp' else "Full Payment",
            "amount_paid": float(d['amount_paid']),
            "notes": d.get('notes', '-'),
            "status": d['status']
        }
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(sheet_url, json=payload)
    except Exception as e:
        logger.error(f"Gagal sinkronisasi Sheets/Calendar saat update: {e}")

    try:
        await update_notion_booking(d, d['package_name'])
    except Exception as e:
        logger.error(f"Gagal update Notion saat update booking: {e}")

    d["balance_due"] = max((float(d.get("package_price", 0)) + float(d.get("extra_charge", 0))) - float(d.get("amount_paid", 0)), 0)
    d["gcal_link"] = gcal_link(d)
    return d

@api_router.post("/bookings/{booking_id}/confirm-payment")
async def client_confirm_payment(booking_id: str, body: ClientPaymentConfirm):
    cur = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not cur:
        raise HTTPException(404, "Booking tidak ditemukan")
    
    package_price = float(cur.get("package_price", 0))
    extra_charge = float(cur.get("extra_charge", 0))
    total_tagihan = package_price + extra_charge
    
    previous_paid = float(cur.get("amount_paid", 0))
    new_input_amount = float(body.amount_paid)
    
    total_paid = previous_paid + new_input_amount
    if total_paid > total_tagihan:
        total_paid = total_tagihan
        
    balance = max(total_tagihan - total_paid, 0)
    payment_type = "full" if balance <= 0 else "dp"
    
    upd = {
        "amount_paid": total_paid,
        "balance_due": balance,
        "payment_type": payment_type,
        "proof_file_id": body.proof_file_id,
        "status": "confirmed"
    }
    
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": upd})
    updated_doc = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    updated_doc["balance_due"] = balance
    return {"ok": True, "message": "Konfirmasi pelunasan berhasil!", "booking": updated_doc}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, request: Request):
    await get_current_user(request)
    await db.bookings.delete_one({"booking_id": booking_id})
    return {"ok": True}

def rupiah(v) -> str:
    return f"Rp {float(v or 0):,.0f}".replace(",", ".")

def invoice_html(b: dict) -> str:
    pkg_price = float(b.get('package_price', 0))
    extra = float(b.get('extra_charge', 0))
    total_tagihan = pkg_price + extra
    
    extra_row = f"""<tr><td style="padding:8px 0;border-bottom:1px solid #eee">Extra Time / Biaya Tambahan<br>
    <span style="color:#71717a;font-size:12px">{b.get('extra_note', 'Tambahan waktu sesi')}</span></td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid #eee">{rupiah(extra)}</td></tr>""" if extra > 0 else ""

    notes_section = f"""<p style="margin:4px 0;"><span style="font-weight:600;">Catatan:</span> {b.get('notes', '-')}</p>""" if b.get('notes') else ""

    rows = f"""
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee">{b['package_name']}<br>
    <span style="color:#71717a;font-size:12px">{b['shoot_date']} · {b['start_time']}-{b['end_time']} · {b['location']}</span></td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid #eee">{rupiah(pkg_price)}</td></tr>
    {extra_row}"""
    
    return f"""<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#ffffff;padding:24px;border-radius:8px;border:1px solid rgba(6,95,70,0.1);color:#2C2A29;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><div style="font-size:20px;font-weight:bold;color:#065f46">{EMAIL_FROM_NAME} Invoice</div>
<div style="color:#71717a;font-size:12px">{b['invoice_number']}</div></td>
<td align="right"><div style="font-size:11px;font-weight:600;text-transform:uppercase;padding:4px 10px;background:{'#d1fae5' if b.get('balance_due', 0) <= 0 else '#fef3c7'};color:{'#065f46' if b.get('balance_due', 0) <= 0 else '#92400e'};border-radius:4px;display:inline-block;">
{'Lunas (Full)' if b.get('balance_due', 0) <= 0 else 'DP / Belum Lunas'}
</div></td></tr></table>
<hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0">

<div style="font-size:14px;margin-bottom:20px;">
  <p style="margin:4px 0;"><span style="font-weight:600;">Nama Klien:</span> {b['full_name']}</p>
  <p style="margin:4px 0;"><span style="font-weight:600;">Paket:</span> {b['package_name']} ({rupiah(pkg_price)})</p>
  <p style="margin:4px 0;"><span style="font-weight:600;">Jadwal:</span> {b['shoot_date']} ({b['start_time']} - {b['end_time']})</p>
  <p style="margin:4px 0;"><span style="font-weight:600;">Lokasi:</span> {b['location']}</p>
  {notes_section}
  <hr style="border:none;border-top:1px solid #e4e4e7;margin:8px 0">
  
  <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:12px 0;font-size:12px;">
    <p style="margin:0 0 4px 0;color:#475569;">bisa di transfer ke sini yah kak</p>
    <p style="margin:0;font-weight:bold;color:#1e293b;">BCA 2952093623 a/n Yulviana Kusnia</p>
    <p style="margin:8px 0 0 0;color:#c2410c;font-weight:500;border-top:1px solid #e2e8f0;padding-top:6px;">
      ⚠️ Batas waktu pelunasan paling lambat H-1 sebelum jadwal sesi foto.
    </p>
  </div>
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
{rows}
<tr><td style="padding-top:10px;font-weight:bold;border-top:1px solid #e4e4e7">Total Keseluruhan:</td>
<td align="right" style="padding-top:10px;font-weight:bold;border-top:1px solid #e4e4e7">{rupiah(total_tagihan)}</td></tr>
<tr><td style="padding-top:4px;color:#71717a">Sudah Dibayar:</td><td align="right" style="padding-top:4px;color:#71717a">{rupiah(b['amount_paid'])}</td></tr>
<tr><td style="padding-top:8px;font-weight:bold;font-size:16px;color:#c2410c;border-top:1px solid #e4e4e7">Sisa Pembayaran:</td>
<td align="right" style="padding-top:8px;font-weight:bold;font-size:16px;color:#c2410c;border-top:1px solid #e4e4e7">{rupiah(b.get('balance_due', 0))}</td></tr>
</table>

<p style="font-size:12px;color:#71717a;margin-top:24px;border-top:1px solid #e4e4e7;padding-top:12px;">
Terima kasih telah mempercayakan momen kelulusanmu kepada Radeyaphoto.<br>
Hubungi admin di WhatsApp {ADMIN_WHATSAPP} jika ada pertanyaan lebih lanjut.
</p></div>"""

@api_router.get("/bookings/{booking_id}/invoice")
async def get_invoice(booking_id: str):
    b = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking tidak ditemukan")
    b["balance_due"] = max((float(b.get("package_price", 0)) + float(b.get("extra_charge", 0))) - float(b.get("amount_paid", 0)), 0)
    return {"invoice_number": b["invoice_number"], "html": invoice_html(b), "booking": b}

@api_router.post("/bookings/{booking_id}/send-invoice")
async def send_invoice(booking_id: str, request: Request):
    await get_current_user(request)
    b = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking tidak ditemukan")
    b["balance_due"] = max((float(b.get("package_price", 0)) + float(b.get("extra_charge", 0))) - float(b.get("amount_paid", 0)), 0)
    try:
        eid = await send_email(b["email"], f"Invoice {b['invoice_number']} — Booking Foto Graduation", invoice_html(b))
    except Exception as e:
        logger.error(f"send invoice failed: {e}")
        raise HTTPException(502, "Gagal mengirim email invoice")
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"invoice_sent": True, "invoice_sent_at": now_iso()}})
    return {"ok": True, "email_id": eid, "sent_to": b["email"]}

@api_router.get("/analytics/summary")
async def analytics(
    request: Request, 
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    await get_current_user(request)
    
    query = {}
    if start_date and end_date:
        query["shoot_date"] = {"$gte": start_date, "$lte": end_date}
    elif month and month != "all":
        query["shoot_date"] = {"$regex": f"^{month}"}
        
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(5000)
    
    dp_income = sum(b["amount_paid"] for b in bookings if b["payment_type"] == "dp")
    full_income = sum(b["amount_paid"] for b in bookings if b["payment_type"] == "full")
    raw_total_income = dp_income + full_income

    prive_docs = await db.prive_records.find({}, {"_id": 0}).to_list(5000)
    total_prive = sum(p["amount"] for p in prive_docs)
    
    total_income = max(raw_total_income - total_prive, 0)
    
    active_bookings = [b for b in bookings if b.get("status") != "cancelled"]
    
    outstanding = sum(max((float(b.get("package_price", 0)) + float(b.get("extra_charge", 0))) - float(b.get("amount_paid", 0)), 0) for b in active_bookings)
    total_turnover = raw_total_income + outstanding
    
    fee_total = sum(b.get("photographer_fee", 0) for b in active_bookings if b.get("photographer_id"))
    fee_unpaid = sum(b.get("photographer_fee", 0) for b in active_bookings if b.get("photographer_id") and not b.get("photographer_paid"))

    net_profit_cash = total_income - fee_total       
    net_profit_accrual = total_turnover - fee_total  

    per_pho = {}
    for b in active_bookings:
        name = b.get("photographer_name")
        if not name:
            continue
            
        p = per_pho.setdefault(name, {
            "name": name, 
            "sessions": 0, 
            "revenue": 0.0, 
            "fee": 0.0, 
            "fee_unpaid": 0.0,
            "clients": [] 
        })
        p["sessions"] += 1
        p["revenue"] += b["amount_paid"]
        
        if b.get("photographer_id"):
            fee_val = b.get("photographer_fee", 0)
            p["fee"] += fee_val
            is_paid_pho = b.get("photographer_paid", False)
            if not is_paid_pho:
                p["fee_unpaid"] += fee_val
            
            p["clients"].append({
                "booking_id": b.get("booking_id"),
                "client_name": b.get("full_name"),
                "date": b.get("shoot_date"),
                "package_name": b.get("package_name"),
                "fee": fee_val,
                "is_paid": is_paid_pho
            })

    per_pkg = {}
    for b in active_bookings:
        pkg_revenue = float(b.get("package_price", 0)) + float(b.get("extra_charge", 0))
        p = per_pkg.setdefault(b["package_name"], {"name": b["package_name"], "count": 0, "revenue": 0.0})
        p["count"] += 1
        p["revenue"] += pkg_revenue

    monthly = {}
    for b in bookings:
        m = (b.get("shoot_date") or "")[:7]
        if not m:
            continue
        mm = monthly.setdefault(m, {"month": m, "dp": 0.0, "full": 0.0, "bookings": 0})
        mm["bookings"] += 1
        mm["dp" if b["payment_type"] == "dp" else "full"] += b["amount_paid"]

    status_counts = {}
    for b in bookings:
        status_counts[b["status"]] = status_counts.get(b["status"], 0) + 1

    upcoming = sorted([b for b in active_bookings if b.get("shoot_date", "") >= datetime.now(timezone.utc).strftime("%Y-%m-%d")], key=lambda x: (x["shoot_date"], x["start_time"]))[:5]
    for u in upcoming:
        u["balance_due"] = max((float(u.get("package_price", 0)) + float(u.get("extra_charge", 0))) - float(u.get("amount_paid", 0)), 0)
        u["gcal_link"] = gcal_link(u)

    return {
        "total_bookings": len(bookings), 
        "dp_income": dp_income, 
        "full_income": full_income,
        "total_income": total_income, 
        "total_turnover": total_turnover,
        "outstanding": outstanding,
        "photographer_fee_total": fee_total, 
        "photographer_fee_unpaid": fee_unpaid,
        "net_profit": net_profit_cash,          
        "net_profit_cash": net_profit_cash,     
        "net_profit_accrual": net_profit_accrual, 
        "per_photographer": sorted(per_pho.values(), key=lambda x: -x["fee"]),
        "per_package": sorted(per_pkg.values(), key=lambda x: -x["revenue"]),
        "monthly": sorted(monthly.values(), key=lambda x: x["month"]),
        "status_counts": status_counts, 
        "upcoming": upcoming,
    }

@api_router.get("/config")
async def config():
    return {"admin_whatsapp": ADMIN_WHATSAPP}

@api_router.get("/")
async def root():
    return {"message": "Radeyaphoto Booking API"}

app.include_router(api_router)

DEFAULT_PACKAGES = [
    {"name": "Paket Basic", "price": 250000, "duration_minutes": 60, "dp_amount": 100000, "description": "1 jam · 1 lokasi · 15 foto edit", "active": True},
    {"name": "Paket Standard", "price": 450000, "duration_minutes": 120, "dp_amount": 150000, "description": "2 jam · 2 lokasi · 30 foto edit · all raw", "active": True},
    {"name": "Paket Premium", "price": 750000, "duration_minutes": 180, "dp_amount": 250000, "description": "3 jam · bebas lokasi · 50 foto edit · album mini", "active": True},
]

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        
    try:
        await db.bookings.create_index("shoot_date")
        await db.bookings.create_index("photographer_id")
        logger.info("Database indexes for shoot_date and photographer_id created successfully")
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")

    if await db.packages.count_documents({}) == 0:
        for p in DEFAULT_PACKAGES:
            await db.packages.insert_one({"package_id": f"pkg_{uuid.uuid4().hex[:10]}", **p})
    if await db.photographers.count_documents({}) == 0:
        for n, f in [("Rizky", 150000), ("Dinda", 150000)]:
            await db.photographers.insert_one({"photographer_id": f"pho_{uuid.uuid4().hex[:10]}", "name": n, "phone": "", "fee_per_session": f, "active": True})
    
    admin_exists = await db.users.find_one({"email": ADMIN_EMAIL})
    
    pwd_bytes = ADMIN_PASSWORD_DEFAULT.encode('utf-8')[:72]
    hashed_pw = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

    if not admin_exists:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": ADMIN_EMAIL,
            "name": "Radeya Admin",
            "password_hash": hashed_pw,
            "created_at": now_iso()
        })
        logger.info("Default admin user created.")
    else:
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hashed_pw}})

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
