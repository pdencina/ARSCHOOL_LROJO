import { WebpayPlus, Environment } from 'transbank-sdk'

// Configuración de Transbank Webpay Plus
// En producción, cambiar a Environment.Production y usar las credenciales reales
const isProduction = process.env.TRANSBANK_ENVIRONMENT === 'production'

const commerceCode = isProduction
  ? process.env.TRANSBANK_COMMERCE_CODE!
  : '597055555532' // Código de pruebas

const apiKey = isProduction
  ? process.env.TRANSBANK_API_KEY!
  : '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C' // Key de pruebas

const environment = isProduction ? Environment.Production : Environment.Integration

// Crear instancia de WebpayPlus.Transaction
export function getWebpayTransaction() {
  const tx = new WebpayPlus.Transaction()
  tx.configureForIntegration(commerceCode, apiKey)
  if (isProduction) {
    tx.configureForProduction(commerceCode, apiKey)
  }
  return tx
}

export { WebpayPlus, Environment }
