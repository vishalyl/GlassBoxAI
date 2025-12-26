from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # Application
    APP_NAME: str = "GlassBox AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database - Using SQLite for local development
    DATABASE_URL: str = "sqlite:///./glassbox.db"
    
    # Security
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
