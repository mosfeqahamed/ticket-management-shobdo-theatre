from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.contacts.router import router as contacts_router
from app.dramas.router import router as dramas_router
from app.sms.router import router as sms_router

app = FastAPI(title="Ticket SMS Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(contacts_router)
app.include_router(dramas_router)
app.include_router(sms_router)


@app.get("/")
def health():
    return {"status": "running"}
