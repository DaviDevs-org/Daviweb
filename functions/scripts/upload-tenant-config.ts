import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SAAS_CONFIG } from '../../src/app/config/saas.config';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// INSTRUCCIONES:
// 1. Asegúrate de tener 'service-account.json' en la carpeta 'functions'.
// 2. Ejecuta: bun scripts/upload-tenant-config.ts <TENANT_ID> [PATH_TO_JSON]
// ---------------------------------------------------------------------------

const serviceAccount = require('../service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const args = process.argv.slice(2);
const tenantId = args[0];
const jsonPath = args[1];

if (!tenantId) {
  console.error('\n❌ Error: Falta el ID del tenant.');
  console.error('Uso: bun scripts/upload-tenant-config.ts <TENANT_ID> [PATH_TO_JSON]\n');
  process.exit(1);
}

// Función auxiliar para merge profundo simple
function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

async function main() {
  try {
    console.log(`\n⚙️  Preparando configuración para el tenant: ${tenantId}...`);

    // 1. Clonar la configuración por defecto (TEMPLATE)
    let config = JSON.parse(JSON.stringify(SAAS_CONFIG));

    // 2. Si hay JSON, leerlo y mezclarlo
    if (jsonPath) {
      const absolutePath = path.resolve(process.cwd(), jsonPath);
      if (fs.existsSync(absolutePath)) {
        console.log(`📄 Leyendo configuración personalizada desde: ${jsonPath}`);
        const customConfig = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
        
        // Merge profundo para no machacar objetos enteros (ej: si solo cambias un color)
        config = deepMerge(config, customConfig);
      } else {
        console.warn(`⚠️  AVISO: No se encontró el archivo ${jsonPath}. Usando configuración por defecto.`);
      }
    } else {
      console.log('ℹ️  No se especificó archivo JSON. Usando configuración por defecto (SAAS_CONFIG).');
    }

    // 3. Sobrescribir el ID (siempre manda el argumento)
    config.id = tenantId;

    // 4. Limpiar rutas de base de datos
    // No las guardamos en BD porque se generan dinámicamente en el cliente (Convention over Configuration)
    delete config.database;

    console.log(`📤 Subiendo configuración a Firestore...`);
    console.log(`   Ruta: hairdressers/${tenantId}`);
    // console.log('   Datos:', JSON.stringify(config, null, 2)); // Descomentar para debug

    // 5. Guardar en Firestore
    await db.collection('hairdressers').doc(tenantId).set(config, { merge: true });

    console.log('\n✅ ¡Configuración subida con éxito!');
    console.log(`   Tenant: ${tenantId}`);
    if (jsonPath) console.log(`   Fuente: ${jsonPath} + SAAS_CONFIG`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Ha ocurrido un error:', error);
    process.exit(1);
  }
}

main();
