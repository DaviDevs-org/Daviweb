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
      const origin = request.rawRequest.headers.origin || 'http://localhost:4200';
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
               stripeStatus: newStatus
            }
          },
          { merge: true }
        );
      }

      return { status: newStatus, details_submitted: account.details_submitted, charges_enabled: account.charges_enabled };

    } catch (error: any) {
      console.error('❌ Error checking Stripe status:', error);
      throw new HttpsError('internal', error.message);
    }
  }
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
