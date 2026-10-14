import os

# Dummy settings so importing the app doesn't require real credentials.
# No test here actually opens the DB pool or calls Supabase/Claude.
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/postgres")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
