import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ---------------------------------------------------------------------------
// INSTRUCCIONES:
// 1. Necesitas una Service Account Key para ejecutar esto desde tu máquina local con permisos totales.
// 2. Ve a Firebase Console -> Configuración del proyecto -> Cuentas de servicio.
// 3. Genera una nueva clave privada (archivo .json).
// 4. Guárdala en la carpeta 'functions' con el nombre 'service-account.json'.
// 5. AÑADE 'service-account.json' A TU .gitignore PARA NO SUBIRLA NUNCA.
// ---------------------------------------------------------------------------

const serviceAccount = require('../service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const args = process.argv.slice(2);
const uid = args[0];
const tenantId = args[1];

if (!uid || !tenantId) {
  console.error('\n❌ Error: Faltan argumentos.');
  console.error('Uso: bun scripts/assign-owner.ts <UID_USUARIO> <ID_PELUQUERIA>\n');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\n🔍 Buscando usuario ${uid}...`);
    const user = await getAuth().getUser(uid);
    console.log(`   Usuario encontrado: ${user.email}`);

    console.log(`\n⚙️  Asignando rol OWNER para la peluquería ${tenantId}...`);
    
    // Cuidado: Esto sobrescribe otros claims si los hubiera. 
    // Si quisieras preservar otros, primero tendrías que leer user.customClaims y hacer un merge.
    await getAuth().setCustomUserClaims(uid, {
      role: 'owner',
      tenantId: tenantId
    });

    // Verificación final
    const updatedUser = await getAuth().getUser(uid);
    console.log('✅ Claims actuales del usuario:', updatedUser.customClaims);
    console.log('\n🎉 ¡Listo! El usuario ya es el jefe.\n');
    
  } catch (error) {
    console.error('\n❌ Ha ocurrido un error:', error);
  }
}

main();
