import pandas as pd
import numpy as np

def classification_features(df):
    '''Creates additional features for the classifier based on the input DataFrame.'''
    df = df.copy()
    # Tech skills and soft skills lists
    tech_skills = ['python', 'java', 'c_cpp', 'sql', 'machine_learning',
                   'data_analysis', 'cloud_computing', 'cybersecurity',
                   'web_development', 'devops', 'networking']
    soft_skills = ['communication', 'leadership', 'problem_solving', 'teamwork', 'adaptability']

    # Sum of tech and soft skills, and their ratio
    df['tech_total'] = df[tech_skills].sum(axis=1)
    df['soft_total'] = df[soft_skills].sum(axis=1)
    df['tech_soft_ratio'] = df['tech_total'] / (df['soft_total'] + 1)

    # Domain-specific composite features
    df['ds_score'] = df['machine_learning'] * 2 + df['data_analysis'] + df['sql'] + df['python']

    df['da_score'] = df['sql'] * 2 + df['data_analysis'] * 2 + df['communication']
    df['da_score_v2'] = (
        df['sql'] * 2 +
        df['data_analysis'] * 2 +
        df['python'] +
        df['communication'] +
        (1 - df['machine_learning']) +
        (1 - df['devops']) +
        (1 - df['cloud_computing'])
    )

    df['ba_score'] = (
        df['communication'] * 2 +
        df['leadership'] +
        df['problem_solving'] +
        df['data_analysis'] -
        df['python'] -
        df['machine_learning'] -
        df['devops']
    )


    df['mle_score'] = df['machine_learning'] * 2 + df['python'] + df['cloud_computing'] + df['devops']


    df['de_score'] = (
        df['sql'] * 2 +
        df['cloud_computing'] * 2 +
        df['devops'] * 2 +
        df['python'] +
        df['networking'] +
        (1 - df['machine_learning']) +
        (1 - df['data_analysis'])
    )


    df['se_score'] = (
        df['web_development'] * 2 +
        df['java'] * 2 +
        df['c_cpp'] +
        df['python'] +
        (1 - df['data_analysis']) +
        (1 - df['machine_learning'])
    )


    df['ce_score'] = (
        df['cloud_computing'] * 2 +
        df['devops'] * 2 +
        df['networking'] +
        df['cybersecurity'] +
        (1 - df['data_analysis']) -
        df['machine_learning']
    )

    # Binary features for specific role indicators
    df['is_data_engineer'] = ((df['sql'] == 1) & (df['cloud_computing'] == 1) & (df['devops'] == 1)).astype(int)
    df['is_data_analyst']  = ((df['sql'] == 1) & (df['data_analysis'] == 1) & (df['machine_learning'] == 0)).astype(int)
    df['is_software_dev']  = (((df['web_development'] == 1) | (df['java'] == 1)) & (df['data_analysis'] == 0)).astype(int)
    df['is_cloud_expert']  = ((df['cloud_computing'] == 1) & (df['devops'] == 1)).astype(int)
    
    df['is_heavy_ml']    = ((df['machine_learning'] == 1) & (df['python'] == 1)).astype(int)
    df['is_data_expert'] = ((df['sql'] == 1) & (df['data_analysis'] == 1)).astype(int)


    df['dev_vs_data'] = (df['web_development'] + df['java'] + df['c_cpp']) - (df['data_analysis'] + df['sql'])
    
    df['ml_vs_dev'] = df['machine_learning'] - (df['web_development'] + df['java'])

    df['analytics_no_infra'] = df['data_analysis'] + df['sql'] - df['devops'] - df['cloud_computing']
    df['infra_no_analytics'] = df['devops'] + df['cloud_computing'] + df['networking'] - df['data_analysis']
    df['da_vs_ds'] = df['data_analysis'] - df['machine_learning']

    return df


