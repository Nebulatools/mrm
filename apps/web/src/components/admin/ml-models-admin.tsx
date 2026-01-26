'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, Clock, Play } from 'lucide-react';

type Frequency = 'manual' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

type MlModelSchedule = {
  frequency: Frequency;
  cron_expression?: string | null;
  next_run?: string | null;
};

type MlModelInfo = {
  id: string;
  name: string;
  description: string;
  type: string;
  version: string;
  last_trained_at?: string | null;
  metrics: Record<string, number | string>;
  schedule?: MlModelSchedule | null;
};

type ScheduleFormState = {
  frequency: Frequency;
  day_of_week: string;
  day_of_month: number;
  run_time: string;
};

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
];

const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const TYPE_LABELS: Record<string, string> = {
  classification: 'Clasificación',
  regression: 'Regresión',
  clustering: 'Clustering',
  time_series: 'Serie de tiempo',
  survival: 'Supervivencia',
  recommender: 'Recomendador',
};

function parseCron(cron: string | null | undefined, frequency: Frequency): Partial<ScheduleFormState> {
  if (!cron) {
    return {};
  }
  const parts = cron.trim().split(' ');
  if (parts.length < 5) {
    return {};
  }
  const [minute, hour, day, month, weekday] = parts;
  const base: Partial<ScheduleFormState> = {
    run_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  };
  if (frequency === 'weekly') {
    const map: Record<string, string> = {
      '0': 'sunday',
      '7': 'sunday',
      '1': 'monday',
      '2': 'tuesday',
      '3': 'wednesday',
      '4': 'thursday',
      '5': 'friday',
      '6': 'saturday',
    };
    base.day_of_week = map[weekday] ?? 'monday';
  }
  if (frequency === 'monthly' || frequency === 'quarterly') {
    const dayValue = parseInt(day, 10);
    if (!Number.isNaN(dayValue)) {
      base.day_of_month = dayValue;
    }
  }
  return base;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Sin registros';
  }
  try {
    return format(new Date(value), "PPpp", { locale: es });
  } catch (error) {
    return value;
  }
}

function MetricsList({ metrics }: { metrics: Record<string, number | string> }) {
  const entries = Object.entries(metrics || {});
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Sin métricas aún.</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <li key={key} className="text-sm">
          <span className="font-medium mr-2 capitalize">{key.replace(/_/g, ' ')}:</span>
          <span>{typeof value === 'number' ? value.toFixed(3) : String(value)}</span>
        </li>
      ))}
    </ul>
  );
}

type ModelCardProps = {
  model: MlModelInfo;
  onRefresh: () => Promise<void>;
};

function ModelCard({ model, onRefresh }: ModelCardProps) {
  const [training, setTraining] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const defaultSchedule: ScheduleFormState = useMemo(() => {
    const frequency = model.schedule?.frequency ?? 'manual';
    const base: ScheduleFormState = {
      frequency,
      day_of_week: 'monday',
      day_of_month: 1,
      run_time: '02:00',
    };
    const parsed = parseCron(model.schedule?.cron_expression, frequency);
    return { ...base, ...parsed };
  }, [model.schedule]);

  const [form, setForm] = useState<ScheduleFormState>(defaultSchedule);

  useEffect(() => {
    setForm(defaultSchedule);
  }, [defaultSchedule]);

  const handleTrain = async () => {
    setTraining(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/ml/models/${model.id}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'No se pudo entrenar el modelo');
      }
      await onRefresh();
      setMessage('Entrenamiento disparado correctamente');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setTraining(false);
    }
  };

  const handleScheduleSave = async () => {
    setSavingSchedule(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        frequency: form.frequency,
        run_time: form.run_time,
      };
      if (form.frequency === 'weekly') {
        payload.day_of_week = form.day_of_week;
      }
      if (form.frequency === 'monthly' || form.frequency === 'quarterly') {
        payload.day_of_month = form.day_of_month;
      }

      const response = await fetch(`/api/ml/models/${model.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'No se pudo actualizar la programación');
      }
      await onRefresh();
      setMessage('Programación guardada');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSavingSchedule(false);
    }
  };

  const tagLabel = TYPE_LABELS[model.type] ?? model.type;

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <CardTitle className="flex-1 text-lg sm:text-xl">{model.name}</CardTitle>
          <Badge variant="secondary">{tagLabel}</Badge>
        </div>
        <CardDescription>{model.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Último entrenamiento: {formatDate(model.last_trained_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Próxima corrida:{' '}
              {model.schedule?.next_run ? formatDate(model.schedule.next_run) : 'No programada'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">v{model.version}</Badge>
          </div>
        </div>
        <Separator />
        <MetricsList metrics={model.metrics} />
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Programación automática</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Frecuencia</label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, frequency: value as Frequency }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-muted-foreground">Hora (HH:MM)</label>
              <Input
                type="time"
                value={form.run_time}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, run_time: event.target.value }))
                }
                className="mt-1"
              />
            </div>
            {form.frequency === 'weekly' && (
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground">Día</label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, day_of_week: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.frequency === 'monthly' || form.frequency === 'quarterly') && (
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground">Día del mes</label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.day_of_month}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      day_of_month: Number(event.target.value ?? 1),
                    }))
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button onClick={handleTrain} disabled={training}>
            {training ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Entrenar ahora</span>
          </Button>
          <Button variant="outline" onClick={handleScheduleSave} disabled={savingSchedule}>
            {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Guardar programación</span>
          </Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardFooter>
    </Card>
  );
}

export function MlModelsAdmin() {
  const [models, setModels] = useState<MlModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    setError(null);
    try {
      const response = await fetch('/api/ml/models', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'No se pudo cargar la lista de modelos');
      }
      const data = (await response.json()) as MlModelInfo[];
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Analítica Avanzada</CardTitle>
          <CardDescription>Preparando información de modelos…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Analítica Avanzada</CardTitle>
          <CardDescription>Error al cargar los modelos</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-red-500">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Modelos de Analítica Avanzada</h2>
        <p className="text-sm text-muted-foreground">
          Entrena y ajusta la programación automática de los modelos de data science.
        </p>
      </div>
      <div className="grid gap-4">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} onRefresh={loadModels} />
        ))}
      </div>
    </div>
  );
}
