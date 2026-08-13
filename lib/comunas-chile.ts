/**
 * Comunas de Chile agrupadas por región.
 * Lista completa de las comunas principales (RM + regiones donde opera AR School).
 */

export interface RegionComunas {
  region: string
  comunas: string[]
}

export const REGIONES_COMUNAS: RegionComunas[] = [
  {
    region: 'Región Metropolitana',
    comunas: [
      'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
      'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja',
      'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
      'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda',
      'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal',
      'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
      'Santiago', 'Vitacura',
      // Provincia Cordillera
      'Puente Alto', 'Pirque', 'San José de Maipo',
      // Provincia Maipo
      'San Bernardo', 'Buin', 'Calera de Tango', 'Paine',
      // Provincia Talagante
      'Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor',
      // Provincia Melipilla
      'Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro',
      // Provincia Chacabuco
      'Colina', 'Lampa', 'Tiltil',
    ].sort(),
  },
  {
    region: 'Región de Magallanes',
    comunas: [
      'Punta Arenas', 'Porvenir', 'Puerto Natales', 'Cabo de Hornos',
      'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Timaukel', 'Torres del Paine',
    ].sort(),
  },
  {
    region: 'Región de Valparaíso',
    comunas: [
      'Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'Concón',
      'Quillota', 'La Calera', 'San Antonio', 'Los Andes', 'San Felipe',
      'Limache', 'Olmué', 'Casablanca',
    ].sort(),
  },
  {
    region: "Región del Libertador B. O'Higgins",
    comunas: [
      'Rancagua', 'Machalí', 'San Fernando', 'Rengo', 'Graneros',
      'Santa Cruz', 'Requínoa', 'Pichilemu',
    ].sort(),
  },
  {
    region: 'Región del Biobío',
    comunas: [
      'Concepción', 'Talcahuano', 'Chillán', 'Los Ángeles', 'Coronel',
      'Hualpén', 'San Pedro de la Paz', 'Chiguayante', 'Penco', 'Tomé',
    ].sort(),
  },
  {
    region: 'Región de La Araucanía',
    comunas: [
      'Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol',
      'Nueva Imperial', 'Lautaro', 'Victoria',
    ].sort(),
  },
  {
    region: 'Región de Los Lagos',
    comunas: [
      'Puerto Montt', 'Osorno', 'Castro', 'Puerto Varas', 'Ancud',
      'Calbuco', 'Dalcahue', 'Llanquihue',
    ].sort(),
  },
  {
    region: 'Otra región',
    comunas: [],
  },
]

/**
 * Lista plana de todas las comunas para búsqueda rápida
 */
export const TODAS_COMUNAS: string[] = REGIONES_COMUNAS
  .flatMap(r => r.comunas)
  .filter(Boolean)
  .sort()

/**
 * Previsiones de salud comunes en Chile
 */
export const PREVISIONES_SALUD = [
  'Fonasa',
  'Isapre Banmédica',
  'Isapre Colmena',
  'Isapre Cruz Blanca',
  'Isapre Consalud',
  'Isapre Vida Tres',
  'Isapre Nueva Masvida',
  'Otra Isapre',
  'Particular (sin previsión)',
  'Prais',
]

/**
 * Nacionalidades más comunes en el contexto AR School
 */
export const NACIONALIDADES = [
  'Chilena',
  'Venezolana',
  'Colombiana',
  'Peruana',
  'Argentina',
  'Ecuatoriana',
  'Boliviana',
  'Brasileña',
  'Haitiana',
  'Dominicana',
  'Mexicana',
  'Española',
  'Estadounidense',
  'Otra',
]

/**
 * Parentescos
 */
export const PARENTESCOS = [
  'Madre',
  'Padre',
  'Abuela',
  'Abuelo',
  'Tía / Tío',
  'Hermana / Hermano mayor',
  'Tutor legal',
  'Otro',
]
