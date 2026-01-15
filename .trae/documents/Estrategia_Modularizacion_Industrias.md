# Estrategia de Modularización para NexusCRM (Multi-Industria)

Para escalar NexusCRM y soportar múltiples verticales (Automotriz, Inmobiliaria, Seguros, etc.) sin reescribir el núcleo, se recomienda una **Arquitectura de Módulos (Plugin Architecture)** basada en configuración.

## 1. Estrategia de Base de Datos (Backend)

En lugar de crear tablas separadas para cada industria (ej. `coches`, `casas`), utilizamos un enfoque **flexible** sobre la tabla existente `contacts` y `deals`.

### A. Columna de Atributos Dinámicos
Añadir una columna JSON llamada `custom_attributes` o `industry_data` a las tablas `contacts` y `products`.

```sql
ALTER TABLE contacts ADD COLUMN industry_data JSON DEFAULT NULL;
ALTER TABLE products ADD COLUMN industry_data JSON DEFAULT NULL;
```

Esto permite guardar datos estructurados específicos sin cambiar el esquema:

**Ejemplo Automotriz:**
```json
{
  "vehicle_interest": "Ford Mustang",
  "year": 2024,
  "test_drive_date": "2024-12-01"
}
```

**Ejemplo Inmobiliaria:**
```json
{
  "property_type": "Apartment",
  "bedrooms": 3,
  "budget_max": 500000
}
```

## 2. Estrategia de Frontend (React)

El frontend no debe "quemar" (hardcode) los campos. Debe renderizarlos dinámicamente basándose en una configuración.

### A. Registro de Módulos
Crear un archivo de configuración `src/config/modules.ts`:

```typescript
export const MODULE_CONFIG = {
  automotive: {
    enabled: true,
    labels: {
      product: "Vehículo",
      deal: "Venta"
    },
    fields: [
      { key: "vehicle_model", label: "Modelo", type: "text" },
      { key: "test_drive", label: "Prueba de Manejo", type: "date" }
    ]
  },
  real_estate: {
    enabled: false,
    labels: {
      product: "Propiedad",
      deal: "Operación"
    },
    fields: [
      { key: "property_type", label: "Tipo de Propiedad", type: "select", options: ["Casa", "Depa"] }
    ]
  }
};
```

### B. Componente "FormBuilder"
Crear un componente que lea esta configuración y pinte los inputs correspondientes dentro del `ContactDetailsPanel` o `ProductModal`.

## 3. Estrategia de Pipelines (Procesos)

Cada industria tiene un flujo de venta diferente. NexusCRM ya soporta pipelines, pero podemos crear **Plantillas de Pipeline**.

*   **Automotriz**: `Contacto` -> `Prueba de Manejo` -> `Cotización` -> `Financiamiento` -> `Entrega`.
*   **Inmobiliaria**: `Interesado` -> `Visita` -> `Oferta` -> `Contrato` -> `Escrituración`.

Al crear una cuenta nueva o "activar" un módulo, un script SQL insertaría estos stages predefinidos en la tabla `pipeline_stages`.

## 4. Implementación por Fases

1.  **Fase 1 (Datos)**: Añadir campo `industry_data` (JSON) a la BD.
2.  **Fase 2 (Config)**: Crear sistema de configuración en React para ocultar/mostrar campos.
3.  **Fase 3 (UI)**: Crear "Vistas" personalizadas (ej. tarjeta de coche vs. tarjeta de casa).

---
*Este documento sirve como guía arquitectónica para futuras expansiones.*
