import pandas as pd
import numpy as np
from datetime import datetime
from infrastructure.ml.features import demand_features
from infrastructure.ml.artifacts import load_demand, prepare_demand_model

class DemandService:
    def __init__(self):
        self.df, self.features, self.model_params, self.preprocessor = load_demand()
        self._cache = {}

        # Precompute the trained model during startup to avoid retraining on every request
        pred_date = self._get_prediction_date()
        self.model = prepare_demand_model(self.df, self.features, self.model_params, self.preprocessor, pred_date)

    def _get_prediction_date(self) -> pd.Timestamp:
        """
        Today's date is aligned to the end of the week (Sunday) of the year 2023 to ensure consistent demand predictions based on weekly trends. This allows us to provide stable and relevant demand scores for the professions, reflecting the most recent market conditions while avoiding fluctuations that can occur with daily data.
        """
        today = datetime.today()
        date_2023 = today.replace(year=2023)
        # Выравниваем по W (конец недели — воскресенье)
        return pd.Timestamp(date_2023).to_period('W').to_timestamp('W')



    def get_scores(self) -> dict:
        pred_date = self._get_prediction_date()
        week_key = str(pred_date)  # кэш по неделе

        # Cash check
        if week_key in self._cache:
            return self._cache[week_key]

        # Compute scores if not in cache
        scores = self._compute_scores(pred_date)
        self._cache[week_key] = scores
        return scores
    

    def _compute_scores(self, pred_date) -> dict:
        '''Compute demand scores for each profession based on vacancy trends and market share.'''
        df_train = self.df[self.df['job_posted_date'] <= pred_date].copy()

        df_features = demand_features(df_train)
        df_features = df_features.dropna()

        # Model is already fit during initialization, skip self.model.fit()

        last_rows = (
            df_features
            .sort_values('job_posted_date')
            .groupby('job_title_unified')
            .tail(1)
        )

        X = last_rows
        X_processed = self.preprocessor.transform(X)

        professions = last_rows['job_title_unified'].values
        preds = self.model.predict(X_processed[self.features])

        pred_df = pd.DataFrame({
            'profession': professions,
            'predicted': np.maximum(preds, 0)
        })

        max_vacancies = (
            self.df.groupby('job_title_unified')['vacancy_count']
            .max()
            .to_dict()
        )

        total_pred = pred_df['predicted'].sum() or 1

        scores = {}
        for _, row in pred_df.iterrows():
            prof = row['profession']
            pred = row['predicted']
            max_val = max_vacancies.get(prof, 1)

            scores[prof] = {
                'trend_score':         float(round(pred / max_val, 3)),
                'market_share':        float(round(pred / total_pred, 3)),
                'predicted_vacancies': int(round(pred))
            }

        return dict(sorted(
            scores.items(),
            key=lambda x: x[1]['trend_score'],
            reverse=True
        ))