def demand_features(
    df: pd.DataFrame,
    group_col: str = 'job_title_unified',
    time_col: str = 'job_posted_date'
) -> pd.DataFrame:
    """Creates time series features for the given DataFrame grouped by the specified column."""

    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col])
    df.sort_values([group_col, time_col], inplace=True)
    df.reset_index(drop=True, inplace=True)

    grp = df.groupby(group_col, sort=False)['vacancy_count']

    # Date features
    df['month'] = df[time_col].dt.month
    df['quarter'] = df[time_col].dt.quarter
    df['is_month_start'] = df[time_col].dt.is_month_start.astype(int)
    df['week_of_year'] = df[time_col].dt.isocalendar().week.astype(int)
    df['is_month_end'] = df[time_col].dt.is_month_end.astype(int)
    df['is_quarter_start'] = df[time_col].dt.is_quarter_start.astype(int)
    df['is_quarter_end'] = df[time_col].dt.is_quarter_end.astype(int)
    df['week_sin'] = np.sin(2 * np.pi * df['week_of_year'] / 52)
    df['week_cos'] = np.cos(2 * np.pi * df['week_of_year'] / 52)

    # Lag features
    df['lag_1'] = grp.shift(1)
    df['lag_2'] = grp.shift(2)
    df['lag_3'] = grp.shift(3)
    df['lag_4'] = grp.shift(4)

    # Rolling mean features inside each group
    df['rolling_mean_2'] = grp.transform(
        lambda s: s.shift(1).rolling(window=2, min_periods=2).mean()
    )
    df['rolling_mean_4'] = grp.transform(
        lambda s: s.shift(1).rolling(window=4, min_periods=4).mean()
    )

    # Residual features based on grouped rolling mean
    residual = df['vacancy_count'] - df['rolling_mean_2']
    df['residual_lag1'] = residual.groupby(df[group_col], sort=False).shift(1)
    df['residual_lag2'] = residual.groupby(df[group_col], sort=False).shift(2)

    # Rolling std features inside each group
    df['rolling_std_2'] = grp.transform(
        lambda s: s.shift(1).rolling(window=2, min_periods=2).std()
    )
    df['rolling_std_4'] = grp.transform(
        lambda s: s.shift(1).rolling(window=4, min_periods=4).std()
    )

    # EWM inside each group
    df['ewm_0.1'] = grp.transform(
        lambda s: s.shift(1).ewm(alpha=0.1, adjust=False).mean()
    )
    df['ewm_0.5'] = grp.transform(
        lambda s: s.shift(1).ewm(alpha=0.5, adjust=False).mean()
    )
    df['ewm_0.9'] = grp.transform(
        lambda s: s.shift(1).ewm(alpha=0.9, adjust=False).mean()
    )

    # Expanding features inside each group
    df['expanding_mean'] = grp.transform(
        lambda s: s.shift(1).expanding(min_periods=1).mean()
    )
    df['expanding_std'] = grp.transform(
        lambda s: s.shift(1).expanding(min_periods=2).std()
    )
    df['expanding_max'] = grp.transform(
        lambda s: s.shift(1).expanding(min_periods=1).max()
    )
    df['expanding_min'] = grp.transform(
        lambda s: s.shift(1).expanding(min_periods=1).min()
    )

    # Difference features inside each group
    df['diff_1'] = grp.transform(lambda s: s.shift(1) - s.shift(2))
    df['diff_2'] = grp.transform(lambda s: s.shift(2) - s.shift(3))
    df['diff_3'] = grp.transform(lambda s: s.shift(3) - s.shift(4))

    # Percentage change features inside each group
    def safe_pct_change(series, lag_a, lag_b):
        a = series.shift(lag_a)
        b = series.shift(lag_b)
        return np.where(b != 0, a / b - 1, np.nan)

    df['pct_change_1'] = grp.transform(lambda s: safe_pct_change(s, 1, 2))
    df['pct_change_2'] = grp.transform(lambda s: safe_pct_change(s, 2, 3))
    df['pct_change_3'] = grp.transform(lambda s: safe_pct_change(s, 3, 4))

    # Calendar features
    m = df[time_col].dt.month
    w = df['week_of_year']
    df['is_main_hiring_peak'] = (m.isin([1, 2])).astype(int)
    df['is_summer_hiring_peak'] = (m == 8).astype(int)
    df['is_may_slowdown'] = (m == 5).astype(int)
    df['is_december_slowdown'] = (m == 12).astype(int)
    df['is_post_peak_spring'] = (m.isin([3, 4])).astype(int)
    df['is_early_summer_recovery'] = (m.isin([6, 7])).astype(int)
    df['is_stable_plateau'] = (m.isin([9, 10, 11])).astype(int)
    df['is_q1_peak'] = (df['quarter'] == 1).astype(int)
    df['is_q2_low'] = (df['quarter'] == 2).astype(int)
    df['is_q3_second'] = (df['quarter'] == 3).astype(int)
    df['is_new_year_holidays'] = ((m == 1) & (w.between(1, 2))).astype(int)
    df['is_may_holidays'] = ((m == 5) & (w.between(18, 19))).astype(int)
    df['is_nauryz_week'] = ((m == 3) & (w.between(11, 12))).astype(int)
    df['is_graduation_season'] = (m.isin([6, 7])).astype(int)

    return df
