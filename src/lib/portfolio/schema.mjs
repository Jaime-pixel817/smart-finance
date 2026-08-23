// Esquema de las dos carteras del sitio: el Reto Actinver (dinero ficticio de
// un concurso estudiantil) y el portafolio personal (dinero real).
//
// POR QUÉ ESTÁ VALIDADO CON ZOD Y NO "confiamos en el JSON": los dos archivos
// los edita Jaime a mano, a veces con el reto encima. Un campo mal escrito no
// puede acabar en una página de dinero como un cero, un NaN o un hueco: tiene
// que TUMBAR el build y decir qué campo es. Por eso los objetos van en
// .strict() —una clave de más es un error tipográfico, no una extensión— y por
// eso el ejemplo documentado del propio archivo (_ejemplo) se valida con el
// mismo esquema que las posiciones de verdad: si el ejemplo que Jaime va a
// copiar dejara de ser válido, nos enteramos aquí.
//
// Lo que NO valida Zod y sí valida cartera.mjs: las cuentas. Aquí solo se
// comprueba la forma.
//
// ES UN .mjs Y NO UN .ts a propósito: el package.json del repo es
// "type": "commonjs", así que node --test no puede importar un .ts como
// módulo y estas reglas se quedarían sin pruebas. Los tipos siguen saliendo de
// aquí por inferencia (z.infer en data.ts), que es lo que comprueba
// `astro check`.
import { z } from 'astro/zod';

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'la fecha va en formato AAAA-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s + 'T12:00:00Z')), 'esa fecha no existe en el calendario');

/** Texto de Jaime. El español es obligatorio; el inglés, opcional. */
const texto = z
  .object({
    es: z.string().min(15, 'escríbelo con tus palabras: al menos una frase'),
    en: z.string().min(15).nullish()
  })
  .strict();

const operacion = z
  .object({
    fecha,
    precio: z.number().positive('el precio tiene que ser mayor que cero')
  })
  .strict();

const mercado = z.enum(['BMV', 'SIC', 'US', 'otro']);
/** Los mercados que entiende una posición (para documentarlo en un solo sitio). */
export const MERCADOS = mercado.options;

export const posicionSchema = z
  .object({
    /** Ticker en mayúsculas y sin sufijo de mercado: WALMEX, no WALMEX.MX. */
    ticker: z.string().regex(/^[A-Z0-9&.\-*]{1,12}$/, 'ticker en mayúsculas, sin el sufijo del mercado'),
    nombre: z.string().min(2),
    mercado,
    /** Clave de /api/history que trae el precio. null = sin precio automático. */
    historyPair: z.string().regex(/^[A-Z0-9]{1,16}$/).nullish(),
    /** id del registro de activos del sitio (src/data/symbols.ts), si lo tiene. */
    symbolId: z.string().nullish(),
    moneda: z.enum(['MXN', 'USD']).nullish(),
    entrada: operacion,
    /** Títulos comprados. Excluyente con `peso`. */
    cantidad: z.number().positive().nullish(),
    /** Fracción del capital inicial (0.15 = 15 %). Excluyente con `cantidad`. */
    peso: z.number().positive().max(1).nullish(),
    tesis: texto,
    riesgo: texto,
    estado: z.enum(['abierta', 'cerrada']),
    salida: operacion.nullish(),
    nota: texto.nullish()
  })
  .strict()
  .superRefine((p, ctx) => {
    const tieneCantidad = typeof p.cantidad === 'number';
    const tienePeso = typeof p.peso === 'number';
    if (tieneCantidad === tienePeso) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad'],
        message: 'una posición se declara con cantidad de títulos O con peso, no con las dos ni con ninguna'
      });
    }
    if (p.estado === 'cerrada' && !p.salida) {
      ctx.addIssue({ code: 'custom', path: ['salida'], message: 'una posición cerrada necesita fecha y precio de salida' });
    }
    if (p.estado === 'abierta' && p.salida) {
      ctx.addIssue({ code: 'custom', path: ['estado'], message: 'tiene salida pero sigue marcada como abierta' });
    }
    if (p.salida && p.salida.fecha < p.entrada.fecha) {
      ctx.addIssue({ code: 'custom', path: ['salida', 'fecha'], message: 'la venta no puede ser anterior a la compra' });
    }
  });

