export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      colegios: {
        Row: {
          id: string
          nombre: string
          rut: string | null
          direccion: string | null
          telefono: string | null
          logo_url: string | null
          plan: 'basico' | 'profesional' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['colegios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['colegios']['Insert']>
      }
      usuarios: {
        Row: {
          id: string
          colegio_id: string | null
          email: string
          nombre: string
          apellido: string
          rol: 'super_admin' | 'admin' | 'tutor' | 'apoderado' | 'alumno'
          avatar_url: string | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }
      fichas: {
        Row: {
          id: string
          colegio_id: string
          titulo: string
          descripcion: string | null
          materia: 'lenguaje' | 'matematicas' | 'ciencias' | 'historia' | 'ingles' | 'artes' | 'educacion_fisica' | 'otro'
          grado: string
          tipo: 'ejercicio' | 'evaluacion' | 'cuento' | 'manualidad' | 'guia'
          archivo_url: string | null
          miniatura_url: string | null
          es_publica: boolean
          valoraciones_total: number
          valoraciones_suma: number
          descargas: number
          creado_por: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['fichas']['Row'], 'id' | 'valoraciones_total' | 'valoraciones_suma' | 'descargas' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['fichas']['Insert']>
      }
      alumnos: {
        Row: {
          id: string
          colegio_id: string
          nombre: string
          apellido: string
          rut: string | null
          fecha_nacimiento: string | null
          curso: string
          nivel: string
          foto_url: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['alumnos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['alumnos']['Insert']>
      }
      familias: {
        Row: {
          id: string
          colegio_id: string
          alumno_id: string
          nombre_apoderado: string
          apellido_apoderado: string
          email: string
          telefono: string | null
          rut: string | null
          direccion: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['familias']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['familias']['Insert']>
      }
      conceptos_cobro: {
        Row: {
          id: string
          colegio_id: string
          nombre: string
          descripcion: string | null
          monto: number
          periodicidad: 'mensual' | 'trimestral' | 'anual' | 'unico'
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['conceptos_cobro']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['conceptos_cobro']['Insert']>
      }
      cobros: {
        Row: {
          id: string
          colegio_id: string
          familia_id: string
          alumno_id: string
          concepto_id: string
          monto: number
          monto_pagado: number
          mes: number
          anio: number
          fecha_vencimiento: string
          fecha_pago: string | null
          estado: 'pendiente' | 'pagado' | 'mora' | 'parcial' | 'anulado'
          medio_pago: 'transferencia' | 'webpay' | 'efectivo' | 'cheque' | 'app' | null
          observaciones: string | null
          factura_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cobros']['Row'], 'id' | 'monto_pagado' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cobros']['Insert']>
      }
      pagos: {
        Row: {
          id: string
          cobro_id: string
          monto: number
          medio_pago: string
          referencia: string | null
          registrado_por: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pagos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pagos']['Insert']>
      }
    }
    Views: {
      resumen_cobros_mes: {
        Row: {
          colegio_id: string
          mes: number
          anio: number
          total_cobros: number
          total_recaudado: number
          total_mora: number
          familias_al_dia: number
          familias_mora: number
        }
      }
    }
    Functions: {
      get_morosidad_historica: {
        Args: { p_colegio_id: string; p_meses: number }
        Returns: Array<{ mes: number; anio: number; porcentaje_mora: number }>
      }
    }
  }
}
