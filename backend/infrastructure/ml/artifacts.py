"""Disk loading and historical demand preparation, separate from inference."""
import json

import joblib
import pandas as pd
from lightgbm import LGBMRegressor

from core import config
from infrastructure.ml.features import demand_features


def load_classifier():
    return joblib.load(config.CLASSIFIER_PATH), joblib.load(config.PREPROCESSOR_PATH_CLASSIFIER)


def load_skill_matcher():
    return (joblib.load(config.VECTORIZER_PATH), joblib.load(config.PROFESSION_VECTORS_PATH),
            joblib.load(config.PROFESSION_NAMES_PATH))


def load_courses():
    with config.ROADMAP_PATH.open() as source:
        profiles = json.load(source)
    return pd.read_csv(config.COURSES_PATH), profiles


def load_demand():
    data = pd.read_csv(config.VACANCY_DATA_PATH)
    data['job_posted_date'] = pd.to_datetime(data['job_posted_date'])
    with config.LASSO_FEATURES.open() as source:
        features = json.load(source)
    with config.DEMAND_MODEL_PARAMS.open() as source:
        parameters = json.load(source)
    return data, features, parameters, joblib.load(config.PREPROCESSOR_PATH_DEMAND)


def prepare_demand_model(data, features, parameters, preprocessor, prediction_date):
    # Preserve legacy week-dependent initialization; no saved runtime estimator exists.
    training = demand_features(data[data['job_posted_date'] <= prediction_date].copy()).dropna()
    transformed = preprocessor.transform(training.drop(columns=['vacancy_count']))
    model = LGBMRegressor(**parameters, verbose=-1)
    model.fit(transformed[features], training['vacancy_count'])
    return model
