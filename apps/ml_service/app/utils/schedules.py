from __future__ import annotations

from ..schemas import ScheduleConfig, ScheduleFrequency

_WEEKDAY_TO_CRON = {
    'sunday': '0',
    'monday': '1',
    'tuesday': '2',
    'wednesday': '3',
    'thursday': '4',
    'friday': '5',
    'saturday': '6',
}


def schedule_to_cron(schedule: ScheduleConfig) -> str | None:
    runtime = schedule.run_time
    minute = runtime.minute
    hour = runtime.hour
    if schedule.frequency == ScheduleFrequency.MANUAL:
        return None
    if schedule.frequency == ScheduleFrequency.DAILY:
        return f'{minute} {hour} * * *'
    if schedule.frequency == ScheduleFrequency.WEEKLY:
        weekday = schedule.day_of_week or 'monday'
        cron_weekday = _WEEKDAY_TO_CRON.get(weekday, '1')
        return f'{minute} {hour} * * {cron_weekday}'
    if schedule.frequency == ScheduleFrequency.MONTHLY:
        day = schedule.day_of_month or 1
        return f'{minute} {hour} {day} * *'
    if schedule.frequency == ScheduleFrequency.QUARTERLY:
        day = schedule.day_of_month or 1
        return f'{minute} {hour} {day} 1,4,7,10 *'
    return None
