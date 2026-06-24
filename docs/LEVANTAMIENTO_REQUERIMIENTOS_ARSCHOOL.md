# AR School — Levantamiento de Requerimientos

**Fecha:** Junio 2026  
**Preparado por:** Pablo Encina — Fundación ARM Global  
**Objetivo:** Centralizar toda la operación educativa de AR School en una sola plataforma, eliminando la dependencia de herramientas dispersas (WhatsApp, Drive, Classroom, planillas) y ofreciendo una experiencia profesional a familias y equipo docente.

---

## 1. Situación Actual

### Herramientas en uso hoy:
| Necesidad | Herramienta actual | Problema |
|---|---|---|
| Comunicación con familias | WhatsApp (grupos) | Sin control, mensajes se pierden, no se puede deshabilitar |
| Fichas pedagógicas | Google Classroom | Disperso, no integrado con evaluaciones |
| Listas de asistencia | Google Drive (planillas) | Manual, sin reportes automáticos |
| Planificaciones docentes | Google Drive | Sin visibilidad para coordinación |
| Actividades y documentos | Google Drive | Fragmentado por carpetas |
| Reportes diarios PreSchool | Feedback verbal al retirar niño | Sin registro, no llega al papá que no retira |
| Evaluaciones | Estructura propia (no solo pruebas) | Sin plataforma unificada |
| Contenido académico | Santillana + Cambridge (externas) | No integradas entre sí |

### Diagnóstico:
La operación depende de 5+ herramientas desconectadas. No existe una fuente única de verdad. Las familias no tienen un canal formal y controlado. El equipo docente pierde tiempo operativo en tareas manuales que podrían automatizarse.

---

## 2. Visión: AR School Platform

Una plataforma única donde:
- **Las familias** tienen un portal con toda la información de su hijo (comunicados, evaluaciones, asistencia, pagos, reportes diarios)
- **Los docentes** gestionan planificaciones, asistencia, evaluaciones y actividades desde un solo lugar
- **La administración** tiene control total con indicadores en tiempo real
- **La coordinación** puede supervisar sin intermediarios

---

## 3. Funcionalidades Requeridas — Análisis de Brechas

### ✅ YA IMPLEMENTADO en AR School Platform

| Funcionalidad | Estado | Descripción |
|---|---|---|
| Multi-sede | ✅ Operativo | Gestión de múltiples colegios desde una cuenta fundación |
| Gestión de alumnos | ✅ Operativo | CRUD completo con datos de apoderado |
| Asistencias | ✅ Operativo | Registro diario por curso con estados (presente, ausente, tardanza, justificado) |
| Evaluaciones (% logro) | ✅ Operativo | Escala 0-100% con niveles: Destacado, Logrado, En desarrollo, Inicial |
| Comunicados | ✅ Operativo | Envío masivo con confirmación de lectura |
| Cobranzas y pagos | ✅ Operativo | Planes de cobro, registro de pagos, estado de mora |
| Portal familias | ✅ Operativo | Asistencias, evaluaciones, comunicados, pagos |
| Calendario escolar | ✅ Operativo | Eventos y evaluaciones |
| Fichas pedagógicas | ✅ Operativo | Biblioteca de recursos compartidos |
| Planificación docente | ✅ Operativo | Semanal por materia/curso |
| Libro de clases | ✅ Operativo | Registro diario de actividades |
| Reportes | ✅ Operativo | KPIs + exportación CSV |
| Boletín PDF | ✅ Operativo | Generación individual por alumno |
| Onboarding familias | ✅ Operativo | Código de invitación autogestionado |
| Gestión de usuarios | ✅ Operativo | Creación por rol desde el sistema |
| Password reset | ✅ Operativo | Flujo completo de recuperación |

---

### 🔴 FALTA IMPLEMENTAR — Prioridad Alta

#### 3.1 Chat Interno (Reemplazo de WhatsApp)
**Necesidad:** Eliminar grupos de WhatsApp. Centralizar toda la comunicación en la plataforma con control administrativo.

**Funcionalidades requeridas:**
- Chat 1 a 1 entre tutor y apoderado
- Chat grupal por curso (tutor → todos los apoderados del curso)
- Posibilidad de **habilitar/deshabilitar chat** por usuario o grupo
- Notificaciones push (futuro: app móvil)
- Historial de mensajes accesible para coordinación
- Archivos adjuntos (fotos, PDFs)
- Sin posibilidad de que apoderados chateen entre sí (solo con staff)

**Referencia:** Similar a cómo lo hace Cuaderno Rojo — un canal único entre colegio y familia.

---

#### 3.2 Reporte Diario PreSchool (Reporte de las Tías)
**Necesidad:** Las educadoras de preescolar registran digitalmente el estado diario del niño. El apoderado recibe el reporte sin necesidad de feedback verbal al retiro.

**Campos del reporte:**
- **Alimentación:** Desayuno/Almuerzo/Snack — % consumido (todo, casi todo, poco, nada)
- **Siesta:** Durmió (sí/no) — duración aproximada
- **Higiene:** Cantidad de cambios de pañal / idas al baño, deposiciones
- **Estado emocional:** Feliz, tranquilo, irritable, llorón
- **Salud:** Llegó con golpe, fiebre, se administró medicamento
- **Actividades del día:** Texto libre + selección de actividades (música, arte, motricidad, etc.)
- **Observaciones:** Comentario libre de la educadora

**Flujo:**
1. Educadora marca items durante el día en el sistema (checkboxes + selects)
2. Al finalizar la jornada, se publica el reporte
3. El apoderado lo ve inmediatamente en su portal
4. No necesita esperar al retiro para saber cómo estuvo su hijo

