import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { MoceanAdapter } from './infrastructure/mocean.adapter';
import { SendSmsCancelationUsecase } from './application/send-sms-cancelation.usecase';
import { Appointment } from './domain/appointment.entity';
import { Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

const moceanApiKey = defineSecret('MOCEAN_API_KEY');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

/* FUNCIONES AUXILIARES */
function normalizePhoneNumber(
  raw: string,
  defaultCountryCallingCode = '34',
): string | null {
  if (!raw) return null;

  let value = raw.trim();
  if (!value) return null;

  // Convert leading 00 to + (common international prefix)
  if (value.startsWith('00')) {
    value = '+' + value.slice(2);
  }

  // Keep leading + if present, strip everything else that's not a digit
  if (value.startsWith('+')) {
    const digits = value.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }

  // National / partially formatted input
  const nationalDigits = value.replace(/\D/g, '');
  if (!nationalDigits) return null;

  return `+${defaultCountryCallingCode}${nationalDigits}`;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * STRIPE: Crear cuenta conectada y link de onboarding
 * Se dispara manualmente desde el panel de Angular
 */

export const createConnectAccount = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    // 1. Validar auth
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { tenantId } = request.data;
    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'Falta el tenantId');
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2023-10-16' as any, // Ajusta a la versión que prefieras
    });

    try {
      // 2. Crear cuenta en Stripe
      const account = await stripe.accounts.create({
        type: 'standard',
      });

      // 3. Guardar en Firestore (Usando tu ruta 'hairdressers/')
      await admin
        .firestore()
        .collection('hairdressers')
        .doc(tenantId)
        .set(
          {
            payments: {
              stripeAccountId: account.id,
              stripeStatus: 'pending',
            },
          },
          { merge: true },
        );

      // 4. Crear link de onboarding
      // Nota: Cambia estas URLs por las de tu dominio real o configúralas dinámicamente
      const origin =
        request.rawRequest.headers.origin || 'http://localhost:4200';
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${origin}/admin?tab=payments&status=retry`,
        return_url: `${origin}/admin?tab=payments&status=success`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url };
    } catch (error: any) {
      console.error('❌ Error Stripe Connect:', error);
      throw new HttpsError('internal', error.message);
    }
  },
);

export const checkStripeAccountStatus = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { tenantId } = request.data;
    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'Falta el tenantId');
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2023-10-16' as any,
    });

    try {
      const docRef = admin.firestore().collection('hairdressers').doc(tenantId);
      const docSnap = await docRef.get();
      const data = docSnap.data();

      const accountId = data?.payments?.stripeAccountId;
      if (!accountId) {
        return { status: 'not_created' };
      }

      const account = await stripe.accounts.retrieve(accountId);

      const isEnabled = account.charges_enabled && account.details_submitted;
      const newStatus = isEnabled ? 'active' : 'pending'; // or 'restricted'

      // Update Firestore if changed
      if (data?.payments?.stripeStatus !== newStatus) {
        await docRef.set(
          {
            payments: {
              stripeStatus: newStatus,
            },
          },
          { merge: true },
        );
      }

      return {
        status: newStatus,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
      };
    } catch (error: any) {
      console.error('❌ Error checking Stripe status:', error);
      throw new HttpsError('internal', error.message);
    }
  },
);

export const createPaymentIntent = onCall(
  {
    region: 'europe-west1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    // 1. Validar auth (Opcional, pero recomendado)
    // if (!request.auth) {
    //   throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    // }

    const { serviceId, tenantId, hairLength } = request.data;
    if (!serviceId || !tenantId) {
      throw new HttpsError(
        'invalid-argument',
        'Faltan parámetros: serviceId o tenantId.',
      );
    }

    // Inicializar Stripe con el secreto de v2
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2023-10-16' as any,
    });

    try {
      // 2. Obtener info del local y del servicio (Seguridad: precio desde DB)
      const tenantDoc = await admin
        .firestore()
        .doc(`hairdressers/${tenantId}`)
        .get();
      const serviceDoc = await admin
        .firestore()
        .doc(`hairdressers/${tenantId}/services/${serviceId}`)
        .get();

      if (!tenantDoc.exists || !serviceDoc.exists) {
        throw new HttpsError('not-found', 'Local o servicio no encontrado.');
      }

      const tenantData = tenantDoc.data();
      const serviceData = serviceDoc.data();
      const stripeAccountId = tenantData?.payments?.stripeAccountId;

      if (!stripeAccountId || tenantData?.payments?.stripeStatus !== 'active') {
        throw new HttpsError(
          'failed-precondition',
          'El local no tiene los pagos activos.',
        );
      }

      // 3. CÁLCULO DEL IMPORTE
      let fullPrice = serviceData?.basePrice || serviceData?.price || 0;

      // Si el servicio requiere longitud de pelo y se ha proporcionado
      if (
        serviceData?.requiresHairLength &&
        hairLength &&
        serviceData?.hairLengthModifiers
      ) {
        const modifier = serviceData.hairLengthModifiers[hairLength];
        if (modifier && modifier.price) {
          fullPrice = modifier.price;
        }
      }

      const policy = tenantData?.payments?.prePaymentPolicy || 'none';
      const policyValue = tenantData?.payments?.prePaymentValue || 0;

      let amountToCharge = 0;

      if (policy === 'full') {
        amountToCharge = fullPrice;
      } else if (policy === 'fixed') {
        amountToCharge = policyValue;
      } else if (policy === 'percentage') {
        amountToCharge = (fullPrice * policyValue) / 100;
      }

      // Stripe trabaja en céntimos (ej: 10€ = 1000)
      const finalAmount = Math.round(amountToCharge * 100);

      if (finalAmount < 50) {
        throw new HttpsError(
          'out-of-range',
          'El importe debe ser al menos de 0.50€.',
        );
      }

      // 4. CREAR EL INTENTO DE PAGO (Direct Charge a la cuenta conectada)
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: finalAmount,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          // Aquí puedes cobrar una comisión por reserva (ej: 1€ fijo = 100 céntimos)
          application_fee_amount: 100,
        },
        {
          stripeAccount: stripeAccountId,
        },
      );

      return {
        clientSecret: paymentIntent.client_secret,
        amount: amountToCharge,
        stripeAccountId,
      };
    } catch (error: any) {
      console.error('❌ Error en createPaymentIntent:', error);
      throw new HttpsError('internal', error.message);
    }
  },
);

/**
 * Cloud Function starts when an appointment is created
 * Firestore Route: tenants/{tenantId}/citas/{citaId}
 */
export const sendSmsCancelation = onDocumentCreated(
  {
    document: 'hairdressers/{tenantId}/appointments/{citaId}',
    region: 'europe-west1',
    secrets: [moceanApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.warn('⚠️ No hay datos en el snapshot');
      return;
    }

    const appointment = snapshot.data() as Appointment;
    const appointmentId = event.params.citaId;
    const tenantId = event.params.tenantId;

    // 0. Tenant feature flag (NO Angular DI in Cloud Functions)
    const tenantDoc = await admin
      .firestore()
      .collection('hairdressers')
      .doc(tenantId)
      .get();

    const tenantData = tenantDoc.data();
    const enableSms = tenantData?.features?.enableSms === true;
    if (!enableSms) {
      return;
    }

    const apiToken = moceanApiKey.value();
    if (!apiToken) {
      console.error('❌ Falta el secreto MOCEAN_API_KEY (Secret Manager).');
      return;
    }

    // 1. Validate required fields
    const phoneNumber = normalizePhoneNumber(appointment.phone ?? '');
    if (!phoneNumber) {
      return;
    }

    if (!appointment.datetime) {
      return;
    }

    // Format date for SMS
    const datetime =
      appointment.datetime instanceof Timestamp
        ? appointment.datetime.toDate()
        : typeof appointment.datetime === 'string'
          ? new Date(appointment.datetime)
          : appointment.datetime;

    const formatedDate = datetime.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const localName = tenantData?.business?.name || tenantId;

    // Sender por tenant (multi-tenant). Si no está, usamos el nombre del negocio.
    const tenantFromName =
      tenantData?.sms?.fromName || tenantData?.business?.name || 'Peluqueria';

    // Expiration time for cancellation link
    const expirationTime = datetime.getTime() - 24 * 60 * 60 * 1000; // 24 hours before appointment

    // Generate cancellation token
    const tokenData = {
      t: tenantId,
      a: appointmentId,
      e: expirationTime,
    };

    const cancelationToken = Buffer.from(JSON.stringify(tokenData)).toString(
      'base64url',
    );

    // Generate cancellation link
    const configuredDomain = tenantData?.domain;
    const baseUrl = normalizeBaseUrl(
      configuredDomain || 'http://localhost:4200',
    );
    const cancelationLink = `${baseUrl}/cancelar/${cancelationToken}`;

    // 2. Send SMS via use case
    try {
      const smsAdapter = new MoceanAdapter(apiToken, tenantFromName);
      const sendSmsUsecase = new SendSmsCancelationUsecase(smsAdapter);

      await sendSmsUsecase.execute(
        phoneNumber,
        formatedDate,
        localName,
        cancelationLink,
      );
      console.log(`✅ SMS enviado a ${phoneNumber}`);
    } catch (error) {
      console.error('❌ Error enviando SMS:', error);
    }
  },
);
