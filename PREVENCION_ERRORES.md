# Guía de Prevención de Errores y Seguridad de Datos

Para evitar que se repita una pérdida o consolidación accidental de datos históricos, se recomiendan las siguientes prácticas:

## 1. Backups Periódicos
- **Supabase Dashboard**: Exportar semanalmente las tablas críticas (`clients`, `stock_batches`, `milling_logs`) a CSV o JSON.
- **Scripts de Respaldo**: Usar scripts como `db-audit.js` antes de cualquier intervención técnica para tener una "foto" del estado actual.

## 2. Protocolo de Modificación de Datos
- **No usar scripts destructivos en producción**: Antes de ejecutar un `.delete()` o `.update()` masivo, probar siempre con un `.select()` para confirmar los registros afectados.
- **Evitar la Consolación Forzada**: El sistema está diseñado para usar FIFO (First-In-First-Out) basado en lotes individuales. No se deben sumar los lotes manualmente en un solo registro de "Cumulative", ya que esto borra el historial de ingresos por día.

## 3. Seguridad de Acceso (RLS)
- Hemos confirmado que tablas como `milling_logs` están protegidas por políticas de seguridad (RLS). Esto es bueno porque evita que scripts externos o errores de código borren datos sin autorización.
- Para registros manuales de emergencia, se recomienda usar el **Editor SQL de Supabase** directamente por personal autorizado.

## 4. Auditoría de Cambios
- Se recomienda implementar una tabla de `audit_logs` en el futuro para registrar qué usuario realizó cada cambio manual en el stock.

---
_Este documento es una guía técnica para los administradores del sistema._