export const carteraSchema = z
  .object({
    _lee_esto: z.string().min(20),
    _comoAnadirUnaPosicion: z.array(z.string().min(10)).min(3),
    version: z.literal(1),
    tipo: z.enum(['actinver', 'personal']),
    moneda: z.enum(['MXN', 'USD']),
    /** Capital ficticio del concurso. null mientras no se sepa: no se inventa. */
    capitalInicial: z.number().positive().nullable(),
    inicio: fecha.nullable(),
    fin: fecha.nullable(),
    practica: z.object({ inicio: fecha, fin: fecha }).strict().nullable(),
    actualizado: fecha,
    posiciones: z.array(posicionSchema),
    /** Ejemplo que Jaime copia. Se valida igual, y NO cuenta en las cuentas. */
    _ejemplo: posicionSchema
  })
  .strict()
  .superRefine((c, ctx) => {
    c.posiciones.forEach((p, i) => {
      if (p.moneda && p.moneda !== c.moneda) {
        ctx.addIssue({
          code: 'custom',
          path: ['posiciones', i, 'moneda'],
          message: `esta cartera es en ${c.moneda} y aquí no se convierten divisas`
        });
      }
      if (typeof p.peso === 'number' && c.capitalInicial === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['posiciones', i, 'peso'],
          message: 'una posición por peso necesita que la cartera tenga capitalInicial'
        });
      }
      if (c.inicio && p.entrada.fecha < c.inicio) {
        ctx.addIssue({
          code: 'custom',
          path: ['posiciones', i, 'entrada', 'fecha'],
          message: `la compra es anterior al inicio de la cartera (${c.inicio})`
        });
      }
    });
    const suma = c.posiciones.reduce((a, p) => a + (typeof p.peso === 'number' ? p.peso : 0), 0);
    if (suma > 1.0001) {
      ctx.addIssue({ code: 'custom', path: ['posiciones'], message: `los pesos suman ${(suma * 100).toFixed(1)} % del capital` });
    }
  });

export const historialSchema = z
  .object({
    _lee_esto: z.string().min(20),
    version: z.literal(1),
    moneda: z.enum(['MXN', 'USD']),
    puntos: z
      .array(
        z
          .object({
            fecha,
            valor: z.number(),
            efectivo: z.number().nullable(),
            posiciones: z.number(),
            precios: z.record(z.string(), z.number())
          })
          .strict()
      )
      .superRefine((puntos, ctx) => {
        for (let i = 1; i < puntos.length; i++) {
          if (puntos[i].fecha <= puntos[i - 1].fecha) {
            ctx.addIssue({
              code: 'custom',
              path: [i, 'fecha'],
              message: 'los puntos van en orden y sin repetir fecha (lo escribe el workflow, no se edita a mano)'
            });
          }
        }
      })
  })
  .strict();

/**
 * Parsea y, si falla, tumba el build con el archivo y el campo exactos.
 * @template T
 * @param {import('astro/zod').ZodType<T>} schema
 * @param {unknown} valor
 * @param {string} archivo
 * @returns {T}
 */
export function leer(schema, valor, archivo) {
  const r = schema.safeParse(valor);
  if (r.success) return r.data;
  const lineas = r.error.issues.map((i) => `  · ${i.path.join('.') || '(raíz)'}: ${i.message}`);
  throw new Error(
    `${archivo} no cumple el esquema de la cartera:\n${lineas.join('\n')}\n` +
      `El esquema está en src/lib/portfolio/schema.mjs y el archivo trae instrucciones en "_comoAnadirUnaPosicion".`
  );
}
