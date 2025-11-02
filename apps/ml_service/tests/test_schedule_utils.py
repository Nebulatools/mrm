import pytest

from apps.ml_service.app.schemas import ScheduleConfig, ScheduleFrequency
from apps.ml_service.app.utils.schedules import schedule_to_cron


def test_schedule_to_cron_daily():
  config = ScheduleConfig(frequency=ScheduleFrequency.DAILY, run_time='03:30')
  assert schedule_to_cron(config) == '30 3 * * *'


def test_schedule_to_cron_weekly():
  config = ScheduleConfig(frequency=ScheduleFrequency.WEEKLY, run_time='01:15', day_of_week='friday')
  assert schedule_to_cron(config) == '15 1 * * 5'


def test_schedule_to_cron_manual():
  config = ScheduleConfig(frequency=ScheduleFrequency.MANUAL, run_time='02:00')
  assert schedule_to_cron(config) is None
