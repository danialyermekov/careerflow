"""Derived runtime paths; all external configuration is loaded in settings.py."""
from core.settings import get_settings

settings = get_settings()
SUPABASE_URL = settings.supabase_url
SUPABASE_PUBLISHABLE_KEY = settings.auth_public_key
SUPABASE_SECRET_KEY = settings.auth_secret_key
DATABASE_URL = settings.database_url.get_secret_value()
CORS_ORIGINS = settings.cors_origins
DEVELOPER_USER_IDS = settings.developer_supabase_user_ids
MODELS_DIR = settings.models_dir
DATA_DIR = settings.data_dir
DB_PATH = DATA_DIR / 'career_advisor.sqlite3'
CLASSIFIER_PATH = MODELS_DIR / 'classifier_model.joblib'
PREPROCESSOR_PATH_CLASSIFIER = MODELS_DIR / 'preprocessor_classifier.joblib'
PREPROCESSOR_PATH_DEMAND = MODELS_DIR / 'preprocessor_demand.joblib'
LASSO_FEATURES = MODELS_DIR / 'lasso_features.json'
DEMAND_MODEL_PARAMS = MODELS_DIR / 'demand_model_params.json'
VACANCY_DATA_PATH = DATA_DIR / 'vacancy_data.csv'
VECTORIZER_PATH = MODELS_DIR / 'tfidf_vectorizer.joblib'
PROFESSION_VECTORS_PATH = MODELS_DIR / 'profession_vectors.joblib'
PROFESSION_NAMES_PATH = MODELS_DIR / 'profession_names.joblib'
ROADMAP_PATH = MODELS_DIR / 'profession_profiles.json'
COURSES_PATH = DATA_DIR / 'all_courses.csv'
TOP_N_COURSES = 1
CLASS_NAMES = [
    'Business Analyst', 'Cloud Engineer', 'Data Analyst', 'Data Engineer',
    'Data Scientist', 'Machine Learning Engineer', 'Software Engineer',
]
