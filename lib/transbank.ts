import { WebpayPlus, Options, Environment } from 'transbank-sdk'

// Configuración de Transbank Webpay Plus
const isProduction = process.env.TRANSBANK_ENVIRONMENT === 'production'

const commerceCode = isProduction
  ? process.env.TRANSBANK_COMMERCE_CODE!
  : '597055555532' // Código de pruebas

const apiKey = isProduction
  ? process.env.TRANSBANK_API_KEY!
  : '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C' // Key de pruebas

// Crear instancia de Transaction con Options
export function getWebpayTransaction() {
  const options = new Options(commerceCode, apiKey, isProduction ? Environment.Production : Environment.Integration)
  return new WebpayPlus.Transaction(options)
}

export { WebpayPlus, Environment }
