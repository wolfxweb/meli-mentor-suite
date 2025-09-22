from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, mercado_livre, products
from app.database import engine, Base
from app.models import User, Company, MercadoLivreIntegration, CatalogCompetitor, ProductAdsData  # Import models to ensure they're registered

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestão Marketplace API",
    description="API para sistema de gestão de marketplace",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://a7123785c466.ngrok-free.app",
        "https://9e22d3eedf0c.ngrok-free.app",
        "https://a0f0011eda59.ngrok-free.app",
        "https://95e3e8757a41.ngrok-free.app",
        "https://3eea371eeddd.ngrok-free.app"
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(mercado_livre.router, prefix="/api/mercado-livre", tags=["Mercado Livre Integration"])
app.include_router(products.router, prefix="/api/mercado-livre", tags=["Products Management"])

@app.get("/")
async def root():
    return {"message": "Gestão Marketplace API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