---

#### 3.3 Repositorio de Documentos (Reemplazo de Drive)
**Necesidad:** Todos los documentos del año escolar centralizados en la plataforma, organizados y accesibles por rol.

**Estructura:**
- Documentos institucionales (reglamento, PEI, protocolos)
- Planificaciones anuales y semestrales
- Material por materia/curso
- Documentos administrativos (contratos, actas)
- Acceso controlado por rol (docente ve lo pedagógico, admin ve todo)

**Funcionalidades:**
- Subida de archivos (PDF, Word, imágenes)
- Carpetas por categoría
- Buscador
- Permisos por rol

---

#### 3.4 Estructura de Evaluación Ampliada
**Necesidad:** La evaluación no es solo una prueba. Debe contemplar múltiples instancias evaluativas que componen el resultado final.

**Estructura requerida:**
- **Unidad de aprendizaje** (agrupa evaluaciones)
- Dentro de cada unidad: pruebas, trabajos, presentaciones, participación
- Cada instancia con su ponderación (ej: prueba 40%, trabajo 30%, participación 30%)
- El % de logro final es el promedio ponderado de todas las instancias
- Rango: 10% al 100%
- Visualización por alumno: desglose de cada instancia + resultado final

---

### 🟡 FALTA IMPLEMENTAR — Prioridad Media

#### 3.5 Integración con Plataformas Externas
**Necesidad:** AR School usa Santillana y Cambridge como complemento académico. Idealmente se linkea desde la plataforma.

**Propuesta:**
- Sección "Recursos externos" con accesos directos (links)
- Posibilidad de embeber contenido o abrir en nueva pestaña
- Organizado por materia/curso
- No requiere integración API compleja (solo enlaces administrables)

---

#### 3.6 App Móvil (PWA o Nativa)
**Necesidad:** Las familias acceden principalmente desde el celular. La experiencia web es funcional pero una app mejoraría la adopción.

**Opciones:**
- **Corto plazo:** PWA (Progressive Web App) — se instala desde el navegador, funciona offline parcial
- **Mediano plazo:** App nativa React Native — con push notifications reales

---

## 4. Priorización Sugerida

| # | Funcionalidad | Impacto | Complejidad | Prioridad |
|---|---|---|---|---|
| 1 | Reporte diario PreSchool | Alto — elimina problema inmediato | Media | **Sprint 1** |
| 2 | Chat interno | Alto — elimina WhatsApp | Alta | **Sprint 2** |
| 3 | Estructura evaluación ampliada | Alto — core académico | Media | **Sprint 2** |
| 4 | Repositorio documentos | Medio — reemplaza Drive | Media | **Sprint 3** |
| 5 | Integración Santillana/Cambridge | Bajo — solo links | Baja | **Sprint 3** |
| 6 | App móvil (PWA) | Medio — UX familias | Media | **Sprint 4** |

---

## 5. Comparativa con Cuaderno Rojo

| Funcionalidad | Cuaderno Rojo | AR School (actual) | AR School (con plan) |
|---|---|---|---|
| Comunicados | ✅ | ✅ | ✅ |
| Chat interno | ✅ | ❌ | ✅ Sprint 2 |
| Asistencias | ✅ | ✅ | ✅ |
| Evaluaciones | ✅ (notas) | ✅ (% logro) | ✅ + ponderado |
| Cobranzas | ✅ + Mercado Pago | ✅ (manual) | ✅ |
| Facturación electrónica | ✅ (SII) | ❌ | Evaluable |
| Reporte jardín/PreSchool | ✅ | ❌ | ✅ Sprint 1 |
| App móvil | ✅ | ❌ | ✅ Sprint 4 (PWA) |
| Multi-sede | ✅ | ✅ | ✅ |
| Portal familias | ✅ | ✅ | ✅ |
| Fichas pedagógicas | ❌ | ✅ | ✅ |
| Planificación docente | ❌ | ✅ | ✅ |
| Libro de clases | ❌ | ✅ | ✅ |
| Repositorio docs | Parcial | ❌ | ✅ Sprint 3 |
| Personalización propia | ❌ (SaaS cerrado) | ✅ (100% nuestro) | ✅ |

**Ventaja competitiva de AR School:** Es 100% propio, personalizable a nuestras necesidades, sin costo por alumno, y con módulos pedagógicos que plataformas comerciales no ofrecen.

---

## 6. Infraestructura Actual

| Componente | Tecnología | Costo |
|---|---|---|
| Frontend + Backend | Next.js 14 (Vercel) | $0 (free tier) |
| Base de datos | Supabase PostgreSQL | $0 (free tier, hasta 500MB) |
| Hosting | Vercel — región São Paulo | $0 |
| Dominio | arschool-lrojo-six.vercel.app | $0 (custom domain ~$12/año) |
| **Total mensual** | | **$0** |

Al escalar (más de 100 usuarios concurrentes):
- Supabase Pro: ~$25/mes
- Vercel Pro: ~$20/mes
- **Total escalado: ~$45/mes** (vs Cuaderno Rojo que cobra $2-5 por alumno/mes)

---

## 7. Próximos Pasos

1. **Validar prioridades** con coordinación de AR School
2. **Definir pilotos** — ¿qué sede(s) empiezan primero?
3. **Cargar datos reales** — alumnos, cursos, docentes
4. **Capacitar equipo** — administrativo + docentes
5. **Comunicar a familias** — enviar códigos de invitación
6. **Sprint 1** — Implementar reporte diario PreSchool

---

*Documento generado para uso interno de Fundación ARM Global.*
