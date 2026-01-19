# Developer Guide

Guías técnicas detalladas para desarrolladores que trabajan en el HR KPI Dashboard.

## Contenido

| Documento | Descripción |
|-----------|-------------|
| [AI_SYSTEM.md](./AI_SYSTEM.md) | Documentación completa del sistema de AI (prompts, configuración, debugging) |

## Propósito

Este folder contiene documentación técnica avanzada para:

1. **Debugging** - Localizar exactamente qué archivo y línea modificar
2. **Modificación de prompts** - Entender la estructura y ajustar comportamiento de AI
3. **Umbrales y reglas** - Comprender las reglas de negocio implementadas
4. **Flujos de datos** - Visualizar cómo fluye la información a través del sistema

## Cómo usar esta documentación

### Para modificar prompts de AI:

1. Consulta `AI_SYSTEM.md` sección "4. PROMPTS LITERALES"
2. Localiza el prompt específico con su archivo y línea exacta
3. Modifica el archivo fuente siguiendo las guías de debugging

### Para ajustar umbrales:

1. Consulta `AI_SYSTEM.md` sección "5. UMBRALES Y REGLAS DE NEGOCIO"
2. Los umbrales están documentados con su ubicación en el código
3. Considera el impacto en las detecciones de anomalías/tendencias

### Para debugging:

1. Consulta `AI_SYSTEM.md` sección "10. GUÍA DE DEBUGGING"
2. Usa los console.logs sugeridos para rastrear problemas
3. Verifica que las API keys estén configuradas correctamente

## Archivos clave del sistema de AI

```
apps/web/src/
├── lib/
│   ├── gemini-ai.ts         # Servicio Gemini (análisis estructurado)
│   └── ai-analyzer.ts       # Análisis local con reglas
└── app/api/
    └── narrative/route.ts   # Endpoint OpenAI (narrativas)
```

## Variables de entorno requeridas

```bash
NEXT_PUBLIC_GEMINI_API_KEY=AIza...  # Para análisis de KPIs
OPENAI_API_KEY=sk-...               # Para narrativas contextuales
```
